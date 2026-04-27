import React, { useMemo, useState, useRef, useEffect, memo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Eye, Play, Pause, Volume2, VolumeX, MessageCircle, Share2 } from "lucide-react";
import { Post } from "@/types/post";
import { useVolumeControl } from "@/hooks/reels/use-volume-control";
import { VolumeSlider } from "./VolumeSlider";
import { getPostVideoUrl } from "@/lib/hybrid-url";
import { LikeButton } from "@/components/feed/LikeButton";
import { useAuth } from "@/providers/AuthProvider";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { CommentList } from "@/components/feed/CommentList";
import { CommentForm } from "@/components/feed/CommentForm";
import { usePostComments } from "@/hooks/usePostComments";
import { useUnifiedReactions } from "@/hooks/use-unified-reactions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShareModal } from "@/components/post/actions/ShareModal";
import { MentionsText } from "@/components/post/MentionsText";

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

const ReelItem2 = memo(function ReelItem2({ 
  post, 
  isActive, 
  onReaction, 
  onViewTracked,
  initialSeek
}: ReelItemProps) {
  void onViewTracked;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { user } = useAuth();
  const { addComment } = usePostComments(post.id);
  const { reactionCount } = useUnifiedReactions(post.id);

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

  const contentForMentions = post.content || "";

  // Manejo de errores mejorado
  const handleVideoError = useCallback(() => {
    console.warn('❌ Error en video:', currentSrc);
    setHasError(true);
  }, [currentSrc]);

  // Reset cuando cambia el post
  useEffect(() => {
    setHasError(false);
  }, [post.media_url, post.media_urls, post.media_type]);

  useEffect(() => {
    setIsReady(false);
  }, [post.media_url, post.media_urls, post.media_type]);

  useEffect(() => {
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
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('Video play error:', err);
          }
        });
        setIsPlaying(true);
      }
    }
  }, [isPlaying]);

  return (
    <div className="relative w-full h-full bg-gray-950 group">
      {!currentSrc && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 text-white p-8">
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
        className="w-full h-full object-contain bg-gray-950"
        controls={false}
        loop
        muted={isMuted}
        preload="metadata"
        playsInline
        onClick={togglePlay}
        onError={handleVideoError}
        onLoadedMetadata={() => {
          try {
            const v = videoRef.current;
            if (!v) return;
            const w = v.videoWidth || 1;
            const h = v.videoHeight || 1;
            setDuration(Number.isFinite(v.duration) ? v.duration : 0);
          } catch {
            // ignore
          }
        }}
        onLoadStart={() => setIsReady(false)}
        onCanPlay={() => {
          setIsReady(true);
          try {
            const v = videoRef.current;
            if (!v) return;
            setDuration(Number.isFinite(v.duration) ? v.duration : 0);
          } catch {
            // ignore
          }
        }}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v) return;
          setCurrentTime(v.currentTime || 0);
        }}
      />

      {!hasError && !isReady && currentSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950/40 z-20">
          <div className="relative">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <div className="absolute inset-0 rounded-full shimmer" />
          </div>
        </div>
      )}
      
      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 text-white p-8">
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

      {/* Desktop: barra lateral de interacciones (flotante derecha, dentro del video) */}
      <div className="hidden md:flex absolute right-4 bottom-24 flex-col gap-4 items-center z-30">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/20 flex items-center justify-center">
            <Eye className="h-6 w-6" />
          </div>
          <span className="text-white text-xs mt-1 font-medium">{Number(post.views_count || 0)}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            toggleMute();
            showSliderTemporarily();
          }}
          className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/20"
          aria-label={isMuted ? "Activar sonido" : "Silenciar"}
        >
          {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </Button>

        <div className="flex flex-col items-center">
          <LikeButton
            postId={post.id}
            userId={user?.id}
            compact={true}
            onReacted={() => onReaction(post.id, 'love')}
          />
          <span className="text-white text-xs mt-1 font-medium">{Number(reactionCount || 0)}</span>
        </div>

        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowComments(true);
              onReaction(post.id, 'comment');
            }}
            className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/20"
            aria-label="Comentar"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          <span className="text-white text-xs mt-1 font-medium">{Number(post.comments_count || 0)}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setShowShare(true);
            onReaction(post.id, 'share');
          }}
          className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/20"
          aria-label="Compartir"
        >
          <Share2 className="h-6 w-6" />
        </Button>
      </div>

      {/* Desktop: barra de progreso (seekbar) funcional. Visible en hover */}
      <div className="hidden md:block absolute left-0 right-0 bottom-0 z-30 px-4 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => {
            const v = videoRef.current;
            if (!v) return;
            const t = Number(e.target.value);
            try {
              v.currentTime = t;
              setCurrentTime(t);
            } catch {
              // ignore
            }
          }}
          className="w-full h-1 accent-white cursor-pointer"
        />
      </div>
      
      
      {/* Autor (overlay inferior) */}
      <div className="hidden md:block absolute left-0 right-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 pointer-events-none">
        <div className="flex items-center gap-3 max-w-[calc(100%-5rem)]">
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage src={post.profiles?.avatar_url} alt={post.profiles?.username} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {(post.profiles?.username || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-white min-w-0">
            <div className="font-semibold text-sm truncate">{post.profiles?.username || 'Usuario'}</div>
            {contentForMentions && (
              <MentionsText
                content={contentForMentions}
                className="text-sm text-gray-100 whitespace-pre-wrap break-words line-clamp-3"
              />
            )}
          </div>
        </div>
      </div>

      <Drawer open={showComments} onOpenChange={setShowComments}>
        <DrawerContent className="max-h-[80svh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="text-sm font-semibold">Comentarios</div>
            <button
              className="text-sm text-muted-foreground"
              onClick={() => setShowComments(false)}
              type="button"
            >
              Cerrar
            </button>
          </div>
          <div className="overflow-y-auto">
            <div className="px-4 py-3 space-y-3">
              <CommentList postId={post.id} />
              <CommentForm
                postId={post.id}
                userId={user?.id}
                onAddComment={async (content) => {
                  if (!user?.id) return;
                  await addComment(content, user.id);
                }}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        post={post}
      />
    </div>
  );
});

export default ReelItem2;
