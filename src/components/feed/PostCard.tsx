import { MessageCircle, Share2, MoreHorizontal, User, Briefcase, School, ChevronDown, ChevronUp, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LikeButton } from './LikeButton';
import { InstagramAudioPlayer } from '@/components/media/InstagramAudioPlayer';
import { useUser } from '@/hooks/use-user';
import { Post } from './PostFeed';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { MediaLightbox, type LightboxMediaItem } from '@/components/post/MediaLightbox';
import { useFullscreenVideo } from '@/components/video/FullscreenVideoContext';

export interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  // Format the creation date
  const formattedDate = new Date(post.created_at).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const { user } = useUser();
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(0);
  
  // Get profile data
  const { username, avatar_url, career, institution } = post.profiles;

  // Determine if media is an image or video
  const isVideo = post.media_url?.match(/\.(mp4|webm|mov|ogg)$/i) || 
                  ((post as any).media_urls && (post as any).media_urls.some((url: string) => url.match(/\.(mp4|webm|mov|ogg)$/i)));
  const isImage = post.media_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
                  ((post as any).media_urls && (post as any).media_urls.some((url: string) => url.match(/\.(jpg|jpeg|png|gif|webp)$/i)));
  
  // Get the primary media URL (for projects, use first video if exists)
  const primaryMediaUrl = post.media_url || 
                          (((post as any).media_urls && (post as any).media_urls.find((url: string) => url.match(/\.(mp4|webm|mov|ogg)$/i))) ||
                           ((post as any).media_urls && (post as any).media_urls[0]));

  const mediaItems: LightboxMediaItem[] = useMemo(() => {
    const urls = [
      ...(Array.isArray((post as any).media_urls) ? (post as any).media_urls : []),
      ...(post.media_url ? [post.media_url] : [])
    ].filter(Boolean) as string[];

    const uniq = Array.from(new Set(urls));
    return uniq.map((url) => {
      const isVid = Boolean(url.match(/\.(mp4|webm|mov|ogg)$/i));
      return { url, type: isVid ? 'video' : 'image' };
    });
  }, [post]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStart, setLightboxStart] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fullscreenVideo = useFullscreenVideo();

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isVerticalVideo, setIsVerticalVideo] = useState(true);

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  const openFullscreenFromFeed = (v?: HTMLVideoElement | null) => {
    const video = v ?? videoRef.current;
    try {
      video?.pause();
    } catch {
      // ignore
    }
    fullscreenVideo.open({
      initialPostId: post.id,
      initialUrl: primaryMediaUrl,
      initialTime: video?.currentTime ?? 0,
      muted: video?.muted ?? true,
    });
  };

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (v.paused) {
        await v.play();
      } else {
        v.pause();
      }
    } catch {
      // ignore
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = !v.muted;
      setIsMuted(v.muted);
    } catch {
      // ignore
    }
  };

  const changeVolume = (next: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.min(1, Math.max(0, next));
    try {
      v.volume = clamped;
      setVolume(clamped);
      if (clamped > 0 && v.muted) {
        v.muted = false;
        setIsMuted(false);
      }
      if (clamped === 0 && !v.muted) {
        v.muted = true;
        setIsMuted(true);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const inView = Boolean(entries[0]?.isIntersecting);
        const v = videoRef.current;
        if (!v) return;
        if (!inView) {
          try {
            v.pause();
            v.currentTime = 0;
          } catch {
            // ignore
          }
          return;
        }
        try {
          v.muted = true;
          setIsMuted(true);
          v.play().catch(() => {});
        } catch {
          // ignore
        }
      },
      { threshold: 0.6 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [primaryMediaUrl, isVideo]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoadedMetadata = () => {
      setDuration(Number.isFinite(v.duration) ? v.duration : 0);
      try {
        const w = v.videoWidth || 1;
        const h = v.videoHeight || 1;
        setIsVerticalVideo(h / w >= 1.25);
      } catch {
        // ignore
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime || 0);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => {
      setIsMuted(Boolean(v.muted));
      setVolume(typeof v.volume === 'number' ? v.volume : 1);
    };

    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('volumechange', onVolumeChange);

    onLoadedMetadata();
    onTimeUpdate();
    onVolumeChange();

    return () => {
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('volumechange', onVolumeChange);
    };
  }, [primaryMediaUrl]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              {avatar_url ? (
                <AvatarImage src={avatar_url} alt={`@${username}`} />
              ) : (
                <AvatarFallback>
                  <span className="text-gray-400">
                    {username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h3 className="font-bold text-[#050505] dark:text-white [.tech_&]:text-white truncate">
                  @{username}
                </h3>
                <span className="mx-1 text-gray-400">·</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formattedDate}
                </span>
              </div>
              {(career || institution) && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {career && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      <span>{career}</span>
                    </span>
                  )}
                  {institution && (
                    <span className="flex items-center gap-1">
                      <School className="h-3 w-3" />
                      <span>{institution}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">
          {post.content}
        </p>
      </div>

      {/* Media */}
      {primaryMediaUrl && (
        <div ref={containerRef} className="border-t border-b border-gray-100 dark:border-gray-700">
          {isImage && (
            <img
              src={primaryMediaUrl}
              alt="Post media"
              className="w-full h-auto max-h-[500px] object-cover"
              loading="lazy"
              onClick={() => {
                setLightboxStart(0);
                setLightboxOpen(true);
              }}
            />
          )}
          {isVideo && (
            <div className="relative w-full bg-black">
              <video
                ref={videoRef}
                src={primaryMediaUrl}
                className={
                  isVerticalVideo
                    ? "w-full max-h-[500px] cursor-pointer object-cover"
                    : "w-full max-h-[500px] cursor-pointer object-contain"
                }
                muted
                playsInline
                loop
                preload="metadata"
                onClick={() => {
                  try {
                    videoRef.current?.pause();
                  } catch {
                    // ignore
                  }
                  setLightboxStart(0);
                  setLightboxOpen(true);
                }}
              >
                Tu navegador no soporta el elemento de video.
              </video>

              {/* Player bar (estilo Facebook) */}
              <div
                className="absolute left-0 right-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-8 w-8 inline-flex items-center justify-center text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      void togglePlay();
                    }}
                    aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>

                  <div className="text-xs text-white tabular-nums min-w-[84px]">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>

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
                    className="flex-1 h-1 accent-white"
                  />

                  <button
                    type="button"
                    className="h-8 w-8 inline-flex items-center justify-center text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                  >
                    {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>

                  <button
                    type="button"
                    className="h-8 w-8 inline-flex items-center justify-center text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFullscreenFromFeed(videoRef.current);
                    }}
                    aria-label="Pantalla completa"
                  >
                    <Maximize className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <MediaLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={mediaItems}
        startIndex={lightboxStart}
      />

      {/* 🎵 Audio Player */}
      {(post as any).audio_url && (
        <div className="border-b border-gray-100 dark:border-gray-700">
          <InstagramAudioPlayer
            audioUrl={(post as any).audio_url}
            audioMetadata={(post as any).audio_metadata}
            autoPlay={false}
            loop={false}
          />
        </div>
      )}

      {/* Footer - Interaction */}
      <div className="px-4 py-3">
        {/* Like, Comment, Share */}
        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
          <LikeButton 
            postId={post.id} 
            userId={user?.id} 
            className="flex-1 justify-start" 
          />
          <Button 
            variant="ghost" 
            className="flex items-center gap-1"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm">
              {commentCount > 0 ? commentCount : ''} Comentar
            </span>
            {showComments ? (
              <ChevronUp className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </Button>
          <Button variant="ghost" className="flex items-center gap-1">
            <Share2 className="h-5 w-5" />
            <span className="text-sm">Compartir</span>
          </Button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 space-y-3">
          <CommentList 
            postId={post.id} 
            className="max-h-60 overflow-y-auto"
          />
          {user && (
            <CommentForm 
              postId={post.id} 
              userId={user.id}
              onAddComment={async (content) => {
                // The CommentList will automatically update via the hook
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default PostCard;
