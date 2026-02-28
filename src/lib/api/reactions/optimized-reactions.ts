import { supabase } from "@/integrations/supabase/client";
import { ReactionType } from "@/types/database/social.types";
import { normalizeReactionType } from "@/components/post/reactions/ReactionIcons";

interface ReactionResult {
  success: boolean;
  action?: 'added' | 'removed' | 'changed';
  reaction_type?: ReactionType | null;
  error?: string;
}

export async function toggleReactionOptimized(
  postId?: string,
  commentId?: string,
  reactionType: ReactionType = 'love'
): Promise<ReactionResult> {
  try {
    if (commentId) {
      return await toggleCommentReactionDirect(commentId, reactionType);
    }
    
    const { data, error } = await (supabase as any).rpc('add_reaction_optimized', {
      p_post_id: postId || null,
      p_comment_id: commentId || null,
      p_reaction_type: reactionType
    });

    if (error) {
      console.error('Error calling add_reaction_optimized:', error);
      return { success: false, error: error.message };
    }

    if (data && typeof data === 'object' && 'success' in data) {
      return data as unknown as ReactionResult;
    }

    return { success: false, error: 'Respuesta inesperada del servidor' };
  } catch (error: any) {
    console.error('Error in toggleReactionOptimized:', error);
    return { success: false, error: error.message };
  }
}

async function toggleCommentReactionDirect(
  commentId: string,
  reactionType: ReactionType
): Promise<ReactionResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    const { data: existingReaction } = await (supabase as any)
      .from('comment_reactions')
      .select('id, reaction_type, comment_id, user_id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single();

    const existing = existingReaction as any;

    if (existing) {
      if (existing.reaction_type === reactionType) {
        const { error } = await (supabase as any)
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true, action: 'removed', reaction_type: null };
      } else {
        const { error } = await (supabase as any)
          .from('comment_reactions')
          .update({ reaction_type: reactionType })
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true, action: 'changed', reaction_type: reactionType };
      }
    } else {
      const { error } = await (supabase as any)
        .from('comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: reactionType
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, action: 'added', reaction_type: reactionType };
    }
  } catch (error: any) {
    console.error('Error in toggleCommentReactionDirect:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserPostReaction(postId: string): Promise<ReactionType | null> {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(String(postId || ''))) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await (supabase as any)
      .from('reactions')
      .select('reaction_type')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user post reaction:', error);
      return null;
    }

    const raw = (data as any)?.reaction_type;
    if (!raw) return null;
    return normalizeReactionType(String(raw)) as ReactionType;
  } catch (error) {
    console.error('Error in getUserPostReaction:', error);
    return null;
  }
}

export async function getUserCommentReaction(commentId: string): Promise<ReactionType | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await (supabase as any)
      .from('reactions')
      .select('reaction_type')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user comment reaction:', error);
      return null;
    }

    const raw = (data as any)?.reaction_type;
    if (!raw) return null;
    return normalizeReactionType(String(raw)) as ReactionType;
  } catch (error) {
    console.error('Error in getUserCommentReaction:', error);
    return null;
  }
}
