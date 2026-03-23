import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Play, Volume2, VolumeX, Heart, MessageCircle, Share2 } from "lucide-react";
import { Post } from "@/types/post";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { usePostReactions } from "@/hooks/posts/use-post-reactions";
import { FollowButton } from "@/components/FollowButton";
import { useBatchFollowingStatus } from "@/hooks/use-batch-following-status";
import { useDoubleClick } from "@/hooks/use-double-click";
import { useVolumeControl } from "@/hooks/reels/use-volume-control";
import { VolumeSlider } from "./VolumeSlider";
import { MentionsText } from "@/components/post/MentionsText";
import { getPostVideoUrl } from "@/lib/hybrid-url";
import { useReelComments } from "@/hooks/reels/use-reel-comments";
import { Comments } from "@/components/post/Comments";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

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
  const [currentSrc, setCurrentSrc] = useState(() => getPostVideoUrl(post) || post.media_url || '');
  const [isVertical, setIsVertical] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);

  const { userReaction, onReaction: handleReaction } = usePostReactions(post.id);

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
    handleCancelReply,
  } = useReelComments(post.id);
  
  // Control de volumen mejorado
  const { volume, isMuted, showSlider, toggleMute, changeVolume, showSliderTemporarily } = useVolumeControl(videoRef);

  // Auto-play cuando está visible
  const { isIntersecting } = useIntersectionObserver(containerRef, {
    threshold: 0.7, // 70% visible para activar
  });

  useEffect(() => {
    if (isActive && isIntersecting && videoRef.current) {
      if (startTimeRef.current === null) {
        const now = Date.now();
        startTimeRef.current = now;
        setStartTime(now);
      }
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current && (!isActive || !isIntersecting)) {
      videoRef.current.pause();

      // Track view duration
      if (startTimeRef.current) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (duration > 1) { // Solo trackear si vio más de 1 segundo
          onViewTracked(post.id, duration);
        }
        startTimeRef.current = null;
        setStartTime(null);
      }
    }
  }, [isActive, isIntersecting, post.id, onViewTracked]);

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
  }, []);

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
    handleReaction(post.id, 'love');
    onReaction(post.id, 'love');
  };

  const contentForMentions = post.content || "";

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[100svh] bg-black flex items-center justify-center snap-start"
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
                  setCurrentSrc(post.media_url);
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
            className={isVertical ? "w-full h-full object-cover" : "w-full h-full object-contain"}
            controls={!isVertical}
            loop
            playsInline
            muted={isMuted}
            onClick={isVertical ? handleVideoClick : undefined}
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
            onLoadStart={() => {}} // Reduce console spam
            onCanPlay={() => {}} // Reduce console spam
          />
        )}
      </div>

      {/* Overlay layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Tap hint / play */}
        {!isPlaying && isVertical && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 text-white hover:bg-black/70 h-16 w-16 pointer-events-auto"
              onClick={togglePlay}
            >
              <Play className="h-8 w-8" />
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
        <div className="absolute right-3 bottom-24 flex flex-col gap-6 items-center pointer-events-auto z-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
              showSliderTemporarily();
            }}
            className="h-11 w-11 rounded-full bg-black/50 text-white hover:bg-black/70"
            aria-label={isMuted ? "Activar sonido" : "Silenciar"}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>

          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              size="icon"
              className={`h-12 w-12 rounded-full ${
                userReaction === 'love'
                  ? 'bg-transparent text-red-500'
                  : 'bg-transparent text-white hover:bg-white/10'
              }`}
              onClick={handleLike}
            >
              <Heart className={`h-7 w-7 ${userReaction === 'love' ? 'fill-current' : ''}`} />
            </Button>
            <span className="text-white text-xs mt-1">{post.reactions_count || 0}</span>
          </div>

          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-transparent text-white hover:bg-white/10"
              onClick={() => {
                setShowComments(true);
                onReaction(post.id, 'comment');
              }}
            >
              <MessageCircle className="h-7 w-7" />
            </Button>
            <span className="text-white text-xs mt-1">{post.comments_count || 0}</span>
          </div>

          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-transparent text-white hover:bg-white/10"
              onClick={() => onReaction(post.id, 'share')}
            >
              <Share2 className="h-7 w-7" />
            </Button>
          </div>
        </div>

        {/* Bottom-left user info */}
        <div className="absolute left-0 right-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
          <div className="max-w-[calc(100%-5rem)]">
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="h-10 w-10 border-2 border-white">
                <AvatarImage src={post.profiles?.avatar_url} alt={post.profiles?.username} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {(post.profiles?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 text-white">
                <h3 className="font-semibold text-sm truncate">{post.profiles?.username || 'Usuario'}</h3>
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
            <Comments
              postId={post.id}
              comments={comments}
              onReaction={handleCommentLike}
              onReply={handleReply}
              onSubmitComment={handleSubmitComment}
              onDeleteComment={handleDeleteComment}
              onLoadReplies={loadReplies}
              newComment={newComment}
              onNewCommentChange={setNewComment}
              replyTo={replyTo}
              onCancelReply={handleCancelReply}
              showComments={true}
              commentImage={commentImage}
              setCommentImage={setCommentImage}
              postAuthorId={post.user_id}
              totalCommentsCount={(post as any).comments_count ?? (post as any).comments?.count}
            />
          </div>
        </DrawerContent>
      </Drawer>
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
  const authorIds = posts.map(post => post.user_id).filter(Boolean);
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
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [currentIndex]);

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
    <div 
      ref={containerRef}
      className="w-full h-screen overflow-y-auto snap-y snap-mandatory scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {posts.map((post, index) => (
        <OptimizedReelItem
          key={post.id}
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
      ))}
    </div>
  );
});