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

  // Filtrar solo posts con videos - mejorado para Supabase Storage
  const videosPosts = useMemo(() => {
    const realVideos = posts.filter((post: Post) => {
      // Recolectar todas las URLs de medios
      const urls: string[] = [];
      
      // Añadir media_url si existe
      if (typeof post.media_url === 'string' && post.media_url.trim()) {
        urls.push(post.media_url);
      }
      
      // Añadir media_urls si es array
      if (Array.isArray(post.media_urls)) {
        for (const u of post.media_urls) {
          if (typeof u === 'string' && u.trim()) {
            urls.push(u);
          }
        }
      }
      
      // Añadir demo_url si existe (para proyectos)
      if (typeof (post as any).demo_url === 'string' && (post as any).demo_url.trim()) {
        urls.push((post as any).demo_url);
      }
      
      // Verificar si alguna URL es un video
      const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.ogg', '.3gp', '.flv'];
      const hasVideoUrl = urls.some((url) => {
        const lower = url.toLowerCase();
        return videoExtensions.some((ext) => lower.includes(ext));
      });
      
      // Verificar media_type
      const mediaType = typeof post.media_type === 'string' ? post.media_type.toLowerCase() : '';
      const hasVideoType = mediaType === 'video' || mediaType.startsWith('video/');
      
      // Verificar post_type para proyectos que puedan tener video
      const postType = typeof (post as any).post_type === 'string' ? (post as any).post_type.toLowerCase() : '';
      const isProjectWithVideo = postType === 'project' || postType === 'proyecto';
      
      return hasVideoUrl || hasVideoType || isProjectWithVideo;
    });
    
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