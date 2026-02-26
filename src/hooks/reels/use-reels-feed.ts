import { useMemo } from "react";
import { usePersonalizedFeed } from "@/hooks/feed/use-personalized-feed";
import type { Post } from "@/types/post";

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

  // Filtrar solo posts con videos - simplificado para Supabase Storage
  const videosPosts = useMemo(() => {
    const realVideos = posts.filter((post: Post) => {
      const urls: string[] = [];
      if (Array.isArray(post.media_urls)) {
        for (const u of post.media_urls) {
          if (typeof u === 'string' && u.trim()) urls.push(u);
        }
      }
      if (typeof post.media_url === 'string' && post.media_url.trim()) {
        urls.push(post.media_url);
      }

      const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.ogg'];
      const hasVideoUrl = urls.some((url) => {
        const lower = url.toLowerCase();
        return videoExtensions.some((ext) => lower.includes(ext));
      });

      const mediaType = typeof post.media_type === 'string' ? post.media_type.toLowerCase() : '';
      const hasVideoType = mediaType === 'video' || mediaType.startsWith('video/');

      return hasVideoUrl || hasVideoType;
    });

    // Si no hay videos reales, añadir videos de demo para testing
    if (realVideos.length === 0 && posts.length === 0) {
      return [
        {
          id: 'demo-1',
          content: 'Video de demostración 1 - Paisaje natural',
          user_id: 'demo-user',
          media_urls: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'],
          media_type: 'video',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          visibility: 'public' as const,
          profiles: {
            username: 'Demo User',
            avatar_url: null
          }
        },
        {
          id: 'demo-2', 
          content: 'Video de demostración 2 - Animación',
          user_id: 'demo-user',
          media_urls: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'],
          media_type: 'video',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          visibility: 'public' as const,
          profiles: {
            username: 'Demo User',
            avatar_url: null
          }
        }
      ] as Post[];
    }
    
    return realVideos;
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