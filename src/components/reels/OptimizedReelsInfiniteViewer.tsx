import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Eye, Play, Volume2, VolumeX, MessageCircle, Share2 } from "lucide-react";
import { Post } from "@/types/post";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { FollowButton } from "@/components/FollowButton";
import { useBatchFollowingStatus } from "@/hooks/use-batch-following-status";
import { useDoubleClick } from "@/hooks/use-double-click";
import { useVolumeControl } from "@/hooks/reels/use-volume-control";
import { VolumeSlider } from "./VolumeSlider";
import { MentionsText } from "@/components/post/MentionsText";
import { getPostVideoUrl } from "@/lib/hybrid-url";
import { CommentForm } from "@/components/feed/CommentForm";
import { CommentList } from "@/components/feed/CommentList";
import { useAuth } from "@/providers/AuthProvider";
import { usePostComments } from "@/hooks/usePostComments";
import { LikeButton } from "@/components/feed/LikeButton";
import { useUnifiedReactions } from "@/hooks/use-unified-reactions";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { ShareModal } from "@/components/post/actions/ShareModal";

interface OptimizedReelItemProps {
  post: Post;
  isActive: boolean;
  onReaction: (postId: string, type: string) => void;
  onViewTracked: (postId: string, duration: number) => void;
  batchFollowingStatus?: boolean;
  onBatchFollowingUpdate?: (userId: string, isFollowing: boolean) => void;
  initialSeek?: { time: number; muted?: boolean };
}

const OptimizedReelItem = memo(function OptimizedReelItem({ 
  post, 
  isActive, 
  onReaction, 
  onViewTracked,
  batchFollowingStatus,
  onBatchFollowingUpdate,
  initialSeek
}: OptimizedReelItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(() => getPostVideoUrl(post) || '');
  const [isVertical, setIsVertical] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);

  const { user } = useAuth();
  const { addComment } = usePostComments(post.id);
  const { reactionCount } = useUnifiedReactions(post.id);

  // Control de volumen mejorado
  const { volume, isMuted, showSlider, toggleMute, changeVolume, showSliderTemporarily } = useVolumeControl(videoRef);

  // Auto-play cuando está visible
  const { isIntersecting } = useIntersectionObserver(containerRef, {
    threshold: 0.7, // 70% visible para activar
  });

  useEffect(() => {
    if (!isActive || !isIntersecting || !videoRef.current) return;
    if (!currentSrc || hasError) return;
    if (isReady === false) return;

    if (startTimeRef.current === null) {
      const now = Date.now();
      startTimeRef.current = now;
      setStartTime(now);
    }

    // Autoplay policy: play muted first, then unmute if needed.
    const v = videoRef.current;
    try {
      v.muted = true;
    } catch {
      // ignore
    }

    v.play().catch(() => {});
  }, [isActive, isIntersecting, currentSrc, hasError, isReady]);

  useEffect(() => {
    if ((videoRef.current && (!isActive || !isIntersecting)) || hasError) {
      const v = videoRef.current;
      if (!v) return;
      v.pause();

      // Track view duration
      if (startTimeRef.current) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (duration > 1) {
          onViewTracked(post.id, duration);
        }
        startTimeRef.current = null;
        setStartTime(null);
      }
    }
  }, [isActive, isIntersecting, hasError, post.id, onViewTracked]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (!isActive) return;
    if (hasError) return;
    if (!isReady) return;

    const v = videoRef.current;
    if (!isMuted) {
      try {
        v.muted = false;
      } catch {
        // ignore
      }
    }
  }, [isActive, hasError, isMuted, isReady]);

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

  // Manejar errores de video - capturar error exacto del elemento video
  const handleVideoError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const error = video.error;
    console.error('❌ Error nativo del elemento de video:', {
      src: currentSrc,
      error: error ? {
        code: error.code,
        message: error.message,
        MEDIA_ERR_ABORTED: error.MEDIA_ERR_ABORTED,
        MEDIA_ERR_NETWORK: error.MEDIA_ERR_NETWORK,
        MEDIA_ERR_DECODE: error.MEDIA_ERR_DECODE,
        MEDIA_ERR_SRC_NOT_SUPPORTED: error.MEDIA_ERR_SRC_NOT_SUPPORTED,
      } : 'No error object',
      readyState: video.readyState,
      networkState: video.networkState,
    });
    setHasError(true);
  }, [currentSrc]);

  // Reset error cuando cambia el post
  useEffect(() => {
    setHasError(false);
  }, [post.media_url, post.media_urls, post.media_type]);

  useEffect(() => {
    setIsReady(false);
  }, [post.media_url, post.media_urls, post.media_type]);

  useEffect(() => {
    setCurrentSrc(getPostVideoUrl(post) || '');
  }, [post.media_url, post.media_urls, post.media_type]);

  useEffect(() => {
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
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        const now = Date.now();
        startTimeRef.current = now;
        setStartTime(now);
      } else {
        videoRef.current.pause();
      }
    }
  }, []);

  // Doble click para mute/unmute, single click para play/pause
  const handleVideoClick = useDoubleClick(
    togglePlay,
    () => {
      toggleMute();
      showSliderTemporarily();
    },
    300
  );

  const handleLike = () => {
    onReaction(post.id, 'love');
  };

  const contentForMentions = post.content || "";

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-gray-950 flex items-center justify-center snap-start overflow-hidden"
    >
      {/* Video layer */}
      <div className="absolute inset-0 z-0">
        {hasError ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold mb-2">Video no disponible</h3>
              <p className="text-gray-400">No se pudo cargar este video</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setHasError(false);
                  setIsReady(false);
                  setCurrentSrc(getPostVideoUrl(post) || '');
                }}
              >
                Reintentar
              </Button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={currentSrc || undefined}
            className={
              isVertical
                ? "w-full h-full object-cover bg-gray-950"
                : "w-full h-full object-contain bg-gray-950"
            }
            controls={false}
            loop
            playsInline
            muted={isMuted}
            preload="metadata"
            onClick={isVertical ? handleVideoClick : undefined}
            onError={handleVideoError}
            onLoadedMetadata={() => {
              try {
                const v = videoRef.current;
                if (!v) return;
                const w = v.videoWidth || 1;
                const h = v.videoHeight || 1;
                setIsVertical(h / w >= 1.25);
                console.log('🎬 Video loaded metadata:', { w, h, src: currentSrc });
              } catch {
                // ignore
              }
            }}
            onLoadStart={() => {
              console.log('🎬 Video load start:', currentSrc);
              setIsReady(false);
            }}
            onCanPlay={() => {
              console.log('🎬 Video can play:', currentSrc);
              setIsReady(true);
            }}
            onLoadedData={() => {
              console.log('🎬 Video loaded data:', currentSrc);
              setIsReady(true);
            }}
          />
        )}
      </div>

      {!hasError && !isReady && currentSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950/40 z-10">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {/* Overlay layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Tap hint / play */}
        {!isPlaying && isVertical && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 h-20 w-20 pointer-events-auto border border-white/30 rounded-full"
              onClick={togglePlay}
            >
              <Play className="h-10 w-10 ml-1" />
            </Button>
          </div>
        )}

        {/* Volume Slider */}
        <div className="pointer-events-auto">
          <VolumeSlider
            volume={volume}
            isMuted={isMuted}
            show={showSlider}
            onChange={changeVolume}
            onMuteToggle={toggleMute}
          />
        </div>

        {/* Right actions */}
        <div className="absolute right-4 bottom-20 mb-[80px] flex flex-col gap-4 items-center pointer-events-auto z-30">
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/20 flex items-center justify-center">
              <Eye className="h-6 w-6" />
            </div>
            <span className="text-white text-xs mt-1 font-medium">{Number(post.views_count || 0)}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
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
              className="bg-transparent border-0"
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
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
            <span className="text-white text-xs mt-1 font-medium">{Number(post.comments_count || 0)}</span>
          </div>

          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowShare(true);
                onReaction(post.id, 'share');
              }}
              className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/20"
            >
              <Share2 className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Bottom-left user info */}
        <div className="absolute left-0 right-0 bottom-0 p-4 pb-[80px] bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20">
          <div className="max-w-[calc(100%-5rem)]">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10 border-2 border-white">
                <AvatarImage src={post.profiles?.avatar_url} alt={post.profiles?.username} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {(post.profiles?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 text-white">
                <Link
                  to={`/profile/${post.user_id}`}
                  className="font-semibold text-sm truncate -mt-0.5 hover:underline pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.profiles?.username || 'Usuario'}
                </Link>
                <span className="text-xs text-gray-300">
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: es
                  })}
                </span>
              </div>

              {post.user_id && (
                <div className="pointer-events-auto">
                  <FollowButton
                    targetUserId={post.user_id}
                    size="sm"
                    batchFollowingStatus={batchFollowingStatus}
                    onBatchFollowingUpdate={onBatchFollowingUpdate}
                  />
                </div>
              )}
            </div>

            {contentForMentions && (
              <MentionsText
                content={contentForMentions}
                className="text-sm text-gray-100 whitespace-pre-wrap break-words line-clamp-3 -mt-0.5"
              />
            )}
          </div>
        </div>
      </div>

      <Drawer open={showComments} onOpenChange={setShowComments}>
        <DrawerContent className="max-h-[80svh]">
          <DrawerTitle className="sr-only">Comentarios del reel</DrawerTitle>
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
          <div className="overflow-y-auto scrollbar-hide">
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

interface OptimizedReelsInfiniteViewerProps {
  posts: Post[];
  onReaction: (postId: string, type: string) => void;
  onViewTracked: (postId: string, duration: number) => void;
  initialPostId?: string;
  initialPlayback?: { postId: string; time: number; muted?: boolean };
}

export const OptimizedReelsInfiniteViewer = memo(function OptimizedReelsInfiniteViewer({ 
  posts, 
  onReaction, 
  onViewTracked,
  initialPostId,
  initialPlayback
}: OptimizedReelsInfiniteViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialPostId) return;
    const index = posts.findIndex((p) => p.id === initialPostId);
    if (index >= 0) setCurrentIndex(index);
  }, [initialPostId, posts]);

  // Optimización: batch following status para todos los autores de reels
  const authorIds = posts.flatMap((post) => (post.user_id ? [post.user_id] : []));
  const { 
    getFollowingStatus, 
    updateFollowingStatus, 
    isLoading: batchLoading 
  } = useBatchFollowingStatus(authorIds);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' && currentIndex > 0) {
        e.preventDefault();
        setCurrentIndex(prev => prev - 1);
      } else if (e.code === 'ArrowDown' && currentIndex < posts.length - 1) {
        e.preventDefault();
        setCurrentIndex(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, posts.length]);

  // Scroll to current reel
  useEffect(() => {
    if (containerRef.current) {
      const targetElement = containerRef.current.children[currentIndex] as HTMLElement;
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  }, [currentIndex]);

  // Keep currentIndex in sync with user scroll (snap)
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = el.clientHeight || 1;
    const idx = Math.round(el.scrollTop / h);
    const next = Math.max(0, Math.min(posts.length - 1, idx));
    if (next !== currentIndex) setCurrentIndex(next);
  }, [currentIndex, posts.length]);

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-muted-foreground">
        <div className="text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-xl font-semibold mb-2">No hay videos disponibles</h3>
          <p>Sé el primero en compartir un video creativo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-gray-950 overflow-hidden flex items-center justify-center">
      <div className="h-full aspect-[9/16] w-full max-w-[520px] rounded-2xl overflow-hidden bg-gray-950 flex items-center justify-center">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="w-full h-full relative flex flex-col overflow-y-auto snap-y snap-mandatory"
        >
          {posts.map((post, index) => (
            <div
              key={post.id}
              className="w-full h-full flex items-center justify-center snap-start bg-gray-950 shrink-0"
            >
              <OptimizedReelItem
                post={post}
                isActive={index === currentIndex}
                onReaction={onReaction}
                onViewTracked={onViewTracked}
                batchFollowingStatus={post.user_id ? getFollowingStatus(post.user_id) : undefined}
                onBatchFollowingUpdate={updateFollowingStatus}
                initialSeek={
                  initialPlayback && initialPlayback.postId === post.id
                    ? { time: initialPlayback.time, muted: initialPlayback.muted }
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});