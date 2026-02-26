// 🚀 FEED CON PAGINACIÓN POR CURSOR - IMPLEMENTACIÓN FINAL
// Optimizado para índices created_at y user_id
// Basado en esquema real HSOCIAL

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ========================================
// TIPOS BASADOS EN ESQUEMA REAL HSOCIAL
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

interface Project {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  status: 'active' | 'completed' | 'archived';
  visibility: 'public' | 'private';
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  project_members: Array<{
    user_id: string;
    role: string;
  }>;
}

// ========================================
// API CON PAGINACIÓN CURSOR-BASED (USANDO ÍNDICES)
// ========================================

export async function getCursorPaginatedFeed(params: {
  userId?: string;
  limit?: number;
  cursor?: string | null;
  visibility?: 'public' | 'friends' | 'all';
  includeProjects?: boolean;
}) {
  const { 
    userId, 
    limit = 20, 
    cursor, 
    visibility = 'public',
    includeProjects = false 
  } = params;

  try {
    // Query principal usando índice idx_posts_visibility_created_at
    let postsQuery = supabase
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
        reactions:reactions(count)
      `);

    // Filtros usando índices
    if (userId) {
      postsQuery = postsQuery.eq('user_id', userId); // Usa idx_posts_user_id_created_at
    }

    if (visibility !== 'all') {
      postsQuery = postsQuery.eq('visibility', visibility); // Usa idx_posts_visibility_created_at
    }

    // Paginación cursor-based usando created_at (índice principal)
    if (cursor) {
      postsQuery = postsQuery.lt('created_at', cursor);
    }

    // Orden usando índice compuesto
    postsQuery = postsQuery
      .order('is_pinned', { ascending: false }) // Pinned posts primero
      .order('created_at', { ascending: false }); // Luego por fecha

    const { data: postsData, error: postsError } = await postsQuery.limit(limit + 1);

    if (postsError) throw postsError;

    const posts = (postsData || []) as Post[];
    const hasMorePosts = posts.length > limit;
    const actualPosts = hasMorePosts ? posts.slice(0, -1) : posts;
    const nextCursor = actualPosts.length > 0 ? actualPosts[actualPosts.length - 1].created_at : null;

    let projects: Project[] = [];
    let hasMoreProjects = false;

    if (includeProjects) {
      // Query de proyectos usando índice idx_projects_visibility_created_at
      let projectsQuery = supabase
        .from('projects')
        .select(`
          id,
          title,
          description,
          created_at,
          updated_at,
          user_id,
          status,
          visibility,
          profiles:profiles(id, username, avatar_url),
          project_members:project_members(user_id, role)
        `);

      if (visibility !== 'all') {
        projectsQuery = projectsQuery.eq('visibility', visibility);
      }

      if (cursor) {
        projectsQuery = projectsQuery.lt('created_at', cursor);
      }

      projectsQuery = projectsQuery
        .order('created_at', { ascending: false })
        .limit(Math.floor(limit / 2) + 1); // Mitad del límite para proyectos

      const { data: projectsData, error: projectsError } = await projectsQuery;

      if (projectsError) throw projectsError;

      projects = (projectsData || []) as Project[];
      hasMoreProjects = projects.length > Math.floor(limit / 2);
      projects = hasMoreProjects ? projects.slice(0, -1) : projects;
    }

    // Combinar y ordenar resultados
    let combinedItems = [...actualPosts, ...projects];
    combinedItems.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const hasMore = hasMorePosts || hasMoreProjects;

    return {
      items: combinedItems,
      nextCursor,
      hasMore,
      postsCount: actualPosts.length,
      projectsCount: projects.length,
    };
  } catch (error) {
    console.error('Error fetching cursor paginated feed:', error);
    throw error;
  }
}

// ========================================
// HOOK PARA FEED INFINITO OPTIMIZADO
// ========================================

export function useInfiniteCursorFeed(options: {
  userId?: string;
  visibility?: 'public' | 'friends' | 'all';
  initialLimit?: number;
  includeProjects?: boolean;
}) {
  const { 
    userId, 
    visibility = 'public', 
    initialLimit = 20,
    includeProjects = false 
  } = options;

  return useInfiniteQuery({
    queryKey: ['infinite-cursor-feed', userId, visibility, includeProjects],
    queryFn: ({ pageParam = null }) => 
      getCursorPaginatedFeed({
        userId,
        visibility,
        cursor: pageParam,
        limit: initialLimit,
        includeProjects,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30 * 1000,        // 30 segundos
    gcTime: 5 * 60 * 1000,       // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    // Prefetch de página siguiente cuando el usuario está cerca del final
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
  });
}

// ========================================
// HOOK PARA FEED TRADICIONAL CON REFRESH
// ========================================

export function useCursorFeed(options: {
  userId?: string;
  visibility?: 'public' | 'friends' | 'all';
  limit?: number;
  includeProjects?: boolean;
}) {
  const { 
    userId, 
    visibility = 'public', 
    limit = 20,
    includeProjects = false 
  } = options;

  return useQuery({
    queryKey: ['cursor-feed', userId, visibility, limit, includeProjects],
    queryFn: () => getCursorPaginatedFeed({ 
      userId, 
      visibility, 
      limit, 
      includeProjects 
    }),
    staleTime: 30 * 1000,        // 30 segundos
    gcTime: 5 * 60 * 1000,       // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

// ========================================
// HOOK PARA REFRESH Y PREFETCH INTELIGENTE
// ========================================

export function useCursorFeedUtils(options: {
  userId?: string;
  visibility?: 'public' | 'friends' | 'all';
}) {
  const { userId, visibility = 'public' } = options;
  const queryClient = useQueryClient();

  // Refresh manual del feed
  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['cursor-feed', userId, visibility],
    });
    
    await queryClient.invalidateQueries({
      queryKey: ['infinite-cursor-feed', userId, visibility],
    });
  };

  // Prefetch inteligente de página siguiente
  const prefetchNext = async (cursor: string, includeProjects = false) => {
    queryClient.prefetchQuery({
      queryKey: ['cursor-feed', userId, visibility, 20, includeProjects, cursor],
      queryFn: () => getCursorPaginatedFeed({ 
        userId, 
        visibility, 
        cursor, 
        limit: 20,
        includeProjects 
      }),
      staleTime: 30 * 1000,
    });
  };

  // Prefetch de posts específicos para scroll suave
  const prefetchPost = async (postId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['post', postId],
      queryFn: () => supabase
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
          reactions:reactions(count)
        `)
        .eq('id', postId)
        .single(),
      staleTime: 60 * 1000,
    });
  };

  return { refresh, prefetchNext, prefetchPost };
}

// ========================================
// UTILIDADES DE CACHE Y OPTIMIZACIÓN
// ========================================

export function useFeedCacheUtils() {
  const queryClient = useQueryClient();

  // Actualización optimista de reacciones
  const updatePostReaction = (postId: string, reactionType: string | null, increment: number) => {
    queryClient.setQueriesData(
      { 
        queryKey: ['cursor-feed'],
      },
      (oldData: any) => {
        if (!oldData?.pages && !oldData?.items) return oldData;
        
        // Para infinite query
        if (oldData?.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              items: page.items.map((item: any) => 
                item.id === postId 
                  ? { 
                      ...item, 
                      reactions_count: (item.reactions_count || 0) + increment,
                      user_reaction: reactionType 
                    }
                  : item
              )
            }))
          };
        }
        
        // Para query normal
        if (oldData?.items) {
          return {
            ...oldData,
            items: oldData.items.map((item: any) => 
              item.id === postId 
                ? { 
                    ...item, 
                    reactions_count: (item.reactions_count || 0) + increment,
                    user_reaction: reactionType 
                  }
                : item
            )
          };
        }
        
        return oldData;
      }
    );
  };

  // Actualización optimista de comentarios
  const updatePostComments = (postId: string, increment: number) => {
    queryClient.setQueriesData(
      { 
        queryKey: ['cursor-feed'],
      },
      (oldData: any) => {
        if (!oldData?.pages && !oldData?.items) return oldData;
        
        const updateComments = (item: any) => 
          item.id === postId 
            ? { 
                ...item, 
                comments_count: (item.comments_count || 0) + increment 
              }
            : item;

        // Para infinite query
        if (oldData?.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              items: page.items.map(updateComments)
            }))
          };
        }
        
        // Para query normal
        if (oldData?.items) {
          return {
            ...oldData,
            items: oldData.items.map(updateComments)
          };
        }
        
        return oldData;
      }
    );
  };

  // Invalidar cache de posts específicos
  const invalidatePost = async (postId: string) => {
    queryClient.invalidateQueries({
      queryKey: ['cursor-feed'],
    });
    
    queryClient.invalidateQueries({
      queryKey: ['infinite-cursor-feed'],
    });
    
    queryClient.invalidateQueries({
      queryKey: ['post', postId],
    });
  };

  return {
    updatePostReaction,
    updatePostComments,
    invalidatePost,
  };
}

// ========================================
// COMPONENTE DE EJEMPLO OPTIMIZADO
// ========================================

/*
Ejemplo de uso en un componente React:

import { useInfiniteCursorFeed, useCursorFeedUtils, useFeedCacheUtils } from './cursor-paginated-feed-final';

function OptimizedFeedComponent() {
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading 
  } = useInfiniteCursorFeed({
    visibility: 'public',
    includeProjects: true,
    initialLimit: 20
  });
  
  const { prefetchNext } = useCursorFeedUtils({ visibility: 'public' });
  const { updatePostReaction, updatePostComments } = useFeedCacheUtils();

  const handleLike = async (postId: string) => {
    // Update optimista
    updatePostReaction(postId, 'love', 1);
    
    try {
      await addReaction(postId, 'love');
    } catch (error) {
      // Rollback en caso de error
      updatePostReaction(postId, null, -1);
    }
  };

  const handleComment = async (postId: string) => {
    // Update optimista
    updatePostComments(postId, 1);
    
    try {
      await addComment(postId, content);
    } catch (error) {
      // Rollback en caso de error
      updatePostComments(postId, -1);
    }
  };

  // Prefetch inteligente cuando el usuario hace scroll
  const handleScroll = (event: React.UIEvent) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;
    
    // Prefetch cuando está al 80% del final
    if (scrollPercentage > 80 && hasNextPage && !isFetchingNextPage) {
      const lastPage = data?.pages[data.pages.length - 1];
      if (lastPage?.nextCursor) {
        prefetchNext(lastPage.nextCursor, true);
      }
    }
  };

  if (isLoading) return <div>Cargando feed...</div>;

  return (
    <div onScroll={handleScroll} style={{ height: '100vh', overflow: 'auto' }}>
      {data?.pages.map((page, pageIndex) => (
        <div key={pageIndex}>
          {page.items.map((item: any) => (
            item.content ? (
              <PostCard 
                key={item.id} 
                post={item} 
                onLike={() => handleLike(item.id)}
                onComment={() => handleComment(item.id)}
              />
            ) : (
              <ProjectCard 
                key={item.id} 
                project={item} 
              />
            )
          ))}
        </div>
      ))}
      
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
