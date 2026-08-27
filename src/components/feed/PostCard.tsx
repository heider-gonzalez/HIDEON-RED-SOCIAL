import { MessageCircle, Share2, MoreHorizontal, User, Briefcase, School, ChevronDown, ChevronUp, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useReducer, useCallback } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { LikeButton } from './LikeButton';
import { InstagramAudioPlayer } from '@/components/media/InstagramAudioPlayer';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { useUser } from '@/hooks/use-user';
import { Post } from './PostFeed';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { MediaLightbox, type LightboxMediaItem } from '@/components/post/MediaLightbox';
import { useFullscreenVideo } from '@/components/video/FullscreenVideoContext';
import { normalizePostContent } from '@/utils/post-content';
import { getHybridUrl } from '@/lib/hybrid-url';

export interface PostCardProps {
  post: Post;
}

// Consolidated state for better performance
interface PostCardState {
  showComments: boolean;
  commentCount: number;
  lightboxOpen: boolean;
  lightboxStart: number;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  isMuted: boolean;
  volume: number;
  showVolumeUI: boolean;
  isVerticalVideo: boolean;
}

type PostCardAction = 
  | { type: 'TOGGLE_COMMENTS' }
  | { type: 'SET_COMMENT_COUNT'; payload: number }
  | { type: 'OPEN_LIGHTBOX'; payload: number }
  | { type: 'CLOSE_LIGHTBOX' }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TOGGLE_VOLUME_UI' }
  | { type: 'SET_VERTICAL_VIDEO'; payload: boolean };

const initialState: PostCardState = {
  showComments: false,
  commentCount: 0,
  lightboxOpen: false,
  lightboxStart: 0,
  isPlaying: false,
  duration: 0,
  currentTime: 0,
  isMuted: (() => {
    try {
      return localStorage.getItem('feed_video_muted') !== 'false';
    } catch {
      return true;
    }
  })(),
  volume: (() => {
    try {
      const saved = localStorage.getItem('feed_video_volume');
      const n = saved ? Number(saved) : 0.5;
      return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;
    } catch {
      return 0.5;
    }
  })(),
  showVolumeUI: false,
  isVerticalVideo: true,
};

function postCardReducer(state: PostCardState, action: PostCardAction): PostCardState {
  switch (action.type) {
    case 'TOGGLE_COMMENTS':
      return { ...state, showComments: !state.showComments };
    case 'SET_COMMENT_COUNT':
      return { ...state, commentCount: action.payload };
    case 'OPEN_LIGHTBOX':
      return { ...state, lightboxOpen: true, lightboxStart: action.payload };
    case 'CLOSE_LIGHTBOX':
      return { ...state, lightboxOpen: false };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    case 'TOGGLE_MUTE':
      return { ...state, isMuted: !state.isMuted };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'TOGGLE_VOLUME_UI':
      return { ...state, showVolumeUI: !state.showVolumeUI };
    case 'SET_VERTICAL_VIDEO':
      return { ...state, isVerticalVideo: action.payload };
    default:
      return state;
  }
}

export function PostCard({ post }: PostCardProps) {
  // Format the creation date
  const formattedDate = useMemo(() => new Date(post.created_at).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }), [post.created_at]);

  const { user } = useUser();
  const [state, dispatch] = useReducer(postCardReducer, initialState);
  
  // Get profile data
  const { username, avatar_url, career, institution } = post.profiles;

  // Determine if media is an image or video
  const isVideo = useMemo(() => 
    post.media_url?.match(/\.(mp4|webm|mov|ogg)$/i) || 
    ((post as any).media_urls && (post as any).media_urls.some((url: string) => url.match(/\.(mp4|webm|mov|ogg)$/i))),
    [post.media_url, (post as any).media_urls]
  );
  
  const isImage = useMemo(() => 
    post.media_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
    ((post as any).media_urls && (post as any).media_urls.some((url: string) => url.match(/\.(jpg|jpeg|png|gif|webp)$/i))),
    [post.media_url, (post as any).media_urls]
  );
  
  // Get the primary media URL (for projects, use first video if exists)
  const primaryMediaUrl = useMemo(() => {
    return post.media_url ||
                          (((post as any).media_urls && (post as any).media_urls.find((url: string) => url.match(/\.(mp4|webm|mov|ogg)$/i))) ||
                           ((post as any).media_urls && (post as any).media_urls[0]));

  }, [post.media_url, (post as any).media_urls]);

  const primaryMediaSrc = useMemo(() => getHybridUrl(primaryMediaUrl) || null, [primaryMediaUrl]);

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

  const cleanContent = useMemo(() => normalizePostContent(post.content), [post.content]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fullscreenVideo = useFullscreenVideo();
  const userVolumeTouchedRef = useRef(false);

  const formatTime = useCallback((seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }, []);

  const openFullscreenFromFeed = useCallback((v?: HTMLVideoElement | null) => {
    const video = v ?? videoRef.current;
    try {
      video?.pause();
    } catch {
      // ignore
    }
    fullscreenVideo.open({
      initialPostId: post.id,
      initialUrl: primaryMediaSrc || primaryMediaUrl,
      initialTime: video?.currentTime ?? 0,
      muted: video?.muted ?? true,
    });
  }, [fullscreenVideo, post.id, primaryMediaSrc, primaryMediaUrl]);

  const togglePlay = useCallback(async () => {
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
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = !v.muted;
      dispatch({ type: 'TOGGLE_MUTE' });
      userVolumeTouchedRef.current = true;
      try {
        localStorage.setItem('feed_video_muted', String(v.muted));
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  }, []);

  const changeVolume = useCallback((next: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.min(1, Math.max(0, next));
    try {
      v.volume = clamped;
      dispatch({ type: 'SET_VOLUME', payload: clamped });
      userVolumeTouchedRef.current = true;
      try {
        localStorage.setItem('feed_video_volume', String(clamped));
        if (clamped > 0) localStorage.setItem('feed_video_muted', 'false');
      } catch {
        // ignore
      }
      if (clamped > 0 && v.muted) {
        v.muted = false;
        dispatch({ type: 'TOGGLE_MUTE' });
      }
      if (clamped === 0 && !v.muted) {
        v.muted = true;
        dispatch({ type: 'TOGGLE_MUTE' });
      }
    } catch {
      // ignore
    }
  }, []);

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
          if (!userVolumeTouchedRef.current) {
            v.muted = state.isMuted;
            v.volume = state.volume;
          }
          v.play().catch(() => {});
        } catch {
          // ignore
        }
      },
      { threshold: 0.6 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [primaryMediaUrl, isVideo, state.isMuted, state.volume, userVolumeTouchedRef]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoadedMetadata = () => {
      dispatch({ type: 'SET_DURATION', payload: Number.isFinite(v.duration) ? v.duration : 0 });
      try {
        const w = v.videoWidth || 1;
        const h = v.videoHeight || 1;
        dispatch({ type: 'SET_VERTICAL_VIDEO', payload: h / w >= 1.25 });
      } catch {
        // ignore
      }
    };

    const onTimeUpdate = () => {
      dispatch({ type: 'SET_CURRENT_TIME', payload: v.currentTime || 0 });
    };

    const onPlay = () => dispatch({ type: 'SET_PLAYING', payload: true });
    const onPause = () => dispatch({ type: 'SET_PLAYING', payload: false });
    const onVolumeChange = () => {
      dispatch({ type: 'TOGGLE_MUTE' });
      dispatch({ type: 'SET_VOLUME', payload: typeof v.volume === 'number' ? v.volume : 1 });
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
  }, [primaryMediaUrl, dispatch]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.volume = state.volume;
      v.muted = state.isMuted;
    } catch {
      // ignore
    }
  }, [state.volume, state.isMuted, videoRef]);

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
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
          {cleanContent}
        </p>
      </div>

      {/* Media */}
      {primaryMediaUrl && (
        <div ref={containerRef} className="border-t border-b border-gray-100 dark:border-gray-700">
          {isImage && (
            <OptimizedImage
              src={primaryMediaSrc || ''}
              alt="Post media"
              className="w-full h-auto max-h-[500px] object-cover"
              loading="lazy"
              placeholder="blur"
              onClick={() => {
                dispatch({ type: 'OPEN_LIGHTBOX', payload: 0 });
              }}
            />
          )}
          {isVideo && (
            <div className="relative w-full bg-zinc-950">
              <video
                ref={videoRef}
                src={primaryMediaSrc || undefined}
                className={
                  state.isVerticalVideo
                    ? "w-full max-h-[500px] cursor-pointer object-cover"
                    : "w-full max-h-[500px] cursor-pointer object-contain"
                }
                muted={state.isMuted}
                playsInline
                loop
                preload="none" // Changed from metadata to none for better performance
                onClick={() => {
                  try {
                    const v = videoRef.current;
                    if (!v) return;
                    if (v.paused) {
                      v.play().catch(() => {});
                    } else {
                      v.pause();
                    }
                  } catch {
                    // ignore
                  }
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
                    aria-label={state.isPlaying ? 'Pausar' : 'Reproducir'}
                  >
                    {state.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>

                  <div className="text-xs text-white tabular-nums min-w-[84px]">
                    {formatTime(state.currentTime)} / {formatTime(state.duration)}
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={state.duration || 0}
                    step={0.1}
                    value={Math.min(state.currentTime, state.duration || 0)}
                    onChange={(e) => {
                      const v = videoRef.current;
                      if (!v) return;
                      const t = Number(e.target.value);
                      try {
                        v.currentTime = t;
                        dispatch({ type: 'SET_CURRENT_TIME', payload: t });
                      } catch {
                        // ignore
                      }
                    }}
                    className="flex-1 h-1 accent-white"
                    aria-label="Tiempo de video"
                  />

                  <div
                    className="relative"
                    onMouseEnter={() => dispatch({ type: 'TOGGLE_VOLUME_UI' })}
                    onMouseLeave={() => dispatch({ type: 'TOGGLE_VOLUME_UI' })}
                  >
                    <button
                      type="button"
                      className="h-8 w-8 inline-flex items-center justify-center text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute();
                      }}
                      aria-label={state.isMuted ? 'Activar sonido' : 'Silenciar'}
                    >
                      {state.isMuted || state.volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>

                    {state.showVolumeUI && (
                      <div
                        className="absolute bottom-10 right-0 z-30 rounded-lg bg-zinc-950/70 p-3 backdrop-blur-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-col items-center gap-2 h-28">
                          <div className="text-[10px] text-white/80 tabular-nums">
                            {Math.round((state.isMuted ? 0 : state.volume) * 100)}%
                          </div>
                          <div className="h-full flex items-center">
                            <Slider
                              value={[Math.round((state.isMuted ? 0 : state.volume) * 100)]}
                              onValueChange={(v) => changeVolume((v[0] ?? 0) / 100)}
                              max={100}
                              step={1}
                              orientation="vertical"
                              className="h-24"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

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
        isOpen={state.lightboxOpen}
        onClose={() => dispatch({ type: 'CLOSE_LIGHTBOX' })}
        items={mediaItems}
        startIndex={state.lightboxStart}
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
        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 gap-1">
          <LikeButton 
            postId={post.id} 
            userId={user?.id} 
            className="flex-1 justify-start" 
          />
          <Button 
            variant="ghost"
            className="flex items-center gap-1 group/comment transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/60 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            onClick={() => dispatch({ type: 'TOGGLE_COMMENTS' })}
            aria-pressed={state.showComments}
          >
            <MessageCircle className="h-5 w-5 transition-transform duration-200 group-hover/comment:scale-110 group-active/comment:scale-95" />
            <span className="text-sm font-medium transition-colors duration-200 group-hover/comment:text-blue-500">
              {state.commentCount > 0 ? state.commentCount : ''} Comentar
            </span>
            {state.showComments ? (
              <ChevronUp className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </Button>
          <Button 
            variant="ghost"
            className="flex items-center gap-1 group/share transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/60 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          >
            <Share2 className="h-5 w-5 transition-transform duration-200 group-hover/share:scale-110 group-active/share:scale-95" />
            <span className="text-sm font-medium transition-colors duration-200 group-hover/share:text-emerald-500">Compartir</span>
          </Button>
        </div>
      </div>

      {/* Comments Section */}
      {state.showComments && (
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
