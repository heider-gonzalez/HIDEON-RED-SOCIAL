import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, Pause, Play, Volume2, VolumeX, Volume1 } from "lucide-react";
import { PostImage } from "@/components/ui/optimized-image";
import { MediaLightbox } from "./MediaLightbox";
import { useFullscreenVideo } from "@/components/video/FullscreenVideoContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { MediaRenderer } from "@/components/media/MediaRenderer";
import {
  getSoundEnabled,
  setNowPlayingVideoId,
  setSoundEnabled,
  subscribeNowPlayingVideoId,
  subscribeSoundEnabled,
} from "@/lib/media/global-media";
import type { Post } from "@/types/post";

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface MediaCarouselProps {
  mediaItems: MediaItem[];
  className?: string;
  audioUrl?: string;
  audioMetadata?: any | null;
  reelsPostId?: string;
  post?: Post;
}

export function MediaCarousel({ mediaItems, className = "", audioUrl, audioMetadata, reelsPostId, post }: MediaCarouselProps) {
  const fullscreenVideo = useFullscreenVideo();
  const isMobile = useIsMobile();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  const [isInView, setIsInView] = useState(false);

  const instanceIdRef = useRef<string>(
    typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function"
      ? (crypto as any).randomUUID()
      : `mc_${Math.random().toString(16).slice(2)}_${Date.now()}`
  );

  const [soundEnabled, setSoundEnabledState] = useState(() => getSoundEnabled());
  const [isMuted, setIsMuted] = useState(() => !getSoundEnabled());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volumeLocal, setVolumeLocal] = useState(1);
  const [isVerticalVideo, setIsVerticalVideo] = useState(true);

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  const hasAudio = Boolean(audioUrl);
  const clipStart = useMemo(() => {
    const s = Number(audioMetadata?.startTime ?? audioMetadata?.start_time ?? 0);
    return Number.isFinite(s) ? Math.max(0, s) : 0;
  }, [audioMetadata]);
  const clipEnd = useMemo(() => {
    const e = Number(audioMetadata?.endTime ?? audioMetadata?.end_time ?? 0);
    return Number.isFinite(e) && e > 0 ? e : null;
  }, [audioMetadata]);

  if (!mediaItems || mediaItems.length === 0) return null;

  const lightboxItems = useMemo(() => {
    return mediaItems;
  }, [mediaItems]);

  const openFullscreenActive = () => {
    const item = mediaItems[currentIndex];
    if (!item || item.type !== 'video') return;
    const v = videoRefs.current[currentIndex];
    try {
      v?.pause();
    } catch {
      // ignore
    }
    fullscreenVideo.open({
      initialPostId: reelsPostId,
      initialUrl: item.url,
      initialTime: v?.currentTime ?? 0,
      muted: v?.muted ?? true,
    });
  };

  const togglePlay = async () => {
    const v = videoRefs.current[currentIndex];
    if (!v) return;
    try {
      if (v.paused) {
        setNowPlayingVideoId(`${instanceIdRef.current}:${currentIndex}`);
        await v.play();
      } else {
        v.pause();
      }
    } catch {
      // ignore
    }
  };

  const toggleVideoMute = () => {
    const v = videoRefs.current[currentIndex];
    if (!v) return;
    try {
      const nextMuted = !v.muted;
      v.muted = nextMuted;
      setSoundEnabled(!nextMuted);
      setIsMuted(nextMuted);
    } catch {
      // ignore
    }
  };

  const increaseVideoVolume = () => {
    const v = videoRefs.current[currentIndex];
    if (!v) return;
    const next = Math.min(1, (v.volume || 0) + 0.1);
    changeVideoVolume(next);
  };

  const decreaseVideoVolume = () => {
    const v = videoRefs.current[currentIndex];
    if (!v) return;
    const next = Math.max(0, (v.volume || 0) - 0.1);
    changeVideoVolume(next);
  };

  const changeVideoVolume = (next: number) => {
    const v = videoRefs.current[currentIndex];
    if (!v) return;
    const clamped = Math.min(1, Math.max(0, next));
    try {
      v.volume = clamped;
      setVolumeLocal(clamped);
      if (clamped > 0 && v.muted) {
        v.muted = false;
        setIsMuted(false);
        setSoundEnabled(true);
      }
      if (clamped === 0 && !v.muted) {
        v.muted = true;
        setIsMuted(true);
        setSoundEnabled(false);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        setIsInView(Boolean(e?.isIntersecting));
      },
      { threshold: 0.6 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    return subscribeSoundEnabled((enabled) => {
      setSoundEnabledState(enabled);
      setIsMuted(!enabled);
    });
  }, []);

  useEffect(() => {
    const v = videoRefs.current[currentIndex];
    const item = mediaItems[currentIndex];
    if (!v || item?.type !== 'video') {
      setIsPlaying(false);
      setDuration(0);
      setCurrentTime(0);
      setIsVerticalVideo(true);
      return;
    }

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
    const onTimeUpdate = () => setCurrentTime(v.currentTime || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => {
      setIsMuted(Boolean(v.muted));
      setVolumeLocal(typeof v.volume === 'number' ? v.volume : 1);
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
  }, [currentIndex, mediaItems]);

  useEffect(() => {
    return subscribeNowPlayingVideoId((id) => {
      // If something else started playing, pause our media
      if (!id) return;
      const prefix = `${instanceIdRef.current}:`;
      if (id.startsWith(prefix)) return;

      videoRefs.current.forEach((v) => {
        if (!v) return;
        try {
          v.pause();
          v.currentTime = 0;
          v.muted = true;
        } catch {
          // ignore
        }
      });

      const audio = audioRef.current;
      if (audio) {
        try {
          audio.pause();
        } catch {
          // ignore
        }
      }
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const width = el.clientWidth || 1;
      const idx = Math.round(el.scrollLeft / width);
      setCurrentIndex(Math.max(0, Math.min(mediaItems.length - 1, idx)));
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [mediaItems.length]);

  useEffect(() => {
    // Instagram-like: play only the active slide video; pause/reset others
    const refs = videoRefs.current;
    refs.forEach((v, idx) => {
      if (!v) return;
      if (idx !== currentIndex) {
        try {
          v.muted = true;
          v.pause();
          v.currentTime = 0;
        } catch {
          // ignore
        }
      }
    });

    const activeItem = mediaItems[currentIndex];
    const activeVideo = refs[currentIndex];
    if (activeItem?.type !== 'video' || !activeVideo) return;

    if (!isInView) {
      try {
        activeVideo.pause();
        activeVideo.currentTime = 0;
        activeVideo.muted = true;
      } catch {
        // ignore
      }
      return;
    }

    // Autoplay is usually allowed only when muted
    activeVideo.muted = true;
    try {
      activeVideo.setAttribute('muted', '');
      activeVideo.setAttribute('autoplay', '');
      activeVideo.setAttribute('playsinline', 'true');
      activeVideo.setAttribute('webkit-playsinline', 'true');
    } catch {
      // ignore
    }
    const t = window.setTimeout(() => {
      setNowPlayingVideoId(`${instanceIdRef.current}:${currentIndex}`);
      activeVideo
        .play()
        .catch(() => {});
    }, 50);
    return () => window.clearTimeout(t);
  }, [currentIndex, mediaItems, soundEnabled, isInView]);

  useEffect(() => {
    const v = videoRefs.current[currentIndex];
    if (!v) return;
    try {
      // Do not force unmuted before play; browser may block autoplay with sound.
      // Unmute will be applied right after play starts (see effect above).
      if (!soundEnabled) v.muted = true;
    } catch {
      // ignore
    }
  }, [currentIndex, soundEnabled]);

  useEffect(() => {
    if (!hasAudio) return;
    const audio = new Audio(audioUrl!);
    audio.loop = true;
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (clipEnd != null && audio.currentTime >= clipEnd) {
        audio.currentTime = clipStart;
      }
    };
    audio.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audioRef.current = null;
    };
  }, [audioUrl, hasAudio, clipStart, clipEnd]);

  const toggleMute = async () => {
    if (!hasAudio) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (!soundEnabled) {
      try {
        setSoundEnabled(true);
        audio.currentTime = clipStart;
        setNowPlayingVideoId(`${instanceIdRef.current}:audio`);
        await audio.play();
        setIsMuted(false);
      } catch {
        setSoundEnabled(false);
        setIsMuted(true);
      }
    } else {
      setSoundEnabled(false);
      audio.pause();
      setIsMuted(true);
    }
  };

  const openAtIndex = (index: number) => {
    const item = mediaItems[index];
    if (!item) return;

    if (item.type === 'video') {
      const v = videoRefs.current[index];
      try {
        v?.pause();
      } catch {
        // ignore
      }
    }
    setCurrentIndex(index);
    setLightboxStartIndex(Math.max(0, index));
    setIsLightboxOpen(true);
  };

  // Distinguish tap/click from drag (Instagram-like: swipe changes slide, tap opens)
  const pointerDownRef = useRef<{ x: number; y: number; index: number } | null>(null);
  const pointerMovedRef = useRef(false);
  const DRAG_THRESHOLD_PX = 8;

  // Enable drag-to-scroll with mouse (desktop) and touch-like pointer events
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

  const desktopSwipeStartXRef = useRef<number | null>(null);
  const desktopSwipeMovedRef = useRef(false);
  const DESKTOP_SWIPE_THRESHOLD_PX = 50;

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(Math.max(0, prev), Math.max(mediaItems.length - 1, 0)));
  }, [mediaItems.length]);

  // Carrusel estilo Instagram (para 1 o múltiples medios)
  return (
    <div className={`relative w-full ${className}`}>
      {mediaItems[currentIndex]?.type === 'video' && isMuted && (
        <div className="pointer-events-none absolute top-3 left-3 z-10 rounded-full bg-black/40 text-white px-2 py-1 text-xs">
          🔇
        </div>
      )}
      {!isMobile ? (
        <div className="relative w-full bg-black" style={{ width: '100%', height: 'min(520px, 72vh)' }}>
          <div
            className="relative h-full w-full overflow-hidden"
            onPointerDown={(e) => {
              desktopSwipeStartXRef.current = e.clientX;
              desktopSwipeMovedRef.current = false;
            }}
            onPointerMove={(e) => {
              if (desktopSwipeStartXRef.current === null) return;
              const dx = e.clientX - desktopSwipeStartXRef.current;
              if (Math.abs(dx) > 10) desktopSwipeMovedRef.current = true;
            }}
            onPointerUp={(e) => {
              if (desktopSwipeStartXRef.current === null) return;
              const dx = e.clientX - desktopSwipeStartXRef.current;
              desktopSwipeStartXRef.current = null;
              if (!desktopSwipeMovedRef.current) return;
              if (Math.abs(dx) < DESKTOP_SWIPE_THRESHOLD_PX) return;
              if (dx < 0) setCurrentIndex((prev) => Math.min(mediaItems.length - 1, prev + 1));
              else setCurrentIndex((prev) => Math.max(0, prev - 1));
            }}
            onPointerCancel={() => {
              desktopSwipeStartXRef.current = null;
              desktopSwipeMovedRef.current = false;
            }}
          >
            <div
              className="flex h-full w-full"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
                transition: 'transform 0.3s ease',
              }}
            >
              {mediaItems.map((item, idx) => (
                <div
                  key={`${item.url}_${idx}`}
                  className="h-full w-full flex-none flex items-center justify-center"
                >
                  <MediaRenderer
                    url={item.url}
                    alt={`Media ${idx + 1} de ${mediaItems.length}`}
                    className="w-full h-full object-contain rounded-none"
                    stopPropagationOnClick
                    onClick={() => {
                      pointerMovedRef.current = false;
                      openAtIndex(idx);
                    }}
                    autoPlay={item.type === 'video'}
                    muted
                    loop={item.type === 'video'}
                    playsInline
                    videoRef={(el) => {
                      if (item.type !== 'video') return;
                      videoRefs.current[idx] = el;
                      if (el) {
                        try {
                          el.setAttribute('webkit-playsinline', 'true');
                        } catch {
                          // ignore
                        }
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      if (item.type !== 'video') return;
                      const v = e.currentTarget;
                      if (!isInView) return;
                      try {
                        v.muted = true;
                        v.play().catch(() => {});
                      } catch {
                        // ignore
                      }
                    }}
                  />
                </div>
              ))}
            </div>

            {mediaItems.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors inline-flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => Math.max(0, prev - 1));
                  }}
                  aria-label="Anterior"
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors inline-flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => Math.min(mediaItems.length - 1, prev + 1));
                  }}
                  aria-label="Siguiente"
                  disabled={currentIndex === mediaItems.length - 1}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

                <div className="absolute top-3 right-3 z-20 rounded-full bg-black/55 text-white text-xs px-2 py-1 tabular-nums">
                  {currentIndex + 1}/{mediaItems.length}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onPointerDown={(e) => {
            const el = scrollRef.current;
            if (!el) return;
            // Only left button for mouse
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            pointerMovedRef.current = false;
            isDraggingRef.current = true;
            dragStartXRef.current = e.clientX;
            dragStartScrollLeftRef.current = el.scrollLeft;
          }}
          onPointerMove={(e) => {
            const el = scrollRef.current;
            if (!el || !isDraggingRef.current) return;
            const dx = e.clientX - dragStartXRef.current;
            if (Math.abs(dx) > DRAG_THRESHOLD_PX) {
              pointerMovedRef.current = true;
            }
            el.scrollLeft = dragStartScrollLeftRef.current - dx;
          }}
          onPointerUp={(e) => {
            const dx = e.clientX - dragStartXRef.current;
            pointerMovedRef.current = Math.abs(dx) > DRAG_THRESHOLD_PX;
            isDraggingRef.current = false;
          }}
          onPointerCancel={() => {
            pointerMovedRef.current = false;
            isDraggingRef.current = false;
          }}
        >
          {mediaItems.map((item, idx) => (
            <div
              key={`${item.url}_${idx}`}
              className="snap-center shrink-0 w-full"
              style={{ width: '100%', height: 'min(500px, 70vh)' }}
              onClick={() => {
                pointerMovedRef.current = false;
                openAtIndex(idx);
              }}
            >
              {item.type === 'image' ? (
                <div
                  className="bg-black flex items-center justify-center"
                  style={{ width: '100%', height: 'min(500px, 70vh)' }}
                >
                  <MediaRenderer
                    url={item.url}
                    alt={`Media ${idx + 1} de ${mediaItems.length}`}
                    className="w-full h-full object-cover md:object-contain rounded-none"
                    stopPropagationOnClick
                    onClick={() => {
                      pointerMovedRef.current = false;
                      openAtIndex(idx);
                    }}
                  />
                </div>
              ) : (
                <div
                  className="bg-black flex items-center justify-center"
                  style={{ width: '100%', height: 'min(500px, 70vh)' }}
                >
                  <MediaRenderer
                    url={item.url}
                    alt={`Media ${idx + 1} de ${mediaItems.length}`}
                    className="w-full h-full object-contain rounded-none"
                    stopPropagationOnClick
                    onClick={() => {
                      pointerMovedRef.current = false;
                      openAtIndex(idx);
                    }}
                    autoPlay
                    muted
                    loop
                    playsInline
                    videoRef={(el) => {
                      videoRefs.current[idx] = el;
                      if (el) {
                        try {
                          el.setAttribute('webkit-playsinline', 'true');
                        } catch {
                          // ignore
                        }
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      if (!isInView) return;
                      try {
                        v.muted = true;
                        v.play().catch(() => {});
                      } catch {
                        // ignore
                      }
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isMobile && mediaItems[currentIndex]?.type === 'video' && (
        <div
          className="absolute left-0 right-0 bottom-0 z-30 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2"
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
                const v = videoRefs.current[currentIndex];
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
                toggleVideoMute();
              }}
              aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              {isMuted || volumeLocal === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>

            <button
              type="button"
              className="h-8 w-8 inline-flex items-center justify-center text-white"
              onClick={(e) => {
                e.stopPropagation();
                openFullscreenActive();
              }}
              aria-label="Pantalla completa"
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {isMobile && mediaItems.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-full">
          {mediaItems.map((_, idx) => (
            <span
              key={idx}
              className={
                "h-1.5 w-1.5 rounded-full transition-all " +
                (idx === currentIndex ? "bg-white w-2.5" : "bg-white/60")
              }
            />
          ))}
        </div>
      )}

      {isMobile && hasAudio && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void toggleMute();
          }}
          className="absolute bottom-3 right-3 z-10 rounded-full bg-black/40 hover:bg-black/55 text-white p-2"
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}

      {/* Modales */}
      <MediaLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        items={lightboxItems}
        startIndex={lightboxStartIndex}
        post={post}
      />
    </div>
  );
}
