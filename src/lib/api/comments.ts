import { supabase } from "@/integrations/supabase/client";
import { Comment } from "@/types/post";
import { sendMentionNotifications } from "./posts/notifications";

export async function createComment(postId: string, content: string, parentId?: string, mediaUrl?: string, mediaType?: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) throw new Error("Usuario no autenticado");

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      content,
      parent_id: parentId,
      user_id: sessionData.session.user.id,
      media_url: mediaUrl,
      media_type: mediaType
    })
    .select('*, profiles(username, avatar_url)')
    .single();

  if (error) throw error;

  await sendMentionNotifications(content, postId, comment.id, sessionData.session.user.id);

  const { data: post } = await supabase
    .from('posts')
    .select('user_id')
    .eq('id', postId)
    .single();

  const { data: parentComment } = parentId ? await supabase
    .from('comments')
    .select('user_id')
    .eq('id', parentId)
    .single() : { data: null };

  if (post && post.user_id !== sessionData.session.user.id && !parentId) {
    await supabase
      .from('notifications')
      .insert({
        type: 'post_comment',
        sender_id: sessionData.session.user.id,
        receiver_id: post.user_id,
        post_id: postId,
        comment_id: comment.id,
        message: 'Ha comentado en tu publicación'
      });
  }

  if (parentComment && parentComment.user_id !== sessionData.session.user.id) {
    await supabase
      .from('notifications')
      .insert({
        type: 'comment_reply',
        sender_id: sessionData.session.user.id,
        receiver_id: parentComment.user_id,
        post_id: postId,
        comment_id: comment.id,
        message: 'Ha respondido a tu comentario'
      });
  }

  return comment;
}

export async function getComments(postId: string) {
  const { data } = await supabase.auth.getSession();
  const currentUser = data.session?.user;
  
  const { data: commentsData, error: commentsError } = await supabase
    .from('comments')
    .select(`
      *,
      profiles(id, username, avatar_url)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (commentsError) throw commentsError;
  
  let comments = (commentsData || []).map(comment => {
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
      const { data: userReactions } = await supabase
        .from('reactions')
        .select('comment_id, reaction_type')
        .eq('user_id', currentUser.id)
        .in('comment_id', commentIds);
      
      const reactionsByCommentId = new Map();
      if (userReactions) {
        userReactions.forEach(reaction => {
          reactionsByCommentId.set(reaction.comment_id, reaction.reaction_type);
        });
      }
      
      const countByCommentId = new Map();
      
      const { data: allReactions } = await supabase
        .from('reactions')
        .select('comment_id')
        .in('comment_id', commentIds);
      
      if (allReactions) {
        const counts: Record<string, number> = {};
        allReactions.forEach(reaction => {
          if (!counts[reaction.comment_id]) {
            counts[reaction.comment_id] = 0;
          }
          counts[reaction.comment_id]++;
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
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) throw new Error("Usuario no autenticado");

  const { data: comment, error } = await supabase
    .from('comments')
    .update({
      content,
      updated_at: new Date().toISOString()
    })
    .eq('id', commentId)
    .eq('user_id', sessionData.session.user.id) // Solo el autor puede editar
    .select('*, profiles(username, avatar_url)')
    .single();

  if (error) throw error;
  return comment;
}
