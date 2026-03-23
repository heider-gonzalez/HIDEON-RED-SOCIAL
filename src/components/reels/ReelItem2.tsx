import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Play, Volume2, VolumeX, Heart, MessageCircle, Share2 } from "lucide-react";
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
  initialSeek?: { time: number; muted?: boolean };
}

const ReelItem2 = memo(function ReelItem2({ post, isActive, onReaction, onViewTracked, initialSeek }: ReelItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(() => getPostVideoUrl(post) || post.media_url || '');
  const [isVertical, setIsVertical] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { userReaction, onReaction: handleReaction } = usePostReactions(post.id);
  const { toast } = useToast();

  const contentForMentions = post.content || "";

  const {
    comments,
    newComment,
    setNewComment,
    replyTo,
    commentImage,
    setCommentImage,
    showComments,
    setShowComments,
    handleSubmitComment,
    handleCommentLike,
    handleReply,
    loadReplies,
    handleDeleteComment,
    handleCancelReply
  } = useReelComments(post.id);

  // Control de volumen mejorado
  const { volume, isMuted, showSlider, toggleMute, changeVolume, showSliderTemporarily } = useVolumeControl(videoRef);

  // Auto-play cuando está visible
  const { isIntersecting } = useIntersectionObserver(containerRef, {
    threshold: 0.7, // 70% visible para activar
  });

  useEffect(() => {
    if (isActive && isIntersecting && videoRef.current) {
      setStartTime(Date.now());
      videoRef.current.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Video play error:', err);
        }
      });
    } else if (videoRef.current && (!isActive || !isIntersecting)) {
      videoRef.current.pause();

      // Track view duration
      if (startTime) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        if (duration > 1) { // Solo trackear si vio más de 1 segundo
          onViewTracked(post.id, duration);
        }
        setStartTime(null);
      }
    }
  }, [isActive, isIntersecting, post.id, startTime, onViewTracked]);

  // Sync play/pause state with actual video events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);

    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, []);

  // El volumen se maneja en el hook useVolumeControl

  // Manejar errores de video - intentar R2 primero, luego fallback a Supabase si es necesario
  const handleVideoError = useCallback(async () => {
    console.warn('❌ Video error en R2:', currentSrc);
    
    // Si la URL actual es de R2, intentar fallback a Supabase
    if (currentSrc.includes('r2.dev') || currentSrc.includes('cloudflare')) {
      console.log('🔄 Intentando fallback a Supabase...');
      const supabaseUrl = post.media_url?.includes('supabase.co/storage') 
        ? post.media_url 
        : `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/media/${post.media_url?.split('/').pop()}`;
      
      if (supabaseUrl && supabaseUrl !== currentSrc) {
        setCurrentSrc(supabaseUrl);
        console.log('✅ Usando fallback Supabase:', supabaseUrl);
        return;
      }
    }
    
    // Si ya es Supabase o no hay fallback, marcar como error
    setHasError(true);
    console.error('❌ Video no disponible en ninguna fuente:', currentSrc);
  }, [currentSrc, post.media_url]);

  // Reset error cuando cambia el post
  useEffect(() => {
    setHasError(false);
    setCurrentSrc(getPostVideoUrl(post) || post.media_url || '');
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

  const handleDoubleClick = useDoubleClick(() => {
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
  });

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
      <video
        ref={videoRef}
        src={currentSrc}
        className="w-full h-full object-contain"
        onError={handleVideoError}
        loop
        muted={isMuted}
        playsInline
        onClick={handleDoubleClick}
      />
      
      {/* Controles de volumen */}
      {showSlider && (
        <VolumeSlider
          volume={volume}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onChangeVolume={changeVolume}
          showTemporarily={showSliderTemporarily}
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
          className={`text-white hover:bg-white/20 ${userReaction?.type === 'love' ? 'text-red-500' : ''}`}
        >
          <Heart className={`h-5 w-5 ${userReaction?.type === 'love' ? 'fill-current' : ''}`} />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleReaction(post.id, 'comment')}
          className="text-white hover:bg-white/20"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleReaction(post.id, 'share')}
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
