import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { PostImage } from "@/components/ui/optimized-image";
import { MediaLightbox } from "./MediaLightbox";

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface MediaCarouselProps {
  mediaItems: MediaItem[];
  className?: string;
  audioUrl?: string;
  audioMetadata?: any | null;
}

export function MediaCarousel({ mediaItems, className = "", audioUrl, audioMetadata }: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  const [isVideoMuted, setIsVideoMuted] = useState(true);

  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

    // Autoplay is usually allowed when muted
    activeVideo.muted = isVideoMuted;
    const t = window.setTimeout(() => {
      activeVideo.play().catch(() => {});
    }, 50);
    return () => window.clearTimeout(t);
  }, [currentIndex, mediaItems, isVideoMuted]);

  useEffect(() => {
    const v = videoRefs.current[currentIndex];
    if (!v) return;
    try {
      v.muted = isVideoMuted;
    } catch {
      // ignore
    }
  }, [currentIndex, isVideoMuted]);

  const toggleVideoMute = () => {
    const v = videoRefs.current[currentIndex];
    const next = !isVideoMuted;
    setIsVideoMuted(next);
    if (!v) return;
    try {
      v.muted = next;
      if (!next) {
        v.play().catch(() => {});
      }
    } catch {
      // ignore
    }
  };

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

    if (isMuted) {
      try {
        audio.currentTime = clipStart;
        await audio.play();
        setIsMuted(false);
      } catch {
        setIsMuted(true);
      }
    } else {
      audio.pause();
      setIsMuted(true);
    }
  };

  const openAtIndex = (index: number) => {
    const item = mediaItems[index];
    if (!item) return;
    setCurrentIndex(index);
    setLightboxStartIndex(index);
    setIsLightboxOpen(true);
  };

  // Distinguish tap/click from drag (Instagram-like: swipe changes slide, tap opens)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const pointerMovedRef = useRef(false);
  const DRAG_THRESHOLD_PX = 8;

  // Enable drag-to-scroll with mouse (desktop) and touch-like pointer events
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

  // Carrusel estilo Instagram (para 1 o múltiples medios)
  return (
    <div className={`relative w-full ${className}`}>
      <div
        ref={scrollRef}
        className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onPointerDown={(e) => {
          const el = scrollRef.current;
          if (!el) return;
          // Only left button for mouse
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          isDraggingRef.current = true;
          dragStartXRef.current = e.clientX;
          dragStartScrollLeftRef.current = el.scrollLeft;
          try {
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
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
          isDraggingRef.current = false;
          try {
            (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }
        }}
        onPointerCancel={() => {
          isDraggingRef.current = false;
        }}
      >
          {mediaItems.map((item, idx) => (
            <div
              key={`${item.url}_${idx}`}
              className="relative flex-none w-full snap-start"
              onClick={() => {
                if (pointerMovedRef.current) return;
                pointerMovedRef.current = false;
                openAtIndex(idx);
              }}
            >
              {item.type === 'image' ? (
                <div
                  className="w-full bg-black flex items-center justify-center"
                  style={{ width: '100%', height: 'min(500px, 70vh)' }}
                >
                  <PostImage
                    src={item.url}
                    alt={`Media ${idx + 1} de ${mediaItems.length}`}
                    className="w-full h-full object-cover md:object-contain rounded-none"
                    lazy={idx !== 0}
                  />
                </div>
              ) : (
                <div
                  className="w-full bg-black flex items-center justify-center"
                  style={{ width: '100%', height: 'min(500px, 70vh)' }}
                >
                  <video
                    src={item.url}
                    className="w-full h-full object-contain rounded-none"
                    muted
                    playsInline
                    preload="metadata"
                    loop
                    ref={(el) => {
                      videoRefs.current[idx] = el;
                    }}
                  />
                </div>
              )}
            </div>
          ))}
      </div>

      {mediaItems[currentIndex]?.type === 'video' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleVideoMute();
          }}
          className="absolute top-3 right-3 z-20 rounded-full bg-black/50 text-white p-2 backdrop-blur-sm"
          aria-label={isVideoMuted ? 'Activar sonido' : 'Silenciar'}
        >
          {isVideoMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}

      {mediaItems.length > 1 && (
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

      {hasAudio && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void toggleMute();
          }}
          className="absolute top-3 right-3 z-10 rounded-full bg-black/40 hover:bg-black/55 text-white p-2"
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}

      {/* Modales */}
      <MediaLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        items={mediaItems}
        startIndex={lightboxStartIndex}
      />
    </div>
  );
}
