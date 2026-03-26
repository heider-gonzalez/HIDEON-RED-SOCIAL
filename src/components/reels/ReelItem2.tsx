import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Share2 } from "lucide-react";
import { Post } from "@/types/post";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { usePostReactions } from "@/hooks/posts/use-post-reactions";
import { useDoubleClick } from "@/hooks/use-double-click";
import { useVolumeControl } from "@/hooks/reels/use-volume-control";
import { VolumeSlider } from "./VolumeSlider";
import { useReelComments } from "@/hooks/reels/use-reel-comments";
import { Comments } from "@/components/post/Comments";
import { useToast } from "@/hooks/use-toast";
import { MentionsText } from "@/components/post/MentionsText";
import { getPostVideoUrl } from "@/lib/hybrid-url";

// Función para obtener URLs de video del post
function getVideoUrls(post: Post): string[] {
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
  
  return urls;
}

// Función para verificar si una URL es de video
function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.ogg', '.3gp', '.flv'];
  const lower = url.toLowerCase();
  return videoExtensions.some((ext) => lower.includes(ext));
}

// Función para construir URL de Supabase si es solo un path
function getSupabaseUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/media/${cleanPath}`;
}

interface VolumeSliderProps {
  volume: number;
  isMuted: boolean;
  show: boolean;
  onChange: (value: number) => void;
  onMuteToggle: () => void;
  showTemporarily: () => void;
}

interface ReelItemProps {
  post: Post;
  isActive: boolean;
  onReaction: (postId: string, type: string) => void;
  onViewTracked: (postId: string, duration: number) => void;
  batchFollowingStatus: any;
  onBatchFollowingUpdate: any;
  initialSeek?: { time: number; muted?: boolean };
}

const ReelItem2 = memo(function ReelItem2({ 
  post, 
  isActive, 
  onReaction, 
  onViewTracked,
  batchFollowingStatus,
  onBatchFollowingUpdate,
  initialSeek
}: ReelItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isVertical, setIsVertical] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);

  const { userReaction, onReaction: handleReaction } = usePostReactions(post.id);
  const { toast } = useToast();

  const {
    volume,
    isMuted,
    toggleMute,
    changeVolume,
    showSlider,
    showSliderTemporarily
  } = useVolumeControl(videoRef);

  // Obtener URL del video usando la función existente
  const currentSrc = getPostVideoUrl(post) || '';

  // Manejo de errores mejorado
  const handleVideoError = useCallback(() => {
    console.warn('❌ Error en video:', currentSrc);
    setHasError(true);
  }, [currentSrc]);

  // Reset cuando cambia el post
  useEffect(() => {
    setHasError(false);
    setIsVertical(true);
  }, [post.media_url, post.media_urls, post.media_type]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!isActive) return;
    if (!initialSeek) return;

    const apply = () => {
      try {
        if (typeof initialSeek.muted === 'boolean') {
          v.muted = initialSeek.muted;
        }
        if (Number.isFinite(initialSeek.time)) {
          v.currentTime = Math.max(0, initialSeek.time);
        }
      } catch {
        // ignore
      }
    };

    if (v.readyState >= 1) {
      apply();
      return;
    }

    v.addEventListener('loadedmetadata', apply, { once: true });
    return () => v.removeEventListener('loadedmetadata', apply);
  }, [initialSeek, isActive]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('Video play error:', err);
          }
        });
      }
    }
  }, [isPlaying]);

  const handleDoubleClick = useDoubleClick(
    () => {
      // Single click - do nothing or toggle play/pause
    },
    () => {
      if (videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play().catch((err) => {
            if (err.name !== 'AbortError') {
              console.error('Video play error:', err);
            }
          });
        } else {
          videoRef.current.pause();
        }
      }
    }
  );

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(currentSrc || '');
      toast({
        title: "Enlace copiado",
        description: "El enlace del reel se copió al portapapeles"
      });
      onReaction(post.id, 'share');
    } catch {
      toast({
        variant: "destructive",
        title: "Error al compartir",
        description: "No se pudo copiar el enlace"
      });
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video */}
      <video
        ref={videoRef}
        src={currentSrc || undefined}
        className="w-full h-full object-cover"
        onError={handleVideoError}
        loop
        muted={isMuted}
        playsInline
        onClick={handleDoubleClick}
      />
      
      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold mb-2">Video no disponible</h3>
            <p className="text-gray-400 mb-4">
              No se pudo cargar este video
            </p>
          </div>
        </div>
      )}
      
      {/* Controles de volumen */}
      {showSlider && (
        <VolumeSlider
          volume={volume}
          isMuted={isMuted}
          show={showSlider}
          onChange={changeVolume}
          onMuteToggle={toggleMute}
        />
      )}
      
      {/* Controles superpuestos */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-t from-black/60% to-transparent">
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          className="text-white hover:bg-white/20"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => showSliderTemporarily()}
          className="text-white hover:bg-white/20"
        >
          <Volume2 className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleReaction(post.id, 'love')}
          className={`text-white hover:bg-white/20 ${userReaction === 'love' ? 'text-red-500' : ''}`}
        >
          <Heart className={`h-5 w-5 ${userReaction === 'love' ? 'fill-current' : ''}`} />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleReaction(post.id, 'awesome')}
          className="text-white hover:bg-white/20"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleShare}
          className="text-white hover:bg-white/20"
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center text-white p-4">
            <div className="text-red-500 text-sm mb-2">❌ Error al cargar video</div>
            <div className="text-xs text-gray-400">Comprueba que la migración a R2 esté completa</div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ReelItem2;
