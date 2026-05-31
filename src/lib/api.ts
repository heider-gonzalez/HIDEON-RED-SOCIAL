
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getMultiplePostSharesCounts } from "@/lib/api/posts/queries/shares";
import { getMultiplePostViewsCounts } from "@/lib/api/posts/queries/views";
import { checkColumnExists } from "@/lib/api/posts/retrieve/utils/column-check";
import { getMediaType, uploadMediaFile } from "@/lib/api/posts/storage";
import { getAuthUser, requireAuthUser } from "@/lib/auth/auth-store";
import { checkColumnExistsWithCache } from "@/lib/api/posts/retrieve/utils/column-cache";

let cachedHasSharedFields: boolean | null = null;
async function getHasSharedFields(): Promise<boolean> {
  if (cachedHasSharedFields != null) return cachedHasSharedFields;
  try {
    const hasSharedPostId = await checkColumnExistsWithCache('posts', 'shared_post_id', () => checkColumnExists('posts', 'shared_post_id'));
    const hasSharedFrom = await checkColumnExistsWithCache('posts', 'shared_from', () => checkColumnExists('posts', 'shared_from'));
    cachedHasSharedFields = hasSharedPostId || hasSharedFrom;
  } catch {
    // Assume modern schema to avoid blocking the feed
    cachedHasSharedFields = true;
  }
  return cachedHasSharedFields;
}

async function enrichPosts(
  data: any[],
  hasSharedFields: boolean,
  groupById: Record<string, { id: string; name: string; slug: string; avatar_url: string | null }>,
  companyById: Record<string, { id: string; name: string; slug: string; logo_url: string | null }>
) {
  // Obtener el usuario actual para verificar si le ha dado like
  const user = getAuthUser();

  let pollVotesMap: Record<string, string> = {};
  try {
    if (user) {
      const pollPostIds = (data || [])
        .filter((p: any) => p?.poll)
        .map((p: any) => p.id)
        .filter(Boolean);

      if (pollPostIds.length > 0) {
        const { data: votesData } = await (supabase as any)
          .from('poll_votes')
          .select('post_id, option_id')
          .eq('user_id', user.id)
          .in('post_id', pollPostIds);

        (votesData || []).forEach((v: any) => {
          if (v?.post_id && v?.option_id) {
            pollVotesMap[String(v.post_id)] = String(v.option_id);
          }
        });
      }
    }
  } catch (e) {
    console.warn('Failed to fetch poll votes:', e);
    pollVotesMap = {};
  }

  const postIds = (data || []).map((p: any) => p?.id).filter(Boolean) as string[];

  const uniquePostIds = Array.from(
    new Set(
      (data || [])
        .flatMap((p: any) => [p.id, p.shared_post_id])
        .filter(Boolean)
    )
  ) as string[];

  // Parallelize all enrichment queries for better performance
  const [sharesCountsByPostId, viewsCountsByPostId, reactionsByPostId, sharedPostById, userReactionByPostId] = await Promise.all([
    uniquePostIds.length ? getMultiplePostSharesCounts(uniquePostIds).catch(e => {
      console.warn('Failed to fetch shares counts:', e);
      return {};
    }) : Promise.resolve({}),
    uniquePostIds.length ? getMultiplePostViewsCounts(uniquePostIds).catch(e => {
      console.warn('Failed to fetch views counts:', e);
      return {};
    }) : Promise.resolve({}),
    fetchReactionsByPostId(postIds).catch(e => {
      console.warn('Failed to fetch reactions:', e);
      return {};
    }),
    fetchSharedPosts(hasSharedFields, data).catch(e => {
      console.warn('Failed to fetch shared posts:', e);
      return {};
    }),
    user ? fetchUserReactions(user.id, postIds).catch(e => {
      console.warn('Failed to fetch user reactions:', e);
      return {};
    }) : Promise.resolve({})
  ]);

  const postsWithUserReactions = await Promise.all((data || []).map(async (post: any) => {
    const postWithExtras = { ...post };

    if (post?.group_id && groupById[String(post.group_id)]) {
      postWithExtras.group = groupById[String(post.group_id)];
    } else {
      postWithExtras.group = null;
    }

    if (post?.company_id && companyById[String(post.company_id)]) {
      postWithExtras.company = companyById[String(post.company_id)];
    } else {
      postWithExtras.company = null;
    }

    // Poll votes
    if (postWithExtras?.poll && pollVotesMap[String(postWithExtras.id)]) {
      try {
        postWithExtras.poll = {
          ...(postWithExtras.poll || {}),
          userVote: pollVotesMap[String(postWithExtras.id)],
        };
      } catch (e) {
        console.warn('Failed to add poll vote:', e);
      }
    }

    const pid = String(postWithExtras.id);
    postWithExtras.shares_count = sharesCountsByPostId[pid] || 0;
    postWithExtras.views_count = viewsCountsByPostId[pid] || 0;
    postWithExtras.reactions_by_type = reactionsByPostId[pid]?.by_type || {};
    postWithExtras.reactions_count = reactionsByPostId[pid]?.count || 0;
    postWithExtras.reactions = {
      count: reactionsByPostId[pid]?.count || 0,
      by_type: reactionsByPostId[pid]?.by_type || {},
    };
    postWithExtras.user_reaction = userReactionByPostId[pid] || null;

    if (hasSharedFields && postWithExtras?.shared_post_id) {
      const sp = sharedPostById[String(postWithExtras.shared_post_id)];
      if (sp) {
        postWithExtras.shared_post = sp;
      }
    }

    // Comments count from joined relation
    postWithExtras.comments_count =
      (postWithExtras.comments && Array.isArray(postWithExtras.comments) && postWithExtras.comments[0]?.count) ||
      postWithExtras.comments_count ||
      0;

    return postWithExtras;
  }));

  return postsWithUserReactions;
}

// Helper function to fetch reactions for multiple posts
async function fetchReactionsByPostId(postIds: string[]): Promise<Record<string, { count: number; by_type: Record<string, number> }>> {
  if (postIds.length === 0) return {};
  
  const { data: reactionsRows, error: reactionsError } = await supabase
    .from("reactions")
    .select("post_id, reaction_type")
    .in("post_id", postIds);

  if (reactionsError) throw reactionsError;

  const reactionsByPostId: Record<string, { count: number; by_type: Record<string, number> }> = {};
  (reactionsRows || []).forEach((r: any) => {
    const pid = String(r.post_id);
    const type = String(r.reaction_type || '');
    if (!pid || !type) return;

    if (!reactionsByPostId[pid]) {
      reactionsByPostId[pid] = { count: 0, by_type: {} };
    }

    reactionsByPostId[pid].count += 1;
    reactionsByPostId[pid].by_type[type] = (reactionsByPostId[pid].by_type[type] || 0) + 1;
  });

  return reactionsByPostId;
}

// Helper function to fetch shared posts
async function fetchSharedPosts(hasSharedFields: boolean, data: any[]): Promise<Record<string, any>> {
  if (!hasSharedFields) return {};
  
  const sharedIds = Array.from(
    new Set((data || []).map((p: any) => p?.shared_post_id).filter(Boolean))
  ) as string[];

  if (sharedIds.length === 0) return {};

  const { data: sharedPosts, error: sharedPostsError } = await (supabase as any)
    .from('posts')
    .select(`
      *,
      profiles:profiles(*),
      comments:comments(count),
      media_urls
    `)
    .in('id', sharedIds);

  if (sharedPostsError) throw sharedPostsError;

  const sharedPostById: Record<string, any> = {};
  (sharedPosts || []).forEach((sp: any) => {
    if (!sp?.id) return;
    sharedPostById[String(sp.id)] = sp;
  });

  return sharedPostById;
}

// Helper function to fetch user reactions
async function fetchUserReactions(userId: string, postIds: string[]): Promise<Record<string, string>> {
  if (postIds.length === 0) return {};
  
  const { data: userReactions, error: userReactionsError } = await supabase
    .from("reactions")
    .select("post_id, reaction_type")
    .eq("user_id", userId)
    .in("post_id", postIds);

  if (userReactionsError) throw userReactionsError;

  const userReactionByPostId: Record<string, string> = {};
  (userReactions || []).forEach((r: any) => {
    if (r?.post_id && r?.reaction_type) {
      userReactionByPostId[String(r.post_id)] = String(r.reaction_type);
    }
  });

  return userReactionByPostId;
}

export async function getPosts(userId?: string, groupId?: string, companyId?: string) {
  try {
    const hasSharedFields = await getHasSharedFields();

    const [hasAudioUrl, hasAudioMetadata] = await Promise.all([
      checkColumnExistsWithCache('posts', 'audio_url', () => checkColumnExists('posts', 'audio_url')),
      checkColumnExistsWithCache('posts', 'audio_metadata', () => checkColumnExists('posts', 'audio_metadata')),
    ]);

    const selectFields: string[] = [
      'id',
      'content',
      'created_at',
      'updated_at',
      'user_id',
      'media_url',
      'media_type',
      hasAudioUrl ? 'audio_url' : '',
      hasAudioMetadata ? 'audio_metadata' : '',
      'visibility',
      'is_pinned',
      'shared_post_id',
      'shared_from',
      'profiles:profiles(id, username, avatar_url, career)',
      'comments:comments(count)',
    ].filter(Boolean);

    let query: any = supabase
      .from("posts")
      .select(selectFields.join(','));

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (groupId) {
      query = query.eq("group_id", groupId);
    }

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false });

    if (error) throw error;

    const posts = data as any[];

    const groupIds = Array.from(
      new Set(posts.map((p: any) => p?.group_id).filter(Boolean))
    ) as string[];

    const companyIds = Array.from(
      new Set(posts.map((p: any) => p?.company_id).filter(Boolean))
    ) as string[];

    const groupById: Record<string, { id: string; name: string; slug: string; avatar_url: string | null }> = {};
    const companyById: Record<string, { id: string; name: string; slug: string; logo_url: string | null }> = {};
    try {
      if (groupIds.length > 0) {
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('id, name, slug, avatar_url')
          .in('id', groupIds);
        if (groupsError) throw groupsError;

        (groupsData || []).forEach((g: any) => {
          if (!g?.id) return;
          groupById[String(g.id)] = {
            id: String(g.id),
            name: String(g.name || ''),
            slug: String(g.slug || ''),
            avatar_url: g.avatar_url ?? null,
          };
        });
      }
    } catch (e) {
      // ignore group enrichment failures (feed should still work)
    }

    try {
      if (companyIds.length > 0) {
        const { data: companiesData, error: companiesError } = await (supabase as any)
          .from('companies')
          .select('id, name, slug, logo_url')
          .in('id', companyIds);
        if (companiesError) throw companiesError;

        (companiesData || []).forEach((c: any) => {
          if (!c?.id) return;
          companyById[String(c.id)] = {
            id: String(c.id),
            name: String(c.name || ''),
            slug: String(c.slug || ''),
            logo_url: c.logo_url ?? null,
          };
        });
      }
    } catch (e) {
      // ignore company enrichment failures
    }

    return await enrichPosts(posts, hasSharedFields, groupById, companyById);
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  }
}

export async function getPostsPage(params: {
  userId?: string;
  groupId?: string;
  companyId?: string;
  contentType?: 'regular' | 'idea' | 'project';
  limit?: number;
  cursor?: string | null;
}) {
  const { userId, groupId, companyId, contentType, limit = 20, cursor } = params;

  const hasSharedFields = await getHasSharedFields();

  const [
    hasGroupId,
    hasCompanyId,
    hasMediaUrls,
    hasPostType,
    hasProjectStatus,
    hasTechnologies,
    hasDemoUrl,
    hasIdea,
    hasPostMetadata,
    hasAudioUrl,
    hasAudioMetadata,
  ] = await Promise.all([
    checkColumnExistsWithCache('posts', 'group_id', () => checkColumnExists('posts', 'group_id')),
    checkColumnExistsWithCache('posts', 'company_id', () => checkColumnExists('posts', 'company_id')),
    checkColumnExistsWithCache('posts', 'media_urls', () => checkColumnExists('posts', 'media_urls')),
    checkColumnExistsWithCache('posts', 'post_type', () => checkColumnExists('posts', 'post_type')),
    checkColumnExistsWithCache('posts', 'project_status', () => checkColumnExists('posts', 'project_status')),
    checkColumnExistsWithCache('posts', 'technologies', () => checkColumnExists('posts', 'technologies')),
    checkColumnExistsWithCache('posts', 'demo_url', () => checkColumnExists('posts', 'demo_url')),
    checkColumnExistsWithCache('posts', 'idea', () => checkColumnExists('posts', 'idea')),
    checkColumnExistsWithCache('posts', 'post_metadata', () => checkColumnExists('posts', 'post_metadata')),
    checkColumnExistsWithCache('posts', 'audio_url', () => checkColumnExists('posts', 'audio_url')),
    checkColumnExistsWithCache('posts', 'audio_metadata', () => checkColumnExists('posts', 'audio_metadata')),
  ]);

  const selectFields: string[] = [
    'id',
    'content',
    'created_at',
    'updated_at',
    'user_id',
    hasGroupId ? 'group_id' : '',
    hasCompanyId ? 'company_id' : '',
    'media_url',
    hasMediaUrls ? 'media_urls' : '',
    'media_type',
    hasAudioUrl ? 'audio_url' : '',
    hasAudioMetadata ? 'audio_metadata' : '',
    hasPostType ? 'post_type' : '',
    hasProjectStatus ? 'project_status' : '',
    hasTechnologies ? 'technologies' : '',
    hasDemoUrl ? 'demo_url' : '',
    hasIdea ? 'idea' : '',
    hasPostMetadata ? 'post_metadata' : '',
    'visibility',
    'is_pinned',
    hasSharedFields ? 'shared_post_id' : '',
    hasSharedFields ? 'shared_from' : '',
    'profiles:profiles(id, username, avatar_url, career)',
    'comments:comments(count)',
  ].filter(Boolean);

  let query: any = supabase.from('posts').select(selectFields.join(','));

  if (userId) query = query.eq('user_id', userId);
  if (groupId) query = query.eq('group_id', groupId);
  if (companyId) query = query.eq('company_id', companyId);
  if (cursor) query = query.lt('created_at', cursor);

  if (contentType === 'regular') {
    if (hasPostType) {
      query = query.or('post_type.eq.regular,post_type.is.null');
    }
  }

  if (contentType === 'idea') {
    if (hasPostType) {
      query = query.eq('post_type', 'idea');
    }
    if (hasIdea) {
      query = query.not('idea', 'is', null);
    }
  }

  if (contentType === 'project') {
    if (hasPostType) {
      query = query.in('post_type', ['project', 'proyecto']);
    }
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const posts = (data || []) as any[];

  const groupIds = Array.from(new Set(posts.map((p: any) => p?.group_id).filter(Boolean))) as string[];
  const companyIds = Array.from(new Set(posts.map((p: any) => p?.company_id).filter(Boolean))) as string[];
  const groupById: Record<string, { id: string; name: string; slug: string; avatar_url: string | null }> = {};
  const companyById: Record<string, { id: string; name: string; slug: string; logo_url: string | null }> = {};

  try {
    if (groupIds.length > 0) {
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, slug, avatar_url')
        .in('id', groupIds);
      if (groupsError) throw groupsError;
      (groupsData || []).forEach((g: any) => {
        if (!g?.id) return;
        groupById[String(g.id)] = {
          id: String(g.id),
          name: String(g.name || ''),
          slug: String(g.slug || ''),
          avatar_url: g.avatar_url ?? null,
        };
      });
    }
  } catch (e) {
    // ignore
  }

  try {
    if (companyIds.length > 0) {
      const { data: companiesData, error: companiesError } = await (supabase as any)
        .from('companies')
        .select('id, name, slug, logo_url')
        .in('id', companyIds);
      if (companiesError) throw companiesError;
      (companiesData || []).forEach((c: any) => {
        if (!c?.id) return;
        companyById[String(c.id)] = {
          id: String(c.id),
          name: String(c.name || ''),
          slug: String(c.slug || ''),
          logo_url: c.logo_url ?? null,
        };
      });
    }
  } catch (e) {
    // ignore
  }

  const enriched = await enrichPosts(posts, hasSharedFields, groupById, companyById);
  const nextCursor = enriched.length > 0 ? String(enriched[enriched.length - 1]?.created_at) : null;

  return {
    posts: enriched,
    nextCursor: enriched.length === limit ? nextCursor : undefined,
  };
}

export async function getPublicFeedPreview(limit = 5) {
  const { data, error } = await (supabase as any)
    .rpc('get_public_feed_preview', {
      limit_count: limit,
    });
  if (error) throw error;

  const posts = (data || []) as Database['public']['Functions']['get_public_feed_preview']['Returns'];
  return {
    posts,
  };
}

export async function getHiddenPosts() {
  try {
    const user = getAuthUser();
    if (!user) return [];

    const { data, error } = await (supabase as any)
      .from("hidden_posts")
      .select("post_id")
      .eq("user_id", user.id);

    if (error) throw error;
    return (data as Array<{ post_id: string }>).map((item) => item.post_id);
  } catch (error) {
    console.error("Error fetching hidden posts:", error);
    return [];
  }
}

export async function hidePost(postId: string) {
  try {
    const user = requireAuthUser();

    const { error } = await (supabase as any)
      .from("hidden_posts")
      .insert({ user_id: user.id, post_id: postId } as any);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error hiding post:", error);
    throw error;
  }
}

export async function unhidePost(postId: string) {
  try {
    const user = requireAuthUser();

    const { error } = await supabase
      .from("hidden_posts")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error unhiding post:", error);
    throw error;
  }
}

export async function createPost({ 
  content, 
  file, 
  pollData,
  ideaData,
  visibility = "public" 
}: { 
  content: string; 
  file: File | null; 
  pollData?: { question: string; options: string[] };
  ideaData?: { title: string; description: string; participants: string[] };
  visibility?: "public" | "friends" | "private";
}) {
  try {
    const user = requireAuthUser();

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    // Upload file if present
    if (file) {
      mediaUrl = await uploadMediaFile(file);
      mediaType = getMediaType(file);
    }

    // Create poll object if poll data is present
    const pollObject = pollData ? {
      question: pollData.question,
      options: pollData.options.map((option, index) => ({
        id: index,
        text: option,
        votes: 0,
        percentage: 0
      }))
    } : null;

    // Create idea object if idea data is present
    const ideaObject = ideaData ? {
      title: ideaData.title,
      description: ideaData.description || content,
      participants: ideaData.participants || [],
    } : null;

    // Create the post data object
    const postData: any = {
      user_id: user.id,
      content,
      visibility,
      media_url: mediaUrl,
      media_type: mediaType
    };

    // Add poll and idea if present
    if (pollObject) {
      postData.poll = pollObject;
    }
    
    if (ideaObject) {
      postData.idea = ideaObject;
    }

    // Insert post
    const { data: newPost, error: postError } = await supabase
      .from("posts")
      .insert(postData)
      .select()
      .single();

    if (postError) {
      console.error('Post creation error:', postError);
      throw postError;
    }

    return newPost;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
}

export async function addReaction(postId: string, reactionType: string = 'love') {
  try {
    const user = requireAuthUser();

    // Check if reaction exists
    const { data: existingReaction, error: checkError } = await (supabase as any)
      .from("reactions")
      .select("id, reaction_type")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (checkError) throw checkError;

    // If user already reacted with the same type, remove it (toggle behavior)
    if (existingReaction && (existingReaction as any).reaction_type === reactionType) {
      const { error: deleteError } = await (supabase as any)
        .from("reactions")
        .delete()
        .eq("id", (existingReaction as any).id);

      if (deleteError) throw deleteError;
      return { success: true, action: "removed" };
    }
    
    // If user reacted with a different type, update the reaction type
    else if (existingReaction) {
      const { error: updateError } = await (supabase as any)
        .from("reactions")
        .update({ reaction_type: reactionType } as any)
        .eq("id", (existingReaction as any).id);

      if (updateError) throw updateError;
      return { success: true, action: "updated" };
    }

    // Add new reaction
    const { error: insertError } = await (supabase as any)
      .from("reactions")
      .insert({
        post_id: postId,
        user_id: user.id,
        reaction_type: reactionType
      } as any);

    if (insertError) throw insertError;
    return { success: true, action: "added" };
  } catch (error) {
    console.error("Error adding reaction:", error);
    throw error;
  }
}

export async function deletePost(postId: string) {
  try {
    const user = requireAuthUser();

    // Get post to check ownership
    const { data: post, error: fetchError } = await (supabase as any)
      .from("posts")
      .select("user_id, media_url")  // Use user_id instead of author_id
      .eq("id", postId)
      .single();

    if (fetchError) throw fetchError;

    // Verify ownership
    if (post && (post as any).user_id !== user.id) {
      // Use cached roles to avoid repeated RPC calls
      const { getCachedUserRoles } = await import("@/lib/auth/roles-cache");
      const cached = getCachedUserRoles(user.id);
      
      let isMod = false;
      let isAdmin = false;
      
      if (cached) {
        isMod = cached.isModerator;
        isAdmin = cached.isAdmin;
      } else {
        // Fallback to direct RPC if no cache available
        const [{ data: modData }, { data: adminData }] = await Promise.all([
          (supabase.rpc as any)("has_role", { _role: "moderator", _user_id: user.id }),
          (supabase.rpc as any)("has_role", { _role: "admin", _user_id: user.id }),
        ]);
        isMod = Boolean(modData);
        isAdmin = Boolean(adminData);
      }

      if (!isMod && !isAdmin) {
        throw new Error("You don't have permission to delete this post");
      }
    }

    // Delete post
    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) throw deleteError;

    // Delete associated media if exists
    if (post && (post as any).media_url) {
      // Extract file path from URL
      const url = new URL((post as any).media_url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(pathParts.indexOf('media') + 1).join('/');
      
      if (filePath) {
        await supabase
          .storage
          .from("media")
          .remove([filePath]);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
}

// Comment reactions API functions
export async function addCommentReaction(commentId: string, reactionType: string) {
  try {
    const user = requireAuthUser();

    // Check if user already reacted to this comment
    const { data: existingReaction } = await (supabase
      .from("comment_reactions") as any)
      .select("id, comment_id, user_id, reaction_type, created_at")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .single();

    if (existingReaction) {
      // Update existing reaction
      const { error } = await (supabase
        .from("comment_reactions") as any)
        .update({ reaction_type: reactionType })
        .eq("id", existingReaction.id);

      if (error) throw error;
    } else {
      // Add new reaction
      const { error } = await (supabase
        .from("comment_reactions") as any)
        .insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: reactionType
        });

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Error adding comment reaction:", error);
    throw error;
  }
}

export async function removeCommentReaction(commentId: string) {
  try {
    const user = requireAuthUser();

    const { error } = await (supabase
      .from("comment_reactions") as any)
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error removing comment reaction:", error);
    throw error;
  }
}
