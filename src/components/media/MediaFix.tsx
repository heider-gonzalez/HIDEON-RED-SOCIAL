import React from 'react';
import { FallbackImage } from './FallbackImage';
import { MediaRenderer } from './MediaRenderer';

interface MediaFixProps {
  url?: string | null;
  type?: 'image' | 'video' | 'auto';
  className?: string;
  onClick?: () => void;
  alt?: string;
  videoRef?: React.Ref<HTMLVideoElement>;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
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
}

export function MediaFix({ url, type = 'auto', ...props }: MediaFixProps) {
  // Si no hay URL, mostrar placeholder
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-muted border border-border ${props.className}`}>
        <div className="text-center p-4">
          <div className="text-muted-foreground text-sm">No hay media disponible</div>
        </div>
      </div>
    );
  }

  // Determinar el tipo de media
  const mediaType = type === 'auto' ? inferMediaType(url) : type;

  // Para imágenes, usar FallbackImage con manejo de errores
  if (mediaType === 'image') {
    return <FallbackImage src={url} alt={props.alt} className={props.className} onClick={props.onClick} />;
  }

  // Para videos, usar MediaRenderer normal (ya tiene URL híbrida)
  return <MediaRenderer url={url} {...props} />;

  function inferMediaType(url: string): 'image' | 'video' {
    const u = url.toLowerCase();
    if (u.match(/\.(mp4|webm|ogg|mov|avi|wmv|flv|m4v)(\?|#|$)/)) return 'video';
    return 'image';
  }
}
