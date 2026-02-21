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
      // Verificar que tenga media_urls array con contenido
      if (!post.media_urls || !Array.isArray(post.media_urls) || post.media_urls.length === 0) {
        return false;
      }
      
      // Verificar si alguna URL es un video
      const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'];
      const hasVideoUrl = post.media_urls.some((url: string) => {
        if (!url) return false;
        const hasVideoExtension = videoExtensions.some(ext => 
          url.toLowerCase().includes(ext)
        );
        return hasVideoExtension;
      });
      
      // Verificar por media_type
      const hasVideoType = post.media_type === 'video';
      
      const isVideo = hasVideoUrl || hasVideoType;
      return isVideo;
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