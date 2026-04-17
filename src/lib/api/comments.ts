import { supabase } from "@/integrations/supabase/client";
import { Comment } from "@/types/post";
import { sendMentionNotifications } from "./posts/notifications";
import { getAuthSnapshot, requireAuthUser } from "@/lib/auth/auth-store";

export async function createComment(postId: string, content: string, parentId?: string, mediaUrl?: string, mediaType?: string) {
  const user = requireAuthUser();

  const { data: comment, error } = await (supabase as any)
    .from('comments')
    .insert({
      post_id: postId,
      content,
      parent_id: parentId,
      user_id: user.id,
      media_url: mediaUrl,
      media_type: mediaType
    } as any)
    .select('*, profiles(username, avatar_url)')
    .single();

  if (error) throw error;
  if (!comment) throw new Error('No se pudo crear el comentario');

  await sendMentionNotifications(content, postId, (comment as any).id, user.id);

  const { data: post } = await (supabase as any)
    .from('posts')
    .select('user_id')
    .eq('id', postId)
    .single();

  const { data: parentComment } = parentId ? await (supabase as any)
    .from('comments')
    .select('user_id')
    .eq('id', parentId)
    .single() : { data: null };

  if (post && (post as any).user_id !== user.id && !parentId) {
    await (supabase as any)
      .from('notifications')
      .insert({
        type: 'post_comment',
        sender_id: user.id,
        receiver_id: (post as any).user_id,
        post_id: postId,
        comment_id: (comment as any).id,
        message: 'Ha comentado en tu publicación'
      } as any);
  }

  if (parentComment && (parentComment as any).user_id !== user.id) {
    await (supabase as any)
      .from('notifications')
      .insert({
        type: 'comment_reply',
        sender_id: user.id,
        receiver_id: (parentComment as any).user_id,
        post_id: postId,
        comment_id: (comment as any).id,
        message: 'Ha respondido a tu comentario'
      } as any);
  }

  return comment;
}

export async function getComments(postId: string) {
  const { user: currentUser } = getAuthSnapshot();
  
  const { data: commentsData, error: commentsError } = await (supabase as any)
    .from('comments')
    .select(`
      *,
      profiles(id, username, avatar_url)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (commentsError) throw commentsError;
  
  let comments = (commentsData || []).map((comment: any) => {
    return {
      ...comment,
      profiles: comment.profiles ? {
        id: comment.profiles.id || comment.user_id,
        username: comment.profiles.username || "",
        avatar_url: comment.profiles.avatar_url || null
      } : {
        id: comment.user_id,
        username: "Usuario",
        avatar_url: null
      }
    };
  }) as Comment[];
  
  if (currentUser) {
    const commentIds = comments.map(comment => comment.id);
    
    if (commentIds.length > 0) {
      const { data: userReactions } = await (supabase as any)
        .from('reactions')
        .select('comment_id, reaction_type')
        .eq('user_id', currentUser.id)
        .in('comment_id', commentIds);
      
      const reactionsByCommentId = new Map();
      if (userReactions) {
        (userReactions as any[]).forEach((reaction: any) => {
          reactionsByCommentId.set(reaction.comment_id, reaction.reaction_type);
        });
      }
      
      const countByCommentId = new Map();
      
      const { data: allReactions } = await (supabase as any)
        .from('reactions')
        .select('comment_id')
        .in('comment_id', commentIds);
      
      if (allReactions) {
        const counts: Record<string, number> = {};
        (allReactions as any[]).forEach((reaction: any) => {
          const cid = String(reaction.comment_id || '');
          if (!cid) return;
          if (!counts[cid]) {
            counts[cid] = 0;
          }
          counts[cid]++;
        });
        
        Object.entries(counts).forEach(([commentId, count]) => {
          countByCommentId.set(commentId, count);
        });
      }
      
      comments = comments.map(comment => ({
        ...comment,
        user_reaction: reactionsByCommentId.get(comment.id) || null,
        likes_count: countByCommentId.get(comment.id) || 0
      }));
    }
  }

  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  comments.forEach(comment => {
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent && parent.replies) {
        parent.replies.push(commentMap.get(comment.id)!);
      }
    } else {
      rootComments.push(commentMap.get(comment.id)!);
    }
  });

  return rootComments;
}

export async function updateComment(commentId: string, content: string) {
  const user = requireAuthUser();

  const { data: comment, error } = await (supabase as any)
    .from('comments')
    .update({
      content,
      updated_at: new Date().toISOString()
    } as any)
    .eq('id', commentId)
    .eq('user_id', user.id) // Solo el autor puede editar
    .select('*, profiles(username, avatar_url)')
    .single();

  if (error) throw error;
  return comment;
}
