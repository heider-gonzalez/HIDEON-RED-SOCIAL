import { cn } from "@/lib/utils";
import { getHybridUrl } from "@/lib/hybrid-url";
import type { KeyboardEvent, Ref, SyntheticEvent } from "react";
import { useMemo, useCallback } from "react";
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
  // Convertir URL a URL híbrida
  const hybridUrl = useMemo(() => getHybridUrl(url), [url]);
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

  // Manejar errores de video simple (sin fallback ya que las URLs son originales)
  const handleVideoError = useCallback(async () => {
    // Debug logging solo en desarrollo
    if (import.meta.env.DEV && !videoError) {
      console.debug("🔍 Video error en MediaRenderer:", safeHybridUrl);
    }

    if (!videoError) {
      markVideoError(safeHybridUrl);
      if (import.meta.env.DEV) {
        console.debug("❌ Video no disponible en MediaRenderer:", safeHybridUrl);
      }
    }
  }, [markVideoError, safeHybridUrl, videoError]);

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
