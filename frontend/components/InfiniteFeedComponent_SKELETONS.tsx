// 🚀 COMPONENTE FEED INFINITO CON SKELETONS - UX INSTANTÁNEA
// Implementación con skeletons para carga instantánea
// Optimizado para latencia Colombia-US

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useInfiniteFeed, useFeedUtils } from '../hooks/useCursorPaginatedFeed_FINAL';
import { Post } from '../hooks/useCursorPaginatedFeed_FINAL';

interface InfiniteFeedProps {
  userId?: string;
  visibility?: 'public' | 'friends' | 'all';
  initialLimit?: number;
  includePinned?: boolean;
  onPostClick?: (post: Post) => void;
  onUserClick?: (userId: string) => void;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
}

// Componente Skeleton para posts
const PostSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
    {/* Header skeleton */}
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="space-y-1">
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      </div>
    </div>

    {/* Content skeleton */}
    <div className="mb-3 space-y-2">
      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
    </div>

    {/* Media skeleton (opcional) */}
    <div className="mb-3">
      <div className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
    </div>

    {/* Interaction bar skeleton */}
    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-gray-100">
          <div className="w-5 h-5 bg-gray-300 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-300 rounded w-4 animate-pulse"></div>
        </div>
        <div className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-gray-100">
          <div className="w-5 h-5 bg-gray-300 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-300 rounded w-4 animate-pulse"></div>
        </div>
        <div className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-gray-100">
          <div className="w-5 h-5 bg-gray-300 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-300 rounded w-4 animate-pulse"></div>
        </div>
      </div>
      <div className="w-5 h-5 bg-gray-300 rounded animate-pulse"></div>
    </div>
  </div>
);

// Componente Skeleton para carga inicial
const InitialLoadingSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, index) => (
      <PostSkeleton key={index} />
    ))}
  </div>
);

// Componente Skeleton para carga de más posts
const LoadMoreSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[...Array(2)].map((_, index) => (
      <PostSkeleton key={`load-more-${index}`} />
    ))}
  </div>
);

export const InfiniteFeedComponent: React.FC<InfiniteFeedProps> = ({
  userId,
  visibility = 'public',
  initialLimit = 20,
  includePinned = true,
  onPostClick,
  onUserClick,
  onLike,
  onComment,
  onShare,
}) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useInfiniteFeed({
    userId,
    visibility,
    initialLimit,
    includePinned,
  });

  const { addReactionOptimistic, refreshFeed } = useFeedUtils();

  // Ref para el contenedor de scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Ref para trackear si estamos cargando
  const isLoadingRef = useRef(false);
  // Estado para mostrar skeletons de carga
  const [showLoadMoreSkeletons, setShowLoadMoreSkeletons] = useState(false);

  // Función para manejar scroll y cargar más datos
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isLoadingRef.current || !hasNextPage) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;

    // Mostrar skeletons cuando el usuario esté al 70% del final
    if (scrollPercentage > 70 && !isFetchingNextPage && !showLoadMoreSkeletons) {
      setShowLoadMoreSkeletons(true);
    }

    // Cargar más cuando el usuario esté al 85% del final
    if (scrollPercentage > 85 && !isFetchingNextPage) {
      isLoadingRef.current = true;
      fetchNextPage().finally(() => {
        isLoadingRef.current = false;
        setShowLoadMoreSkeletons(false);
      });
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, showLoadMoreSkeletons]);

  // Throttle para el scroll event
  const throttledHandleScroll = useCallback(
    throttle(handleScroll, 200),
    [handleScroll]
  );

  // Función throttle para optimizar performance
  function throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    let lastExecTime = 0;

    return (...args: Parameters<T>) => {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func(...args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func(...args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  // Manejar click en like
  const handleLike = useCallback(async (postId: string, currentReaction?: string | null) => {
    if (!userId) return;

    try {
      if (currentReaction) {
        // Si ya hay reacción, removerla (toggle)
        await addReactionOptimistic(postId, '', userId);
      } else {
        // Añadir reacción de corazón
        await addReactionOptimistic(postId, 'love', userId);
      }
      onLike?.(postId);
    } catch (error) {
      console.error('Error handling like:', error);
    }
  }, [userId, addReactionOptimistic, onLike]);

  // Manejar refresh manual
  const handleRefresh = useCallback(async () => {
    await refreshFeed({ userId, visibility });
    await refetch();
  }, [refreshFeed, refetch, userId, visibility]);

  // Renderizar post individual
  const renderPost = useCallback((post: Post) => {
    const isLiked = post.user_reaction !== null;
    const timeAgo = formatTimeAgo(post.created_at);

    return (
      <div
        key={post.id}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 hover:shadow-md transition-shadow duration-200"
      >
        {/* Header del post */}
        <div className="flex items-start justify-between mb-3">
          <div 
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => onUserClick?.(post.user_id)}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {post.profiles?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                {post.profiles?.username || 'Usuario'}
              </h3>
              <p className="text-sm text-gray-500">{timeAgo}</p>
            </div>
          </div>
          
          {post.is_pinned && (
            <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
              Fijado
            </div>
          )}
        </div>

        {/* Contenido del post */}
        <div 
          className="mb-3 cursor-pointer"
          onClick={() => onPostClick?.(post)}
        >
          <p className="text-gray-800 whitespace-pre-wrap break-words">
            {post.content}
          </p>
        </div>

        {/* Media si existe */}
        {post.media_url && (
          <div className="mb-3 rounded-lg overflow-hidden">
            {post.media_type === 'image' ? (
              <img
                src={post.media_url}
                alt="Post media"
                className="w-full h-auto max-h-96 object-cover"
                loading="lazy"
              />
            ) : post.media_type === 'video' ? (
              <video
                src={post.media_url}
                controls
                className="w-full h-auto max-h-96 object-cover"
              />
            ) : null}
          </div>
        )}

        {/* Barra de interacciones */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            {/* Botón de like */}
            <button
              onClick={() => handleLike(post.id, post.user_reaction)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-full transition-all duration-200 ${
                isLiked
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg
                className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`}
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span className="text-sm font-medium">
                {post.reactions_count || 0}
              </span>
            </button>

            {/* Botón de comment */}
            <button
              onClick={() => onComment?.(post.id)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all duration-200"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="text-sm font-medium">
                {post.comments_count || 0}
              </span>
            </button>

            {/* Botón de share */}
            <button
              onClick={() => onShare?.(post.id)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all duration-200"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326"
                />
              </svg>
              <span className="text-sm font-medium">
                {post.shares_count || 0}
              </span>
            </button>
          </div>

          {/* Opciones adicionales */}
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }, [handleLike, onPostClick, onUserClick, onComment, onShare]);

  // Estado de carga inicial - Mostrar skeletons inmediatamente
  if (isLoading && !data) {
    return (
      <div className="relative">
        {/* Botón de refresh */}
        <button
          onClick={handleRefresh}
          className="fixed top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200"
          title="Actualizar feed"
        >
          <svg className="w-5 h-5 text-gray-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        {/* Skeletons de carga inicial */}
        <div className="h-screen overflow-y-auto pb-20">
          <InitialLoadingSkeleton />
        </div>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-gray-700 mb-4">Error al cargar el feed</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Feed vacío
  if (!data?.pages || data.pages.length === 0 || data.pages[0].posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <p className="text-gray-500 text-lg mb-2">No hay posts para mostrar</p>
        <p className="text-gray-400 text-sm">
          {visibility === 'public' 
            ? 'Sé el primero en compartir algo con la comunidad'
            : 'No hay posts en esta sección'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Botón de refresh */}
      <button
        onClick={handleRefresh}
        className="fixed top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200"
        title="Actualizar feed"
      >
        <svg
          className={`w-5 h-5 text-gray-600 ${isFetching ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>

      {/* Contenedor del feed con scroll */}
      <div
        ref={scrollContainerRef}
        onScroll={throttledHandleScroll}
        className="h-screen overflow-y-auto pb-20"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Renderizar todas las páginas */}
        {data.pages.map((page, pageIndex) => (
          <div key={pageIndex}>
            {page.posts.map(renderPost)}
          </div>
        ))}

        {/* Skeletons de carga anticipada */}
        {showLoadMoreSkeletons && !isFetchingNextPage && hasNextPage && (
          <LoadMoreSkeleton />
        )}

        {/* Indicador de carga real */}
        {(isFetchingNextPage || hasNextPage) && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-500">
              {isFetchingNextPage ? 'Cargando más posts...' : 'Desliza para cargar más'}
            </span>
          </div>
        )}

        {/* Fin del feed */}
        {!hasNextPage && data.pages.length > 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Has llegado al final del feed</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm underline"
            >
              Actualizar para ver nuevos posts
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Utilidad para formatear tiempo relativo
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'ahora';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `hace ${diffInWeeks} ${diffInWeeks === 1 ? 'semana' : 'semanas'}`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `hace ${diffInMonths} ${diffInMonths === 1 ? 'mes' : 'meses'}`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `hace ${diffInYears} ${diffInYears === 1 ? 'año' : 'años'}`;
}

export default InfiniteFeedComponent;
