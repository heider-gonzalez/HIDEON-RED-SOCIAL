import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook para mantener la estabilidad del feed y evitar cambios bruscos
 * cuando se están viendo posts individualmente
 */
export function useFeedStability(isViewingPost = false) {
  const lastVisiblePostId = useRef<string | null>(null);
  const isStabilizing = useRef(false);
  const stabilizationTimeout = useRef<NodeJS.Timeout>();

  // Prevenir cambios bruscos cuando un usuario está viendo un post
  const stabilizeFeed = useCallback((currentPostId: string) => {
    if (isViewingPost && currentPostId !== lastVisiblePostId.current) {
      isStabilizing.current = true;
      lastVisiblePostId.current = currentPostId;
      
      // Mantener estabilidad por 2 segundos cuando se cambia de post
      if (stabilizationTimeout.current) {
        clearTimeout(stabilizationTimeout.current);
      }
      
      stabilizationTimeout.current = setTimeout(() => {
        isStabilizing.current = false;
      }, 2000);
      
      return true;
    }
    return false;
  }, [isViewingPost]);

  // Limpiar timeouts
  useEffect(() => {
    return () => {
      if (stabilizationTimeout.current) {
        clearTimeout(stabilizationTimeout.current);
      }
    };
  }, []);

  // Verificar si el feed debe permanecer estable
  const shouldPreventUpdates = useCallback(() => {
    return isStabilizing.current || isViewingPost;
  }, [isViewingPost]);

  // Resetear estabilidad manualmente
  const resetStability = useCallback(() => {
    isStabilizing.current = false;
    lastVisiblePostId.current = null;
    if (stabilizationTimeout.current) {
      clearTimeout(stabilizationTimeout.current);
    }
  }, []);

  return {
    stabilizeFeed,
    shouldPreventUpdates,
    resetStability,
    isStabilizing: isStabilizing.current
  };
}
