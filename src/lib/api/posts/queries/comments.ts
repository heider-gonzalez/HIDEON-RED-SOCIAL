
import { supabase } from "@/integrations/supabase/client";

export async function fetchPostComments(postId: string) {
  try {
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

      return previewComments.map((comment: any) => ({
        ...comment,
        reactions: [],
        user_reaction: null,
      }));
    }

    const { data: auth } = await supabase.auth.getUser();
    const currentUserId = (auth as any)?.user?.id || null;

    // Fetch comments without reactions embed to avoid ambiguity
    let { data: comments, error } = await (supabase as any)
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
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    if (!comments || comments.length === 0) {
      return [];
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

    return commentsWithReactions;
  } catch (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
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
