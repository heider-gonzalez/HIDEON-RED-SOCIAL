
import { supabase } from "@/integrations/supabase/client";

type CommentsCursor = {
  createdAt: string;
  id: string;
};

export async function fetchPostCommentsPage(
  postId: string,
  options?: {
    limit?: number;
    cursor?: CommentsCursor | null;
  }
) {
  try {
    const limit = options?.limit ?? 20;
    const { data: sessionData } = await supabase.auth.getSession();
    const hasSession = !!sessionData.session;

    // Guest mode: use RPC to avoid RLS issues with profiles/comments
    if (!hasSession) {
      const { data: previewCommentsRaw, error: previewError } = await (supabase as any).rpc(
        "get_public_post_comments_preview",
        {
          p_post_id: postId,
          limit_count: 2,
        }
      );

      if (previewError) {
        throw previewError;
      }

      const previewComments = (previewCommentsRaw || []) as any[];

      const items = previewComments.map((comment: any) => ({
        ...comment,
        reactions: [],
        user_reaction: null,
      }));

      return {
        comments: items,
        nextCursor: null as CommentsCursor | null,
      };
    }

    const { data: auth } = await supabase.auth.getUser();
    const currentUserId = (auth as any)?.user?.id || null;

    // Fetch comments without reactions embed to avoid ambiguity
    let query = (supabase as any)
      .from("comments")
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url,
          id
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit);

    const cursor = options?.cursor ?? null;
    if (cursor?.createdAt && cursor?.id) {
      // (created_at > cursor.createdAt) OR (created_at = cursor.createdAt AND id > cursor.id)
      query = query.or(
        `created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`
      );
    }

    const { data: comments, error } = await query;

    if (error) {
      throw error;
    }

    if (!comments || comments.length === 0) {
      return {
        comments: [],
        nextCursor: null as CommentsCursor | null,
      };
    }

    // Get comment IDs
    const commentIds = comments.map(c => c.id);

    // Fetch reactions for all comments separately
    const { data: reactions } = await (supabase as any)
      .from("reactions")
      .select("id, comment_id, reaction_type, user_id")
      .in("comment_id", commentIds);

    // Group reactions by comment_id
    const reactionsByComment: Record<string, any[]> = {};
    if (reactions) {
      reactions.forEach(reaction => {
        if (!reactionsByComment[reaction.comment_id]) {
          reactionsByComment[reaction.comment_id] = [];
        }
        reactionsByComment[reaction.comment_id].push(reaction);
      });
    }

    // Attach reactions + computed fields to comments
    const commentsWithReactions = (comments as any[]).map((comment: any) => {
      const commentReactions = reactionsByComment[comment.id] || [];
      const userReaction = currentUserId
        ? (commentReactions.find((r: any) => r.user_id === currentUserId)?.reaction_type ?? null)
        : null;

      return {
        ...comment,
        reactions: commentReactions,
        likes_count: commentReactions.length,
        user_reaction: userReaction,
      };
    });

    const last = commentsWithReactions[commentsWithReactions.length - 1];
    const nextCursor: CommentsCursor | null = last?.created_at && last?.id
      ? { createdAt: String(last.created_at), id: String(last.id) }
      : null;

    // If we returned fewer than limit, there's no more
    const effectiveNextCursor = commentsWithReactions.length < limit ? null : nextCursor;

    return {
      comments: commentsWithReactions,
      nextCursor: effectiveNextCursor,
    };
  } catch (error) {
    console.error("Error fetching comments:", error);
    return {
      comments: [],
      nextCursor: null as CommentsCursor | null,
    };
  }
}

export async function fetchPostComments(postId: string) {
  const { comments } = await fetchPostCommentsPage(postId, { limit: 50, cursor: null });
  return comments;
}

export async function createComment(postId: string, content: string, parentId?: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await (supabase as any)
      .from("comments")
      .insert({
        content,
        user_id: user.id,
        post_id: postId,
        parent_id: parentId || null
      })
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error creating comment:", error);
    return { success: false, error };
  }
}
