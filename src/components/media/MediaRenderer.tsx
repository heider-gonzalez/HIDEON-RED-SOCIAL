import { cn } from "@/lib/utils";
import { getHybridUrl } from "@/lib/hybrid-url";
import type { Ref, SyntheticEvent } from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";

type MediaType = "image" | "video";

function inferMediaType(url: string): MediaType {
  const u = url.toLowerCase();
  if (u.match(/\.(mp4|webm|ogg|mov|avi|wmv|flv|m4v)(\?|#|$)/)) return "video";
  return "image";
}

export type MediaRendererProps = {
  url?: string | null;
  className?: string;
  onClick?: () => void;
  alt?: string;
  videoRef?: Ref<HTMLVideoElement>;
  onLoadedMetadata?: (e: SyntheticEvent<HTMLVideoElement, Event>) => void;
  stopPropagationOnClick?: boolean;
  autoPlay?: boolean;
  autoPlayOnView?: boolean;
  pauseOnOutOfView?: boolean;
  resetOnPause?: boolean;
  customControls?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  playsInline?: boolean;
};

export function MediaRenderer({
  url,
  className,
  onClick,
  alt = "media",
  videoRef,
  onLoadedMetadata,
  stopPropagationOnClick = false,
  autoPlay = false,
  autoPlayOnView = false,
  pauseOnOutOfView = true,
  resetOnPause = false,
  customControls = true,
  muted = true,
  loop = false,
  controls = false,
  playsInline = true,
}: MediaRendererProps) {
  // Convertir URL a URL híbrida
  const hybridUrl = getHybridUrl(url);
  
  if (!hybridUrl) return null;

  const type = inferMediaType(hybridUrl);
  const isVideo = type === "video";

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const effectiveMuted = useMemo(() => {
    return autoPlayOnView ? true : muted;
  }, [autoPlayOnView, muted]);

  const isCoarsePointer = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches;
    } catch {
      return false;
    }
  }, []);

  const [hovered, setHovered] = useState(false);
  const [tapControlsVisible, setTapControlsVisible] = useState(false);
  const tapHideTimerRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMutedLocal, setIsMutedLocal] = useState(effectiveMuted);
  const [volumeLocal, setVolumeLocal] = useState(() => {
    try {
      const saved = localStorage.getItem('feed_video_volume');
      const n = saved ? Number(saved) : 0.5;
      return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;
    } catch {
      return 0.5;
    }
  });
  const [showVolumeUI, setShowVolumeUI] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [currentVideoSrc, setCurrentVideoSrc] = useState(hybridUrl);

  // Manejar errores de video simple (sin fallback ya que las URLs son originales)
  const handleVideoError = useCallback(async () => {
    // Debug logging solo en desarrollo
    if (import.meta.env.DEV && !videoError) {
      console.debug('🔍 Video error en MediaRenderer:', currentVideoSrc);
    }
    
    // Marcar como error (solo una vez)
    if (!videoError) {
      setVideoError(true);
      // Debug logging solo en desarrollo
      if (import.meta.env.DEV) {
        console.debug('❌ Video no disponible en MediaRenderer:', currentVideoSrc);
      }
    }
  }, [currentVideoSrc, videoError]);

  // Resetear estado cuando cambia la URL
  useEffect(() => {
    setCurrentVideoSrc(hybridUrl);
    setVideoError(false);
  }, [hybridUrl]);

  const showTapControls = () => {
    if (!isCoarsePointer) return;
    setTapControlsVisible(true);
    if (tapHideTimerRef.current) window.clearTimeout(tapHideTimerRef.current);
    tapHideTimerRef.current = window.setTimeout(() => {
      setTapControlsVisible(false);
      tapHideTimerRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (tapHideTimerRef.current) {
        window.clearTimeout(tapHideTimerRef.current);
        tapHideTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    if (!isVideo) return;
    if (!autoPlayOnView && !autoPlay) return;

    let didPlay = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const inView = Boolean(entry?.isIntersecting);
        if (inView) {
          if (didPlay) return;
          didPlay = true;
          try {
            el.muted = true;
            el.play().catch(() => {});
          } catch {
            // ignore
          }
          return;
        }

        didPlay = false;
        if (!pauseOnOutOfView) return;
        try {
          el.pause();
          if (resetOnPause) el.currentTime = 0;
        } catch {
          // ignore
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [autoPlay, autoPlayOnView, isVideo, pauseOnOutOfView, resetOnPause]);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    if (!isVideo) return;

    const onLoaded = () => {
      setDuration(Number.isFinite(el.duration) ? el.duration : 0);
      setCurrentTime(Number.isFinite(el.currentTime) ? el.currentTime : 0);
      setIsMutedLocal(Boolean(el.muted));
      setVolumeLocal(typeof el.volume === 'number' ? el.volume : 1);
    };
    const onTime = () => setCurrentTime(Number.isFinite(el.currentTime) ? el.currentTime : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolume = () => {
      setIsMutedLocal(Boolean(el.muted));
      setVolumeLocal(typeof el.volume === 'number' ? el.volume : 1);
    };

    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('volumechange', onVolume);

    onLoaded();
    return () => {
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('volumechange', onVolume);
    };
  }, [isVideo, hybridUrl]);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    if (!isVideo) return;
    try {
      el.volume = volumeLocal;
      if (volumeLocal > 0 && el.muted && !effectiveMuted) {
        el.muted = false;
      }
    } catch {
      // ignore
    }
  }, [effectiveMuted, isVideo, volumeLocal]);

  const setVolume = (next: number) => {
    const el = localVideoRef.current;
    if (!el) return;
    const clamped = Math.min(1, Math.max(0, next));
    try {
      el.volume = clamped;
      setVolumeLocal(clamped);
      if (clamped > 0) {
        el.muted = false;
        setIsMutedLocal(false);
      } else {
        el.muted = true;
        setIsMutedLocal(true);
      }
      try {
        localStorage.setItem('feed_video_volume', String(clamped));
        localStorage.setItem('feed_video_muted', String(el.muted));
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  };

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  if (isVideo) {
    const showCustomControls = customControls && !controls;
    const controlsVisible = isCoarsePointer ? tapControlsVisible : hovered;
    return (
      <div
        className={cn("relative overflow-hidden", className)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onPointerDown={(e) => {
          if (!showCustomControls) return;
          if (e.pointerType === 'touch') {
            showTapControls();
          }
        }}
      >
        <video
          ref={(node) => {
            localVideoRef.current = node;
            if (typeof videoRef === "function") {
              videoRef(node);
            } else if (videoRef && typeof videoRef === "object") {
              (videoRef as any).current = node;
            }
          }}
          src={videoError ? undefined : currentVideoSrc}
          className={cn("w-full h-full object-contain", showCustomControls ? "" : undefined)}
          autoPlay={autoPlayOnView ? false : autoPlay}
          muted={effectiveMuted}
          loop={loop}
          controls={showCustomControls ? false : controls}
          playsInline={playsInline}
          preload="metadata"
          onLoadedMetadata={onLoadedMetadata}
          onError={handleVideoError}
          onClick={(e) => {
            if (stopPropagationOnClick) e.stopPropagation();
            if (showCustomControls) showTapControls();
            onClick?.();
          }}
        />

        {/* Fallback UI when video fails to load */}
        {videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <div className="text-center p-4">
              <div className="text-4xl mb-2">🎥</div>
              <div className="text-sm font-medium">Video no disponible</div>
              <div className="text-xs mt-1 opacity-75">El video no pudo cargarse</div>
            </div>
          </div>
        )}

        {showCustomControls && (
          <>
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 px-3 pb-3 pt-6 bg-gradient-to-t from-black/70 via-black/30 to-transparent transition-opacity",
              controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={(e) => {
              if (stopPropagationOnClick) e.stopPropagation();
            }}
            onPointerDown={() => {
              if (showCustomControls) showTapControls();
            }}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="h-8 w-8 inline-flex items-center justify-center text-white"
                onClick={(e) => {
                  if (stopPropagationOnClick) e.stopPropagation();
                  if (showCustomControls) showTapControls();
                  const v = localVideoRef.current;
                  if (!v) return;
                  if (v.paused) v.play().catch(() => {});
                  else v.pause();
                }}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>

              <div className="text-xs text-white tabular-nums min-w-[90px]">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={(e) => {
                  if (showCustomControls) showTapControls();
                  const v = localVideoRef.current;
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

              {!isCoarsePointer && (
                <div
                  className="relative"
                  onMouseEnter={() => setShowVolumeUI(true)}
                  onMouseLeave={() => setShowVolumeUI(false)}
                >
                  <button
                    type="button"
                    className="h-8 w-8 inline-flex items-center justify-center text-white"
                    onClick={(e) => {
                      if (stopPropagationOnClick) e.stopPropagation();
                      const v = localVideoRef.current;
                      if (!v) return;
                      try {
                        v.muted = !v.muted;
                        setIsMutedLocal(Boolean(v.muted));
                        try {
                          localStorage.setItem('feed_video_muted', String(v.muted));
                        } catch {
                          // ignore
                        }
                      } catch {
                        // ignore
                      }
                    }}
                    aria-label={isMutedLocal ? 'Activar sonido' : 'Silenciar'}
                  >
                    {isMutedLocal || volumeLocal === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>

                  {showVolumeUI && (
                    <div
                      className="absolute bottom-10 right-0 z-30 rounded-lg bg-black/70 p-3 backdrop-blur-sm"
                      onClick={(e) => {
                        if (stopPropagationOnClick) e.stopPropagation();
                      }}
                    >
                      <div className="flex flex-col items-center gap-2 h-28">
                        <div className="text-[10px] text-white/80 tabular-nums">
                          {Math.round((isMutedLocal ? 0 : volumeLocal) * 100)}%
                        </div>
                        <div className="h-full flex items-center">
                          <Slider
                            value={[Math.round((isMutedLocal ? 0 : volumeLocal) * 100)]}
                            onValueChange={(v) => setVolume((v[0] ?? 0) / 100)}
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
              )}
            </div>
          </div>
          </>
        )}
      </div>
    );
  }

  return (
    <img
      src={hybridUrl}
      alt={alt}
      className={cn("w-full h-full object-contain", className)}
      loading="lazy"
      decoding="async"
      onClick={(e) => {
        if (stopPropagationOnClick) e.stopPropagation();
        onClick?.();
      }}
    />
  );
}
