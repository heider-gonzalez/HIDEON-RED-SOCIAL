import { cn } from "@/lib/utils";
import { getHybridUrl } from "@/lib/hybrid-url";
import type { KeyboardEvent, Ref, SyntheticEvent } from "react";
import { useMemo, useCallback, useState } from "react";
import {
  inferIsCoarsePointer,
  shouldActivateOnKeyDown,
  VideoControlsOverlay,
  VideoErrorFallback,
} from "@/components/media/MediaRendererParts";
import { useMediaRendererVideo } from "@/components/media/useMediaRendererVideo";

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
  // Convertir URL a URL híbrida con fallback dinámico
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const hybridUrl = useMemo(() => {
    if (fallbackUrl) return fallbackUrl;
    return getHybridUrl(url);
  }, [url, fallbackUrl]);
  
  const safeHybridUrl = hybridUrl ?? "";

  const type = inferMediaType(safeHybridUrl);
  const isVideo = type === "video";
  const effectiveMuted = autoPlayOnView ? true : muted;

  const isCoarsePointer = useMemo(() => inferIsCoarsePointer(), []);

  const {
    localVideoRef,
    videoUi,
    videoError,
    showTapControls,
    setVolume,
    togglePlay,
    seekTo,
    toggleMuted,
    setShowVolumeUI,
    setHovered,
    markVideoError,
  } = useMediaRendererVideo({
    isVideo,
    safeHybridUrl,
    effectiveMuted,
    autoPlay,
    autoPlayOnView,
    pauseOnOutOfView,
    resetOnPause,
  });

  // Manejar errores de video con fallback dinámico
  const handleVideoError = useCallback(async () => {
    if (!videoError) {
      markVideoError(safeHybridUrl);
      
      // Intentar fallback: si es URL de Supabase, intentar R2, y viceversa
      if (retryCount < 1 && url) {
        const originalUrl = url.toLowerCase();
        let newFallbackUrl: string | null = null;
        
        // Si es Supabase, intentar R2
        if (originalUrl.includes('supabase.co')) {
          // Extraer el nombre del archivo y construir URL de R2
          const fileName = originalUrl.split('/').pop();
          if (fileName) {
            newFallbackUrl = `https://pub-11aaf71a35c74d7da48843fdfc2c1e44.r2.dev/${fileName}`;
          }
        }
        // Si es R2, intentar Supabase (para proyectos viejos)
        else if (originalUrl.includes('r2.dev') || originalUrl.includes('cloudflare')) {
          const fileName = originalUrl.split('/').pop();
          if (fileName) {
            // Intentar con el bucket de Supabase original
            newFallbackUrl = `https://your-supabase-project.supabase.co/storage/v1/object/public/${fileName}`;
          }
        }
        
        if (newFallbackUrl) {
          setFallbackUrl(newFallbackUrl);
          setRetryCount(prev => prev + 1);
          return;
        }
      }
    }
  }, [markVideoError, safeHybridUrl, videoError, url, retryCount]);

  if (!hybridUrl) return null;

  if (isVideo) {
    const showCustomControls = customControls && !controls;
    const controlsVisible = isCoarsePointer ? videoUi.tapControlsVisible : videoUi.hovered;

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
          src={videoError ? undefined : safeHybridUrl}
          className={cn("w-full h-full object-contain", showCustomControls ? "" : undefined)}
          autoPlay={autoPlayOnView ? false : autoPlay}
          muted={effectiveMuted}
          loop={loop}
          controls={showCustomControls ? false : controls}
          playsInline={playsInline}
          preload="metadata"
          crossOrigin="anonymous"
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
          <VideoErrorFallback />
        )}

        {showCustomControls && (
          <VideoControlsOverlay
            controlsVisible={controlsVisible}
            stopPropagationOnClick={stopPropagationOnClick}
            showTapControls={showTapControls}
            isPlaying={videoUi.isPlaying}
            currentTime={videoUi.currentTime}
            duration={videoUi.duration}
            isCoarsePointer={isCoarsePointer}
            isMutedLocal={videoUi.isMutedLocal}
            volumeLocal={videoUi.volumeLocal}
            showVolumeUI={videoUi.showVolumeUI}
            onTogglePlay={togglePlay}
            onSeek={seekTo}
            onToggleMuted={toggleMuted}
            onShowVolumeUI={setShowVolumeUI}
            onSetVolume={setVolume}
          />
        )}
      </div>
    );
  }

  const handleImageKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!shouldActivateOnKeyDown(e)) return;
    if (stopPropagationOnClick) e.stopPropagation();
    e.preventDefault();
    onClick?.();
  };

  return (
    <button
      type="button"
      className={cn("block p-0 border-0 bg-transparent", className)}
      onClick={(e) => {
        if (stopPropagationOnClick) e.stopPropagation();
        onClick?.();
      }}
      onKeyDown={handleImageKeyDown}
    >
      <img
        src={safeHybridUrl}
        alt={alt}
        className={cn("w-full h-full object-contain")}
        loading="lazy"
        decoding="async"
      />
    </button>
  );
}
