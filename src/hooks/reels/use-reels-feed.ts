import { useMemo } from "react";
import { usePersonalizedFeed } from "@/hooks/feed/use-personalized-feed";
import type { Post } from "@/types/post";
import { getPostVideoUrl } from "@/lib/hybrid-url";

/**
 * Hook optimizado para obtener posts de video (Reels)
 * Filtra videos de la data existente sin queries adicionales
 */
export function useReelsFeed() {
  const { 
    posts, 
    isLoading, 
    trackPostView, 
    trackPostInteraction,
    refetch
  } = usePersonalizedFeed();

  // Filtrar solo posts con videos - mejorado para Supabase Storage
  const videosPosts = useMemo(() => {
    return posts.filter((post: Post) => Boolean(getPostVideoUrl(post)));
  }, [posts]);

  // Track view específico para reels con duración optimizado
  const trackReelView = (postId: string, durationSeconds?: number) => {
    try {
      trackPostView(postId, durationSeconds);
      // Bonus para videos vistos completamente solo si es significativo
      if (durationSeconds && durationSeconds > 15) {
        trackPostInteraction(postId, 'like');
      }
    } catch (error) {
      console.warn('Error tracking reel view:', error);
    }
  };

  const trackReelInteraction = (postId: string, type: 'like' | 'comment' | 'share') => {
    try {
      trackPostInteraction(postId, type);
    } catch (error) {
      console.warn('Error tracking reel interaction:', error);
    }
  };

  return {
    videosPosts,
    isLoading,
    trackReelView,
    trackReelInteraction,
    refetch,
    hasVideos: videosPosts.length > 0
  };
}