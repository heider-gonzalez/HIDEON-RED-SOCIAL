import { cn } from "@/lib/utils";
import type { Ref, SyntheticEvent } from "react";

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
  muted = true,
  loop = false,
  controls = false,
  playsInline = true,
}: MediaRendererProps) {
  if (!url) return null;

  const type = inferMediaType(url);

  if (type === "video") {
    return (
      <video
        ref={videoRef}
        src={url}
        className={cn("w-full h-full object-contain", className)}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        controls={controls}
        playsInline={playsInline}
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onClick={(e) => {
          if (stopPropagationOnClick) e.stopPropagation();
          onClick?.();
        }}
      />
    );
  }

  return (
    <img
      src={url}
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
