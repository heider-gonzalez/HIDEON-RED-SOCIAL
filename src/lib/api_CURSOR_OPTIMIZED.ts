// 🚀 API CURSOR-OPTIMIZED - REEMPLAZO COMPLETO DE SELECT * Y OFFSET
// Todas las consultas ahora usan cursor basado en created_at
// Integración con índices idx_* de Supabase

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

const debug = import.meta.env.DEV;

// ========================================
// TIPOS OPTIMIZADOS
// ========================================

interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

interface PostOptimized {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  media_url: string | null;
  media_type: string | null;
  visibility: 'public' | 'friends' | 'private';
  is_pinned: boolean;
  shared_post_id: string | null;
  shared_from: string | null;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    career: string | null;
  };
  comments: Array<{ count: number }>;
  reactions: Array<{
    id: string;
    reaction_type: string;
    user_id: string;
  }>;
}

interface MessageOptimized {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  media_url?: string | null;
  media_type?: string | null;
  sender_profile: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  receiver_profile: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface NotificationOptimized {
  id: string;
  receiver_id: string;
  sender_id: string | null;
  post_id: string | null;
  comment_id: string | null;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  sender_profile?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  post?: {
    id: string;
    content: string;
  };
  comment?: {
    id: string;
    content: string;
  };
}

// ========================================
// FEED PRINCIPAL - CURSOR BASED (SIN OFFSET)
// ========================================

export async function getPostsCursor(params: {
  userId?: string;
  groupId?: string;
  companyId?: string;
  limit?: number;
  cursor?: string | null; // created_at como timestamp
  visibility?: 'public' | 'friends' | 'all';
  includePinned?: boolean;
}): Promise<CursorPaginatedResponse<PostOptimized>> {
  const { 
    userId, 
    groupId, 
    companyId, 
    limit = 20, 
    cursor, 
    visibility = 'public',
    includePinned = true 
  } = params;

  try {
    let query = supabase
      .from('posts')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id,
        media_url,
        media_type,
        visibility,
        is_pinned,
        shared_post_id,
        shared_from,
        profiles:profiles(id, username, avatar_url, career),
        comments:comments(count),
        reactions:reactions(id, reaction_type, user_id)
      `);

    // Filtros usando índices
    if (userId) {
      query = query.eq('user_id', userId); // Usa idx_posts_user_id_created_at
    }

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (visibility !== 'all') {
      query = query.eq('visibility', visibility); // Usa idx_posts_visibility_created_at
    }

    // Paginación cursor-based usando created_at (índice principal)
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    // Orden optimizado usando índices compuestos
    if (includePinned) {
      query = query
        .order('is_pinned', { ascending: false }) // Posts fijos primero
        .order('created_at', { ascending: false }); // Luego por fecha
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query.limit(limit + 1); // +1 para verificar si hay más

    if (error) throw error;

    const posts = (data || []) as PostOptimized[];
    const hasMore = posts.length > limit;
    const actualPosts = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = actualPosts.length > 0 ? actualPosts[actualPosts.length - 1].created_at : null;

    return {
      data: actualPosts,
      nextCursor,
      hasMore,
      totalCount: actualPosts.length,
    };
  } catch (error) {
    console.error('Error fetching posts with cursor:', error);
    throw error;
  }
}

// ========================================
// MESSAGES - CURSOR BASED (SIN OFFSET)
// ========================================

export async function getMessagesCursor(params: {
  userId: string;
  otherUserId?: string;
  limit?: number;
  cursor?: string | null; // created_at como timestamp
  unreadOnly?: boolean;
}): Promise<CursorPaginatedResponse<MessageOptimized>> {
  const { 
    userId, 
    otherUserId, 
    limit = 20, 
    cursor,
    unreadOnly = false 
  } = params;

  try {
    let query = supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        created_at,
        read,
        media_url,
        media_type,
        sender_profile:profiles!messages_sender_id_fkey(id, username, avatar_url),
        receiver_profile:profiles!messages_receiver_id_fkey(id, username, avatar_url)
      `);

    // Filtros usando índices
    if (otherUserId) {
      // Chat específico entre dos usuarios
      query = query.or(`(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`);
    } else {
      // Todos los mensajes del usuario
      query = query.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    }

    if (unreadOnly) {
      query = query.eq('read', false); // Usa idx_messages_receiver_read_created_at
    }

    // Paginación cursor-based usando created_at
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    // Orden usando índice compuesto
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query.limit(limit + 1);

    if (error) throw error;

    const messages = (data || []) as MessageOptimized[];
    const hasMore = messages.length > limit;
    const actualMessages = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = actualMessages.length > 0 ? actualMessages[actualMessages.length - 1].created_at : null;

    return {
      data: actualMessages,
      nextCursor,
      hasMore,
      totalCount: actualMessages.length,
    };
  } catch (error) {
    console.error('Error fetching messages with cursor:', error);
    throw error;
  }
}

// ========================================
// NOTIFICATIONS - CURSOR BASED (SIN OFFSET)
// ========================================

export async function getNotificationsCursor(params: {
  userId: string;
  limit?: number;
  cursor?: string | null; // created_at como timestamp
  unreadOnly?: boolean;
}): Promise<CursorPaginatedResponse<NotificationOptimized>> {
  const { 
    userId, 
    limit = 20, 
    cursor,
    unreadOnly = false 
  } = params;

  try {
    let query = supabase
      .from('notifications')
      .select(`
        id,
        receiver_id,
        sender_id,
        post_id,
        comment_id,
        type,
        message,
        read,
        created_at,
        sender_profile:profiles!notifications_sender_id_fkey(id, username, avatar_url),
        post:posts(id, content),
        comment:comments(id, content)
      `);

    // Filtros usando índices
    query = query.eq('receiver_id', userId); // Usa idx_notifications_receiver_id_*

    if (unreadOnly) {
      query = query.eq('read', false); // Usa idx_notifications_receiver_id_*
    }

    // Paginación cursor-based usando created_at
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    // Orden usando índice compuesto
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query.limit(limit + 1);

    if (error) throw error;

    const notifications = (data || []) as NotificationOptimized[];
    const hasMore = notifications.length > limit;
    const actualNotifications = hasMore ? notifications.slice(0, -1) : notifications;
    const nextCursor = actualNotifications.length > 0 ? (actualNotifications[actualNotifications.length - 1] as any).created_at : null;

    return {
      data: actualNotifications,
      nextCursor,
      hasMore,
      totalCount: actualNotifications.length,
    };
  } catch (error) {
    console.error('Error fetching notifications with cursor:', error);
    throw error;
  }
}

// ========================================
// COMMENTS - CURSOR BASED (SIN OFFSET)
// ========================================

export async function getCommentsCursor(params: {
  postId: string;
  limit?: number;
  cursor?: string | null; // created_at como timestamp
  parentId?: string | null;
}): Promise<CursorPaginatedResponse<any>> {
  const { 
    postId, 
    limit = 20, 
    cursor,
    parentId = null
  } = params;

  try {
    let query = supabase
      .from('comments')
      .select(`
        id,
        post_id,
        user_id,
        content,
        parent_id,
        created_at,
        updated_at,
        media_url,
        media_type,
        is_useful,
        useful_marked_by,
        useful_marked_at,
        profiles:profiles(id, username, avatar_url, career),
        reactions:comment_reactions(id, reaction_type, user_id)
      `);

    // Filtros usando índices
    query = query.eq('post_id', postId); // Usa idx_comments_post_id_created_at

    if (parentId !== null) {
      query = query.eq('parent_id', parentId); // Respuestas a un comentario específico
    } else {
      query = query.is('parent_id', null); // Comentarios principales
    }

    // Paginación cursor-based usando created_at
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    // Orden usando índice compuesto
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query.limit(limit + 1);

    if (error) throw error;

    const comments: any[] = (data || []) as any[];
    const hasMore = comments.length > limit;
    const actualComments = hasMore ? comments.slice(0, -1) : comments;
    const nextCursor = actualComments.length > 0 ? (actualComments[actualComments.length - 1] as any).created_at : null;

    return {
      data: actualComments,
      nextCursor,
      hasMore,
      totalCount: actualComments.length,
    };
  } catch (error) {
    console.error('Error fetching comments with cursor:', error);
    throw error;
  }
}

// ========================================
// REACTIONS - CURSOR BASED (SIN OFFSET)
// ========================================

export async function getReactionsCursor(params: {
  postId?: string;
  userId?: string;
  limit?: number;
  cursor?: string | null; // created_at como timestamp
  reactionType?: string;
}): Promise<CursorPaginatedResponse<any>> {
  const { 
    postId, 
    userId, 
    limit = 20, 
    cursor,
    reactionType 
  } = params;

  try {
    let query = supabase
      .from('reactions')
      .select(`
        id,
        post_id,
        user_id,
        reaction_type,
        created_at,
        user_profile:profiles(id, username, avatar_url)
      `);

    // Filtros usando índices
    if (postId) {
      query = query.eq('post_id', postId); // Usa idx_reactions_post_id_created_at
    }

    if (userId) {
      query = query.eq('user_id', userId); // Usa idx_reactions_user_id_created_at
    }

    if (reactionType) {
      query = query.eq('reaction_type', reactionType);
    }

    // Paginación cursor-based usando created_at
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    // Orden usando índice
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query.limit(limit + 1);

    if (error) throw error;

    const reactions: any[] = (data || []) as any[];
    const hasMore = reactions.length > limit;
    const actualReactions = hasMore ? reactions.slice(0, -1) : reactions;
    const nextCursor = actualReactions.length > 0 ? (actualReactions[actualReactions.length - 1] as any).created_at : null;

    return {
      data: actualReactions,
      nextCursor,
      hasMore,
      totalCount: actualReactions.length,
    };
  } catch (error) {
    console.error('Error fetching reactions with cursor:', error);
    throw error;
  }
}

// ========================================
// FOLLOWS - CURSOR BASED (SIN OFFSET)
// ========================================

export async function getFollowsCursor(params: {
  userId: string;
  type?: 'followers' | 'following';
  limit?: number;
  cursor?: string | null; // created_at como timestamp
}): Promise<CursorPaginatedResponse<any>> {
  const { 
    userId, 
    type = 'following',
    limit = 20, 
    cursor 
  } = params;

  try {
    let query = supabase
      .from('follows')
      .select(`
        id,
        follower_id,
        following_id,
        created_at,
        following_profile:profiles!follows_following_id_fkey(id, username, avatar_url),
        follower_profile:profiles!follows_follower_id_fkey(id, username, avatar_url)
      `);

    // Filtros usando índices
    if (type === 'following') {
      query = query.eq('follower_id', userId); // Usuarios que sigo
    } else {
      query = query.eq('following_id', userId); // Usuarios que me siguen
    }

    // Paginación cursor-based usando created_at
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    // Orden usando índice compuesto
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query.limit(limit + 1);

    if (error) throw error;

    const follows: any[] = (data || []) as any[];
    const hasMore = follows.length > limit;
    const actualFollows = hasMore ? follows.slice(0, -1) : follows;
    const nextCursor = actualFollows.length > 0 ? (actualFollows[actualFollows.length - 1] as any).created_at : null;

    return {
      data: actualFollows,
      nextCursor,
      hasMore,
      totalCount: actualFollows.length,
    };
  } catch (error) {
    console.error('Error fetching follows with cursor:', error);
    throw error;
  }
}

// ========================================
// UTILIDADES DE MIGRACIÓN
// ========================================

// Función para migrar de OFFSET a cursor
export function migrateOffsetToCursor(offset: number, limit: number = 20): string | null {
  // Esta función ayuda a migrar código antiguo que usa OFFSET
  // En producción, deberías almacenar el último created_at visto
  return null; // Implementar según necesidad
}

// Función para validar cursor
export function isValidCursor(cursor: string | null): boolean {
  if (!cursor) return true;
  
  try {
    const date = new Date(cursor);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

// ========================================
// EXPORTACIONES COMPATIBLES CON API ANTIGUA
// ========================================

// Mantener compatibilidad con código existente
// ========================================
// EXPORTACIONES PRINCIPALES
// ========================================

export const cursorApi = {
  getPosts: getPostsCursor,
  getMessages: getMessagesCursor,
  getNotifications: getNotificationsCursor,
  getComments: getCommentsCursor,
  getReactions: getReactionsCursor,
  getFollows: getFollowsCursor,
};
