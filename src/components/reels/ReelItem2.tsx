import React, { useMemo, useState, useRef, useEffect, memo, useCallback } from 'react';
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
  batchFollowingStatus?: any;
  onBatchFollowingUpdate?: any;
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
  const [isReady, setIsReady] = useState(false);
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

  // URL estricta: solo devuelve video real (ver hybrid-url.ts)
  const currentSrc = useMemo(() => getPostVideoUrl(post) || '', [post]);

  // Manejo de errores mejorado
  const handleVideoError = useCallback(() => {
    console.warn('❌ Error en video:', currentSrc);
    setHasError(true);
  }, [currentSrc]);

  // Reset cuando cambia el post
  useEffect(() => {
    setHasError(false);
    setIsVertical(true);
    setIsReady(false);
    setIsPlaying(false);
  }, [post.media_url, post.media_urls, post.media_type]);

  // Pausar cuando no está activo
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!isActive) {
      try {
        v.pause();
      } catch {
        // ignore
      }
    }
  }, [isActive]);

  // Autoplay profesional: intentar reproducir solo cuando está activo y listo.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!isActive) return;
    if (hasError) return;
    if (!currentSrc) return;

    let cancelled = false;
    const tryPlay = async () => {
      try {
        // Autoplay policies: primero en mute.
        v.muted = true;
        await v.play();
        if (cancelled) return;
        setIsPlaying(true);
        // Si el usuario no está en mute global, luego desmutear.
        if (!isMuted) {
          try {
            v.muted = false;
          } catch {
            // ignore
          }
        }
      } catch {
        // Si autoplay falla, no es error fatal; queda con botón play.
        if (!cancelled) setIsPlaying(false);
      }
    };

    // Espera a que haya data suficiente.
    if (isReady || v.readyState >= 2) {
      void tryPlay();
    }

    return () => {
      cancelled = true;
    };
  }, [currentSrc, hasError, isActive, isMuted, isReady]);

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
      {!currentSrc && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-semibold mb-2">Este reel no tiene video</h3>
            <p className="text-gray-400">No se encontró un archivo de video válido para este post.</p>
          </div>
        </div>
      )}

      {/* Video */}
      <video
        ref={videoRef}
        src={currentSrc || undefined}
        className="w-full h-full object-cover"
        onError={handleVideoError}
        onLoadedMetadata={() => {
          try {
            const v = videoRef.current;
            if (!v) return;
            const w = v.videoWidth || 1;
            const h = v.videoHeight || 1;
            setIsVertical(h / w >= 1.25);
          } catch {
            // ignore
          }
        }}
        onCanPlay={() => setIsReady(true)}
        loop
        muted={isMuted}
        preload="metadata"
        playsInline
        onClick={handleDoubleClick}
      />

      {!hasError && !isReady && currentSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="relative">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <div className="absolute inset-0 rounded-full shimmer" />
          </div>
        </div>
      )}
      
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
          className="text-white hover:bg-white/20 transition-all duration-200 hover:scale-110 active:scale-95"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            toggleMute();
            showSliderTemporarily();
          }}
          className="text-white hover:bg-white/20 transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label={isMuted ? "Activar sonido" : "Silenciar"}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleReaction(post.id, 'love')}
          className={`text-white hover:bg-white/20 transition-all duration-200 hover:scale-110 active:scale-95 ${
            userReaction === 'love' ? 'text-red-500' : ''
          }`}
        >
          <Heart className={`h-5 w-5 transition-transform duration-200 ${
            userReaction === 'love' ? 'fill-current scale-125' : 'hover:scale-110'
          }`} />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleReaction(post.id, 'awesome')}
          className="text-white hover:bg-white/20 transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <MessageCircle className="h-5 w-5 hover:scale-110 transition-transform duration-200" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleShare}
          className="text-white hover:bg-white/20 transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <Share2 className="h-5 w-5 hover:rotate-12 transition-transform duration-200" />
        </Button>
      </div>
    </div>
  );
});

export default ReelItem2;
