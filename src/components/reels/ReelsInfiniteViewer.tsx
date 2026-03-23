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
import ReelItem2 from './ReelItem2';

interface ReelsInfiniteViewerProps {
  posts: Post[];
  onReaction: (postId: string, type: string) => void;
  onViewTracked: (postId: string, duration: number) => void;
  initialPostId?: string;
  initialPlayback?: { postId: string; time: number; muted?: boolean };
}

function ReelsInfiniteViewerComponent({
  posts,
  onReaction,
  onViewTracked,
  initialPostId,
  initialPlayback
}: ReelsInfiniteViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(posts[0]?.media_url || '');
  const [isVertical, setIsVertical] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { userReaction, onReaction: handleReaction } = usePostReactions(posts[0]?.id || '');
  const { toast } = useToast();

  const contentForMentions = posts[0]?.content || "";

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
  } = useReelComments(posts[0]?.id || '');

  // Control de volumen mejorado
  const { volume, isMuted, showSlider, toggleMute, changeVolume, showSliderTemporarily } = useVolumeControl(videoRef);

  // Auto-play cuando está visible
  const { isIntersecting } = useIntersectionObserver(containerRef, {
    threshold: 0.7, // 70% visible para activar
  });

  useEffect(() => {
    if (isIntersecting && videoRef.current) {
      setStartTime(Date.now());
      videoRef.current.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Video play error:', err);
        }
      });
    } else if (videoRef.current && !isIntersecting) {
      videoRef.current.pause();

      // Track view duration
      if (startTime) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        if (duration > 1) { // Solo trackear si vio más de 1 segundo
          onViewTracked(posts[0]?.id || '', duration);
        }
        setStartTime(null);
      }
    }
  }, [isIntersecting, posts, startTime, onViewTracked]);

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

  // Manejar errores de video - sin fallback a Supabase para evitar egreso
  const handleVideoError = useCallback(() => {
    setHasError(true);
    console.warn('❌ Video no disponible (R2):', currentSrc);
  }, [currentSrc]);

  // Reset error cuando cambia el post
  useEffect(() => {
    setHasError(false);
    setCurrentSrc(posts[0]?.media_url || '');
    setIsVertical(true);
  }, [posts]);

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

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(currentSrc || '');
      toast({
        title: "Enlace copiado",
        description: "El enlace del reel se copió al portapapeles"
      });
      onReaction(posts[0]?.id || '', 'share');
    } catch {
      toast({
        variant: "destructive",
        title: "Error al compartir",
        description: "No se pudo copiar el enlace"
      });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[100svh] bg-black flex items-center justify-center snap-start"
    >
      {/* Video layer */}
      {posts.map((post, index) => (
        <ReelItem2
          key={post.id}
          post={post}
          isActive={index === activeIndex}
          onReaction={onReaction}
          onViewTracked={onViewTracked}
          initialSeek={initialPlayback}
        />
      ))}
    </div>
  );
}

export { ReelsInfiniteViewerComponent as ReelsInfiniteViewer };
export default ReelsInfiniteViewerComponent;
