
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getMultiplePostSharesCounts } from "@/lib/api/posts/queries/shares";
import { checkColumnExists } from "@/lib/api/posts/retrieve/utils/column-check";

const debug = import.meta.env.DEV;

let cachedHasSharedFields: boolean | null = null;
async function getHasSharedFields(): Promise<boolean> {
  if (cachedHasSharedFields != null) return cachedHasSharedFields;
  try {
    const hasSharedPostId = await checkColumnExists('posts', 'shared_post_id');
    const hasSharedFrom = await checkColumnExists('posts', 'shared_from');
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
  const { data: { user } } = await supabase.auth.getUser();

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
    // ignore (e.g. poll_votes table not deployed yet)
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

  const sharesCountsByPostId = uniquePostIds.length
    ? await getMultiplePostSharesCounts(uniquePostIds)
    : {};

  // Fetch reactions breakdown for all posts in one query (count + by_type)
  const reactionsByPostId: Record<string, { count: number; by_type: Record<string, number> }> = {};
  try {
    if (postIds.length > 0) {
      const { data: reactionsRows, error: reactionsError } = await supabase
        .from("reactions")
        .select("post_id, reaction_type")
        .in("post_id", postIds);

      if (reactionsError) throw reactionsError;

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
    }
  } catch (e) {
    // ignore
  }

  // Fetch current user's reactions for all posts in one query
  const userReactionByPostId: Record<string, string> = {};
  try {
    if (user && postIds.length > 0) {
      const { data: userReactions, error: userReactionsError } = await supabase
        .from("reactions")
        .select("post_id, reaction_type")
        .eq("user_id", user.id)
        .in("post_id", postIds);

      if (userReactionsError) throw userReactionsError;

      (userReactions || []).forEach((r: any) => {
        if (r?.post_id && r?.reaction_type) {
          userReactionByPostId[String(r.post_id)] = String(r.reaction_type);
        }
      });
    }
  } catch (e) {
    // ignore
  }

  // Fetch comment reactions for all posts in one query
  const commentReactionsByCommentId: Record<string, { count: number; by_type: Record<string, number> }> = {};
  try {
    if (postIds.length > 0) {
      const { data: commentReactions, error: commentReactionsError } = await supabase
        .from("comment_reactions")
        .select("comment_id, reaction_type")
        .in("comment_id", postIds);

      if (commentReactionsError) throw commentReactionsError;

      (commentReactions || []).forEach((r: any) => {
        const commentId = String(r.comment_id);
        const type = String(r.reaction_type || '');
        if (!commentId || !type) return;

        if (!commentReactionsByCommentId[commentId]) {
          commentReactionsByCommentId[commentId] = { count: 0, by_type: {} };
        }

        commentReactionsByCommentId[commentId].count += 1;
        commentReactionsByCommentId[commentId].by_type[type] = (commentReactionsByCommentId[commentId].by_type[type] || 0) + 1;
      });
    }
  } catch (e) {
    // ignore
  }

  // Fetch current user's comment reactions for all posts in one query
  const userCommentReactionByCommentId: Record<string, string> = {};
  try {
    if (user && postIds.length > 0) {
      const { data: userCommentReactions, error: userCommentReactionsError } = await supabase
        .from("comment_reactions")
        .select("comment_id, reaction_type")
        .eq("user_id", user.id)
        .in("comment_id", postIds);

      if (userCommentReactionsError) throw userCommentReactionsError;

      (userCommentReactions || []).forEach((r: any) => {
        if (r?.comment_id && r?.reaction_type) {
          userCommentReactionByCommentId[String(r.comment_id)] = String(r.reaction_type);
        }
      });
    }
  } catch (e) {
    // ignore
  }

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

    // Para cada post, vemos si hay un post compartido referenciado
    if (hasSharedFields && 'shared_post_id' in post && post.shared_post_id) {
      try {
        const { data: sharedPostData, error: sharedPostError } = await supabase
          .from("posts")
          .select(`
              *,
              profiles:profiles(*),
              comments:comments(count)
            `)
          .eq("id", post.shared_post_id)
          .single();

        if (!sharedPostError && sharedPostData) {
          postWithExtras.shared_post = sharedPostData;
        }
      } catch (e) {
        // ignore
      }
    }

    // Poll votes
    if (postWithExtras?.poll && pollVotesMap[String(postWithExtras.id)]) {
      try {
        postWithExtras.poll = {
          ...(postWithExtras.poll || {}),
          userVote: pollVotesMap[String(postWithExtras.id)],
        };
      } catch (e) {
        // ignore
      }
    }

    const pid = String(postWithExtras.id);
    postWithExtras.shares_count = sharesCountsByPostId[pid] || 0;
    postWithExtras.reactions_by_type = reactionsByPostId[pid]?.by_type || {};
    postWithExtras.reactions_count = reactionsByPostId[pid]?.count || 0;
    postWithExtras.reactions = {
      count: reactionsByPostId[pid]?.count || 0,
      by_type: reactionsByPostId[pid]?.by_type || {},
    };
    postWithExtras.user_reaction = userReactionByPostId[pid] || null;

    // Comments count from joined relation
    postWithExtras.comments_count =
      (postWithExtras.comments && Array.isArray(postWithExtras.comments) && postWithExtras.comments[0]?.count) ||
      postWithExtras.comments_count ||
      0;

    // Enrich comments with reactions if they exist
    if (postWithExtras.comments && Array.isArray(postWithExtras.comments)) {
      postWithExtras.comments = enrichComments(postWithExtras.comments, commentReactionsByCommentId, userCommentReactionByCommentId);
    }

    return postWithExtras;
  }));

  return postsWithUserReactions;
}

// Function to enrich comments with reactions
async function enrichComments(
  comments: any[],
  commentReactionsByCommentId: Record<string, { count: number; by_type: Record<string, number> }>,
  userCommentReactionByCommentId: Record<string, string>
) {
  return comments.map(comment => {
    const commentId = String(comment.id);
    const enrichedComment = { ...comment };
    
    // Add reaction data
    enrichedComment.reactions_by_type = commentReactionsByCommentId[commentId]?.by_type || {};
    enrichedComment.likes_count = commentReactionsByCommentId[commentId]?.count || 0;
    enrichedComment.user_reaction = userCommentReactionByCommentId[commentId] || null;
    
    // Recursively enrich replies
    if (comment.replies && Array.isArray(comment.replies)) {
      enrichedComment.replies = enrichComments(comment.replies, commentReactionsByCommentId, userCommentReactionByCommentId);
    }
    
    return enrichedComment;
  });
}

export async function getPosts(userId?: string, groupId?: string, companyId?: string) {
  try {
    // Add a table query that includes the keys we need
    const { data: tableInfo } = await supabase
      .from('posts')
      .select('*')
      .limit(1);

    // Determine which fields exist in the posts table
    const hasSharedFields = tableInfo && tableInfo.length > 0 && 
      ('shared_post_id' in tableInfo[0] || 'shared_from' in tableInfo[0]);

    let query: any = supabase
      .from("posts")
      .select(`
        *,
        profiles:profiles(*),
        comments:comments(count)
      `);

    // Si hay un userId, solo obtener los posts de ese usuario
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
  limit?: number;
  cursor?: string | null;
}) {
  const { userId, groupId, companyId, limit = 20, cursor } = params;

  const hasSharedFields = await getHasSharedFields();

  let query: any = supabase
    .from('posts')
    .select(`
      *,
      profiles:profiles(id, username, avatar_url, career),
      comments:comments(count),
      media_urls
    `);

  if (userId) query = query.eq('user_id', userId);
  if (groupId) query = query.eq('group_id', groupId);
  if (companyId) query = query.eq('company_id', companyId);
  if (cursor) query = query.lt('created_at', cursor);

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
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("No user logged in");
    }

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    // Upload file if present
    if (file) {
      if (debug) console.log('Uploading file:', { name: file.name, size: file.size, type: file.type });
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: fileData, error: uploadError } = await supabase
        .storage
        .from("media")
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('File upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL for the uploaded file
      const { data: urlData } = await supabase
        .storage
        .from("media")
        .getPublicUrl(fileName);

      mediaUrl = urlData.publicUrl;
      
      // Map file type to database accepted values
      if (file.type.startsWith('image/')) {
        mediaType = 'image';
      } else if (file.type.startsWith('video/')) {
        mediaType = 'video';
      } else if (file.type.startsWith('audio/')) {
        mediaType = 'audio';
      } else {
        // Default to 'image' if type cannot be determined
        mediaType = 'image';
      }

      if (debug) console.log('File uploaded successfully:', { mediaUrl, mediaType });
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

    console.log("Creating post with data:", postData);
    
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

    if (debug) console.log('Post created successfully:', newPost);
    return newPost;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
}

export async function addReaction(postId: string, reactionType: string = 'love') {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    // Get post to check ownership
    const { data: post, error: fetchError } = await (supabase as any)
      .from("posts")
      .select("user_id, media_url")  // Use user_id instead of author_id
      .eq("id", postId)
      .single();

    if (fetchError) throw fetchError;

    // Verify ownership
    if (post && (post as any).user_id !== user.id) {
      throw new Error("You don't have permission to delete this post");
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    // Check if user already reacted to this comment
    const { data: existingReaction } = await supabase
      .from("comment_reactions")
      .select("*")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .single();

    if (existingReaction) {
      // Update existing reaction
      const { error } = await supabase
        .from("comment_reactions")
        .update({ reaction_type: reactionType })
        .eq("id", existingReaction.id);

      if (error) throw error;
    } else {
      // Add new reaction
      const { error } = await supabase
        .from("comment_reactions")
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    const { error } = await supabase
      .from("comment_reactions")
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
