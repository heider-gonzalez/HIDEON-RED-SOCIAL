// 🚀 FEED PAGINADO POR CURSOR - FRONTEND REACT/TYPESCRIPT
// Optimizado para índices idx_* creados en producción
// Usa created_at como cursor (last_timestamp)

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ========================================
// TIPOS BASADOS EN ESQUEMA REAL HSOCIAL
// ========================================

export interface Post {
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
  reactions_count?: number;
  comments_count?: number;
  shares_count?: number;
  user_reaction?: string | null;
}

export interface Message {
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

export interface Notification {
  id: string;
  receptor_id: string;
  sender_id: string | null;
  post_id: string | null;
  comment_id: string | null;
  tipo: string;
  mensaje: string;
  leer: boolean;
  creado_en: string;
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

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
  user_profile: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  following_profile: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

// ========================================
// API CON PAGINACIÓN POR CURSOR (USANDO ÍNDICES)
// ========================================

// FEED PRINCIPAL - Usa idx_posts_visibility_created_at y idx_posts_user_id_created_at
export async function getFeed(params: {
  userId?: string;
  limit?: number;
  cursor?: string | null; // created_at como timestamp
  visibility?: 'public' | 'friends' | 'all';
  includePinned?: boolean;
}) {
  const { 
    userId, 
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

    const posts = (data || []) as Post[];
    const hasMore = posts.length > limit;
    const actualPosts = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = actualPosts.length > 0 ? actualPosts[actualPosts.length - 1].created_at : null;

    // Calcular conteos adicionales
    const postsWithCounts = actualPosts.map(post => ({
      ...post,
      reactions_count: post.reactions?.length || 0,
      comments_count: post.comments?.[0]?.count || 0,
      shares_count: 0, // TODO: Implementar cuando tengamos tabla shares
      user_reaction: post.reactions?.find(r => r.user_id === userId)?.reaction_type || null,
    }));

    return {
      posts: postsWithCounts,
      nextCursor,
      hasMore,
      totalCount: postsWithCounts.length,
    };
  } catch (error) {
    console.error('Error fetching feed:', error);
    throw error;
  }
}

// MESSAGES - Usa idx_messages_sender_receiver_created_at y idx_messages_receiver_read_created_at
export async function getMessages(params: {
  userId: string;
  otherUserId?: string;
  limit?: number;
  cursor?: string | null; // created_at como timestamp
  unreadOnly?: boolean;
}) {
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

    const messages = (data || []) as Message[];
    const hasMore = messages.length > limit;
    const actualMessages = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = actualMessages.length > 0 ? actualMessages[actualMessages.length - 1].created_at : null;

    return {
      messages: actualMessages,
      nextCursor,
      hasMore,
      totalCount: actualMessages.length,
    };
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

// NOTIFICATIONS - Usa idx_notifications_receptor_id_creado_en y idx_notifications_receptor_id_leer
export async function getNotifications(params: {
  userId: string;
  limit?: number;
  cursor?: string | null; // creado_en como timestamp
  unreadOnly?: boolean;
}) {
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
        receptor_id,
        sender_id,
        post_id,
        comment_id,
        tipo,
        mensaje,
        leer,
        creado_en,
        sender_profile:profiles!notifications_sender_id_fkey(id, username, avatar_url),
        post:posts(id, content),
        comment:comments(id, content)
      `);

    // Filtros usando índices
    query = query.eq('receptor_id', userId); // Usa idx_notifications_receptor_id_creado_en

    if (unreadOnly) {
      query = query.eq('leer', false); // Usa idx_notifications_receptor_id_leer
    }

    // Paginación cursor-based usando creado_en
    if (cursor) {
      query = query.lt('creado_en', cursor);
    }

    // Orden usando índice compuesto
    query = query.order('creado_en', { ascending: false });

    const { data, error } = await query.limit(limit + 1);

    if (error) throw error;

    const notifications = (data || []) as Notification[];
    const hasMore = notifications.length > limit;
    const actualNotifications = hasMore ? notifications.slice(0, -1) : notifications;
    const nextCursor = actualNotifications.length > 0 ? actualNotifications[actualNotifications.length - 1].creado_en : null;

    return {
      notifications: actualNotifications,
      nextCursor,
      hasMore,
      totalCount: actualNotifications.length,
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

// REACTIONS - Usa idx_reactions_post_id_created_at y idx_reactions_user_id_created_at
export async function getReactions(params: {
  postId?: string;
  userId?: string;
  limit?: number;
  cursor?: string | null; // created_at como timestamp
  reactionType?: string;
}) {
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

    const reactions = (data || []) as Reaction[];
    const hasMore = reactions.length > limit;
    const actualReactions = hasMore ? reactions.slice(0, -1) : reactions;
    const nextCursor = actualReactions.length > 0 ? actualReactions[actualReactions.length - 1].created_at : null;

    return {
      reactions: actualReactions,
      nextCursor,
      hasMore,
      totalCount: actualReactions.length,
    };
  } catch (error) {
    console.error('Error fetching reactions:', error);
    throw error;
  }
}

// FOLLOWS - Usa idx_follows_following_created_at y idx_follows_follower_following
export async function getFollows(params: {
  userId: string;
  type?: 'followers' | 'following';
  limit?: number;
  cursor?: string | null; // created_at como timestamp
}) {
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
        following_profile:profiles!follows_following_id_fkey(id, username, avatar_url)
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

    const follows = (data || []) as Follow[];
    const hasMore = follows.length > limit;
    const actualFollows = hasMore ? follows.slice(0, -1) : follows;
    const nextCursor = actualFollows.length > 0 ? actualFollows[actualFollows.length - 1].created_at : null;

    return {
      follows: actualFollows,
      nextCursor,
      hasMore,
      totalCount: actualFollows.length,
    };
  } catch (error) {
    console.error('Error fetching follows:', error);
    throw error;
  }
}

// ========================================
// HOOKS REACT CON SCROLL INFINITO
// ========================================

// HOOK PARA FEED INFINITO
export function useInfiniteFeed(options: {
  userId?: string;
  visibility?: 'public' | 'friends' | 'all';
  initialLimit?: number;
  includePinned?: boolean;
}) {
  const { 
    userId, 
    visibility = 'public', 
    initialLimit = 20,
    includePinned = true 
  } = options;

  return useInfiniteQuery({
    queryKey: ['infinite-feed', userId, visibility, includePinned],
    queryFn: ({ pageParam = null }) => 
      getFeed({
        userId,
        visibility,
        cursor: pageParam,
        limit: initialLimit,
        includePinned,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30 * 1000,        // 30 segundos
    gcTime: 5 * 60 * 1000,       // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    // Prefetch automático de página siguiente
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
  });
}

// HOOK PARA MESSAGES INFINITO
export function useInfiniteMessages(options: {
  userId: string;
  otherUserId?: string;
  initialLimit?: number;
  unreadOnly?: boolean;
}) {
  const { 
    userId, 
    otherUserId, 
    initialLimit = 20,
    unreadOnly = false 
  } = options;

  return useInfiniteQuery({
    queryKey: ['infinite-messages', userId, otherUserId, unreadOnly],
    queryFn: ({ pageParam = null }) => 
      getMessages({
        userId,
        otherUserId,
        cursor: pageParam,
        limit: initialLimit,
        unreadOnly,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

// HOOK PARA NOTIFICATIONS INFINITO
export function useInfiniteNotifications(options: {
  userId: string;
  initialLimit?: number;
  unreadOnly?: boolean;
}) {
  const { 
    userId, 
    initialLimit = 20,
    unreadOnly = false 
  } = options;

  return useInfiniteQuery({
    queryKey: ['infinite-notifications', userId, unreadOnly],
    queryFn: ({ pageParam = null }) => 
      getNotifications({
        userId,
        cursor: pageParam,
        limit: initialLimit,
        unreadOnly,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

// HOOK PARA REACTIONS INFINITO
export function useInfiniteReactions(options: {
  postId?: string;
  userId?: string;
  initialLimit?: number;
  reactionType?: string;
}) {
  const { 
    postId, 
    userId, 
    initialLimit = 20,
    reactionType 
  } = options;

  return useInfiniteQuery({
    queryKey: ['infinite-reactions', postId, userId, reactionType],
    queryFn: ({ pageParam = null }) => 
      getReactions({
        postId,
        userId,
        cursor: pageParam,
        limit: initialLimit,
        reactionType,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

// HOOK PARA FOLLOWS INFINITO
export function useInfiniteFollows(options: {
  userId: string;
  type?: 'followers' | 'following';
  initialLimit?: number;
}) {
  const { 
    userId, 
    type = 'following',
    initialLimit = 20 
  } = options;

  return useInfiniteQuery({
    queryKey: ['infinite-follows', userId, type],
    queryFn: ({ pageParam = null }) => 
      getFollows({
        userId,
        type,
        cursor: pageParam,
        limit: initialLimit,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

// ========================================
// UTILIDADES DE CACHE Y OPTIMIZACIÓN
// ========================================

export function useFeedUtils() {
  const queryClient = useQueryClient();

  // Refresh manual del feed
  const refreshFeed = async (options?: {
    userId?: string;
    visibility?: 'public' | 'friends' | 'all';
  }) => {
    await queryClient.invalidateQueries({
      queryKey: ['infinite-feed', options?.userId, options?.visibility],
    });
  };

  // Refresh manual de messages
  const refreshMessages = async (userId: string, otherUserId?: string) => {
    await queryClient.invalidateQueries({
      queryKey: ['infinite-messages', userId, otherUserId],
    });
  };

  // Refresh manual de notifications
  const refreshNotifications = async (userId: string) => {
    await queryClient.invalidateQueries({
      queryKey: ['infinite-notifications', userId],
    });
  };

  // Marcar notificación como leída (optimistic update)
  const markNotificationAsRead = async (notificationId: string) => {
    // Update optimista
    queryClient.setQueriesData(
      { queryKey: ['infinite-notifications'] },
      (oldData: any) => {
        if (!oldData?.pages) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            notifications: page.notifications.map((notif: Notification) => 
              notif.id === notificationId 
                ? { ...notif, leer: true }
                : notif
            )
          }))
        };
      }
    );

    // Llamar API
    await supabase
      .from('notifications')
      .update({ leer: true })
      .eq('id', notificationId);
  };

  // Marcar mensaje como leído (optimistic update)
  const markMessageAsRead = async (messageId: string) => {
    // Update optimista
    queryClient.setQueriesData(
      { queryKey: ['infinite-messages'] },
      (oldData: any) => {
        if (!oldData?.pages) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: Message) => 
              msg.id === messageId 
                ? { ...msg, read: true }
                : msg
            )
          }))
        };
      }
    );

    // Llamar API
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId);
  };

  // Añadir reacción (optimistic update)
  const addReactionOptimistic = async (postId: string, reactionType: string, userId: string) => {
    // Update optimista
    queryClient.setQueriesData(
      { queryKey: ['infinite-feed'] },
      (oldData: any) => {
        if (!oldData?.pages) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: Post) => 
              post.id === postId 
                ? { 
                    ...post, 
                    reactions_count: (post.reactions_count || 0) + 1,
                    user_reaction: reactionType 
                  }
                : post
            )
          }))
        };
      }
    );

    // Llamar API
    await supabase
      .from('reactions')
      .insert({
        post_id: postId,
        user_id: userId,
        reaction_type: reactionType,
      });
  };

  return {
    refreshFeed,
    refreshMessages,
    refreshNotifications,
    markNotificationAsRead,
    markMessageAsRead,
    addReactionOptimistic,
  };
}

export default {
  useInfiniteFeed,
  useInfiniteMessages,
  useInfiniteNotifications,
  useInfiniteReactions,
  useInfiniteFollows,
  useFeedUtils,
};
