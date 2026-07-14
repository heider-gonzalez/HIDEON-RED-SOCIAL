// 🚀 FEED CON PAGINACIÓN CURSOR-BASED - IMPLEMENTACIÓN FINAL
// Basado en esquema real de HSOCIAL

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ========================================
// TIPOS BASADOS EN ESQUEMA REAL
// ========================================

interface Post {
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
  reactions_count?: number;
  comments_count?: number;
  shares_count?: number;
  user_reaction?: string | null;
}

// ========================================
// API CON PAGINACIÓN CURSOR-BASED
// ========================================

export async function getPaginatedFeed(params: {
  userId?: string;
  limit?: number;
  cursor?: string | null;
  visibility?: 'public' | 'friends' | 'all';
}) {
  const { userId, limit = 20, cursor, visibility = 'public' } = params;

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
        comments:comments(count)
      `);

    // Filtros
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (visibility !== 'all') {
      query = query.eq('visibility', visibility);
    }

    // Paginación cursor-based
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit + 1); // +1 para verificar si hay más

    if (error) throw error;

    const posts = (data || []) as Post[];
    const hasMore = posts.length > limit;
    const actualPosts = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = actualPosts.length > 0 ? actualPosts[actualPosts.length - 1].created_at : null;

    return {
      posts: actualPosts,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    console.error('Error fetching paginated feed:', error);
    throw error;
  }
}

// ========================================
// HOOK PARA FEED INFINITO
// ========================================

export function useInfiniteFeed(options: {
  userId?: string;
  visibility?: 'public' | 'friends' | 'all';
  initialLimit?: number;
}) {
  const { userId, visibility = 'public', initialLimit = 20 } = options;

  return useInfiniteQuery({
    queryKey: ['infinite-feed', userId, visibility],
    queryFn: ({ pageParam = null }) => 
      getPaginatedFeed({
        userId,
        visibility,
        cursor: pageParam,
        limit: initialLimit,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30 * 1000,        // 30 segundos
    gcTime: 5 * 60 * 1000,       // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

// ========================================
// HOOK PARA FEED TRADICIONAL (CON REFRESH)
// ========================================

export function usePaginatedFeed(options: {
  userId?: string;
  visibility?: 'public' | 'friends' | 'all';
  limit?: number;
}) {
  const { userId, visibility = 'public', limit = 20 } = options;

  return useQuery({
    queryKey: ['paginated-feed', userId, visibility, limit],
    queryFn: () => getPaginatedFeed({ userId, visibility, limit }),
    staleTime: 30 * 1000,        // 30 segundos
    gcTime: 5 * 60 * 1000,       // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

// ========================================
// HOOK PARA REFRESH MANUAL
// ========================================

export function useFeedRefresh(options: {
  userId?: string;
  visibility?: 'public' | 'friends' | 'all';
}) {
  const { userId, visibility = 'public' } = options;
  const queryClient = useQueryClient();

  const refresh = async () => {
    // Invalidar cache y refrescar
    await queryClient.invalidateQueries({
      queryKey: ['paginated-feed', userId, visibility],
    });
    
    await queryClient.invalidateQueries({
      queryKey: ['infinite-feed', userId, visibility],
    });
  };

  const prefetchNext = async (cursor: string) => {
    queryClient.prefetchQuery({
      queryKey: ['paginated-feed', userId, visibility, cursor],
      queryFn: () => getPaginatedFeed({ 
        userId, 
        visibility, 
        cursor, 
        limit: 20 
      }),
      staleTime: 30 * 1000,
    });
  };

  return { refresh, prefetchNext };
}

// ========================================
// UTILIDADES DE PAGINACIÓN
// ========================================

export function useFeedUtils() {
  const queryClient = useQueryClient();

  // Optimizar prefetch de posts siguientes
  const prefetchAdjacentPages = async (currentCursor: string, userId?: string) => {
    // Prefetch página siguiente
    queryClient.prefetchQuery({
      queryKey: ['paginated-feed', userId, 'public', currentCursor],
      queryFn: () => getPaginatedFeed({ 
        userId, 
        cursor: currentCursor, 
        limit: 20 
      }),
      staleTime: 30 * 1000,
    });
  };

  // Invalidar posts específicos (ej: después de like/comment)
  const invalidatePost = async (postId: string) => {
    // Invalidar queries que puedan contener este post
    queryClient.invalidateQueries({
      queryKey: ['paginated-feed'],
    });
    
    queryClient.invalidateQueries({
      queryKey: ['infinite-feed'],
    });
  };

  // Actualizar post en cache (optimistic update)
  const updatePostInCache = (postId: string, updates: Partial<Post>) => {
    queryClient.setQueriesData(
      { 
        queryKey: ['paginated-feed'],
      },
      (oldData: any) => {
        if (!oldData?.pages && !oldData?.posts) return oldData;
        
        // Para infinite query
        if (oldData?.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              posts: page.posts.map((post: Post) => 
                post.id === postId ? { ...post, ...updates } : post
              )
            }))
          };
        }
        
        // Para query normal
        if (oldData?.posts) {
          return {
            ...oldData,
            posts: oldData.posts.map((post: Post) => 
              post.id === postId ? { ...post, ...updates } : post
            )
          };
        }
        
        return oldData;
      }
    );
  };

  return {
    prefetchAdjacentPages,
    invalidatePost,
    updatePostInCache,
  };
}

// ========================================
// COMPONENTE DE EJEMPLO
// ========================================

/*
Ejemplo de uso en un componente:

import { useInfiniteFeed, useFeedUtils } from './paginated-feed-implementation';

function FeedComponent() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteFeed({
    visibility: 'public'
  });
  
  const { updatePostInCache } = useFeedUtils();

  const handleLike = async (postId: string) => {
    // Update optimista
    updatePostInCache(postId, { 
      reactions_count: (post?.reactions_count || 0) + 1,
      user_reaction: 'love' 
    });
    
    // Llamar API
    await addReaction(postId, 'love');
  };

  return (
    <div>
      {data?.pages.map((page) => 
        page.posts.map(post => (
          <PostCard 
            key={post.id} 
            post={post} 
            onLike={() => handleLike(post.id)}
          />
        ))
      )}
      
      {hasNextPage && (
        <button 
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Cargando...' : 'Cargar más'}
        </button>
      )}
    </div>
  );
}
*/
