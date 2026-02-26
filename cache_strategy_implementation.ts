// 🚀 ESTRATEGIA DE CACHÉ STALE-WHILE-REVALIDATE
// Implementación optimizada para latencia Colombia-US

import { QueryClient, QueryKey } from '@tanstack/react-query';

// ========================================
// CONFIGURACIÓN GLOBAL DE QUERY CLIENT
// ========================================

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30 segundos stale
      gcTime: 5 * 60 * 1000,       // 5 minutos garbage collection
      refetchOnWindowFocus: false, // Optimización para latencia
      refetchOnMount: false,       // Evitar refetch al montar
      retry: (failureCount, error: any) => {
        // Reintentar solo para errores de red
        if (error?.status >= 500) return failureCount < 2;
        return false;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// ========================================
// CACHE LOCAL PARA DATOS DE ALTA FRECUENCIA
// ========================================

// Cache para reacciones del usuario (evita queries repetitivas)
class UserReactionCache {
  private cache = new Map<string, string>();
  private lastUpdate = new Map<string, number>();

  set(postId: string, reaction: string) {
    this.cache.set(postId, reaction);
    this.lastUpdate.set(postId, Date.now());
  }

  get(postId: string): string | null {
    const lastUpdate = this.lastUpdate.get(postId);
    if (!lastUpdate || Date.now() - lastUpdate > 60 * 1000) {
      this.cache.delete(postId);
      this.lastUpdate.delete(postId);
      return null;
    }
    return this.cache.get(postId) || null;
  }

  invalidate(postId: string) {
    this.cache.delete(postId);
    this.lastUpdate.delete(postId);
  }

  clear() {
    this.cache.clear();
    this.lastUpdate.clear();
  }
}

export const userReactionCache = new UserReactionCache();

// Cache para perfiles de usuarios (evita queries repetitivas)
class UserProfileCache {
  private cache = new Map<string, any>();
  private lastUpdate = new Map<string, number>();

  set(userId: string, profile: any) {
    this.cache.set(userId, profile);
    this.lastUpdate.set(userId, Date.now());
  }

  get(userId: string): any | null {
    const lastUpdate = this.lastUpdate.get(userId);
    if (!lastUpdate || Date.now() - lastUpdate > 5 * 60 * 1000) {
      this.cache.delete(userId);
      this.lastUpdate.delete(userId);
      return null;
    }
    return this.cache.get(userId) || null;
  }

  invalidate(userId: string) {
    this.cache.delete(userId);
    this.lastUpdate.delete(userId);
  }
}

export const userProfileCache = new UserProfileCache();

// ========================================
// ESTRATEGIAS DE CACHE POR TIPO DE DATO
// ========================================

export const cacheStrategies = {
  // Posts: Stale corto por naturaleza dinámica
  posts: {
    staleTime: 30 * 1000,      // 30 segundos
    gcTime: 5 * 60 * 1000,     // 5 minutos
    refetchOnWindowFocus: false,
  },

  // Perfiles: Stale medio por cambios menos frecuentes
  profiles: {
    staleTime: 5 * 60 * 1000,  // 5 minutos
    gcTime: 30 * 60 * 1000,    // 30 minutos
    refetchOnWindowFocus: false,
  },

  // Notificaciones: Stale muy corto por importancia
  notifications: {
    staleTime: 10 * 1000,      // 10 segundos
    gcTime: 2 * 60 * 1000,     // 2 minutos
    refetchOnWindowFocus: true,
  },

  // Mensajes: Stale corto por naturaleza en tiempo real
  messages: {
    staleTime: 15 * 1000,      // 15 segundos
    gcTime: 3 * 60 * 1000,     // 3 minutos
    refetchOnWindowFocus: false,
  },

  // Datos estáticos: Stale largo
  static: {
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 24 * 60 * 60 * 1000, // 24 horas
    refetchOnWindowFocus: false,
  },
};

// ========================================
// HOOKS OPTIMIZADOS CON CACHE
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Hook para posts con caché optimizada
export function useOptimizedPosts(userId?: string) {
  return useQuery({
    queryKey: ['posts', userId],
    queryFn: () => getPostsPage({ userId, limit: 20 }),
    ...cacheStrategies.posts,
    select: (data) => {
      // Transformación y cache local
      data.posts.forEach(post => {
        if (post.profiles) {
          userProfileCache.set(post.user_id, post.profiles);
        }
      });
      return data;
    },
  });
}

// Hook para perfiles con caché local
export function useOptimizedProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId),
    ...cacheStrategies.profiles,
    initialData: () => userProfileCache.get(userId),
    onSuccess: (data) => {
      userProfileCache.set(userId, data);
    },
  });
}

// Hook para reacciones con caché instantánea
export function useOptimizedReactions(postId: string) {
  return useQuery({
    queryKey: ['reactions', postId],
    queryFn: () => getPostReactions(postId),
    staleTime: 5 * 1000,       // 5 segundos
    gcTime: 1 * 60 * 1000,     // 1 minuto
    refetchOnWindowFocus: false,
    initialData: () => {
      const cached = userReactionCache.get(postId);
      return cached ? { userReaction: cached } : undefined;
    },
  });
}

// ========================================
// MUTACIONES CON INVALIDACIÓN INTELIGENTE
// ========================================

export function useOptimizedReactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, reactionType }: { postId: string; reactionType: string }) =>
      addReaction(postId, reactionType),
    onMutate: async ({ postId, reactionType }) => {
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: ['reactions', postId] });
      
      // Snapshot previo
      const previousReactions = queryClient.getQueryData(['reactions', postId]);
      
      // Actualización optimista
      userReactionCache.set(postId, reactionType);
      
      return { previousReactions };
    },
    onError: (err, { postId }, context) => {
      // Rollback en caso de error
      if (context?.previousReactions) {
        queryClient.setQueryData(['reactions', postId], context.previousReactions);
      }
      userReactionCache.invalidate(postId);
    },
    onSettled: (data, error, { postId }) => {
      // Refetch para sincronizar
      queryClient.invalidateQueries({ queryKey: ['reactions', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ========================================
// PREFETCHING ESTRATÉGICO
// ========================================

export function useStrategicPrefetch() {
  const queryClient = useQueryClient();

  const prefetchUserProfile = (userId: string) => {
    if (!userProfileCache.get(userId)) {
      queryClient.prefetchQuery({
        queryKey: ['profile', userId],
        queryFn: () => getProfile(userId),
        ...cacheStrategies.profiles,
      });
    }
  };

  const prefetchPostReactions = (postId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['reactions', postId],
      queryFn: () => getPostReactions(postId),
      staleTime: 5 * 1000,
    });
  };

  return { prefetchUserProfile, prefetchPostReactions };
}

// ========================================
// CACHE INVALIDATION INTELIGENTE
// ========================================

export function useSmartInvalidation() {
  const queryClient = useQueryClient();

  const invalidateUserRelated = (userId: string) => {
    // Invalidar todo relacionado con un usuario
    queryClient.invalidateQueries({ queryKey: ['posts', userId] });
    queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    
    // Limpiar cache local
    userProfileCache.invalidate(userId);
  };

  const invalidatePostRelated = (postId: string) => {
    // Invalidar todo relacionado con un post
    queryClient.invalidateQueries({ queryKey: ['reactions', postId] });
    queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    
    // Limpiar cache local
    userReactionCache.invalidate(postId);
  };

  return { invalidateUserRelated, invalidatePostRelated };
}

// ========================================
// MONITOREO DE CACHE PERFORMANCE
// ========================================

class CacheMonitor {
  private hits = 0;
  private misses = 0;
  private startTime = Date.now();

  recordHit() {
    this.hits++;
  }

  recordMiss() {
    this.misses++;
  }

  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    const uptime = Date.now() - this.startTime;
    
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate.toFixed(2) + '%',
      uptime: (uptime / 1000).toFixed(0) + 's',
    };
  }

  reset() {
    this.hits = 0;
    this.misses = 0;
    this.startTime = Date.now();
  }
}

export const cacheMonitor = new CacheMonitor();

// ========================================
// UTILIDADES DE CACHE
// ========================================

export function invalidateAllCache() {
  queryClient.clear();
  userReactionCache.clear();
  userProfileCache.clear();
  cacheMonitor.reset();
}

export function preloadCriticalData(userId: string) {
  // Precargar datos críticos para la experiencia del usuario
  queryClient.prefetchQuery({
    queryKey: ['posts', userId],
    queryFn: () => getPostsPage({ userId, limit: 10 }),
    ...cacheStrategies.posts,
  });

  queryClient.prefetchQuery({
    queryKey: ['notifications', userId],
    queryFn: () => getNotifications(userId),
    ...cacheStrategies.notifications,
  });
}

// ========================================
// CONFIGURACIÓN PARA PRODUCCIÓN
// ========================================

export const productionCacheConfig = {
  // Tiempos más largos en producción para reducir carga
  production: {
    ...cacheStrategies,
    posts: { ...cacheStrategies.posts, staleTime: 60 * 1000 },
    profiles: { ...cacheStrategies.profiles, staleTime: 10 * 60 * 1000 },
    notifications: { ...cacheStrategies.notifications, staleTime: 30 * 1000 },
  },
  
  // Tiempos más cortos en desarrollo para datos frescos
  development: {
    ...cacheStrategies,
    posts: { ...cacheStrategies.posts, staleTime: 10 * 1000 },
    profiles: { ...cacheStrategies.profiles, staleTime: 60 * 1000 },
    notifications: { ...cacheStrategies.notifications, staleTime: 5 * 1000 },
  },
};

// ========================================
// EXPORTACIONES
// ========================================

export {
  QueryClient,
  queryClient,
};

// Tipos para las funciones de API (importar desde lib/api)
async function getPostsPage(params: { userId?: string; limit?: number }) {
  // Implementación importada desde lib/api
  return { posts: [], nextCursor: undefined };
}

async function getProfile(userId: string) {
  // Implementación para obtener perfil
  return null;
}

async function getPostReactions(postId: string) {
  // Implementación para obtener reacciones
  return { reactions: [] };
}

async function addReaction(postId: string, reactionType: string) {
  // Implementación para agregar reacción
  return { success: true };
}

async function getNotifications(userId: string) {
  // Implementación para obtener notificaciones
  return [];
}
