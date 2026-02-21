
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AudioWaveform, Film } from "lucide-react";

interface MediaDisplayProps {
  url: string;
  type?: string;
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  // Adding the props that PostContent is trying to pass
  mediaUrl?: string;
  mediaType?: string;
}

export function MediaDisplay({ 
  url,
  type, 
  className,
  isExpanded = false,
  onToggleExpand,
  // Use the alternate props if the primary ones aren't provided
  mediaUrl, 
  mediaType 
}: MediaDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  
  // Use either the primary props or fallback to the alternate ones
  const finalUrl = fallbackUrl || url || mediaUrl || '';
  const finalType = type || mediaType || '';

  // Debug logging
  console.log('MediaDisplay props:', { url, mediaUrl, type, mediaType, finalUrl, finalType });

  // Determine if media is image, video, or audio
  const isImage = finalType?.startsWith('image') || finalUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
  const isVideo = finalType?.startsWith('video') || finalUrl.match(/\.(mp4|webm|ogg|mov)$/i);
  const isAudio = finalType?.startsWith('audio') || finalUrl.match(/\.(mp3|wav|ogg|webm)$/i);

  const handleMediaError = () => {
    const originalUrl = url || mediaUrl || '';
    console.log('Error cargando media desde origen:', originalUrl);
    // No hacemos fallback a Supabase para evitar egress; usar placeholder solo para imágenes
    if (!hasError) {
      if (finalType?.startsWith('image') || originalUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        setFallbackUrl('/placeholder.svg');
      }
      setHasError(true);
    }
  };

  const handleClick = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else if (isImage || isVideo) {
      setIsOpen(true);
    }
  };

  return (
    <>
      {isImage && (
        <img 
          src={finalUrl} 
          alt="Media content" 
          loading="lazy"
          decoding="async"
          className={cn("w-full h-auto rounded-md cursor-pointer max-h-96 object-contain bg-muted/30", className)}
          onClick={handleClick}
          onError={handleMediaError}
          crossOrigin="anonymous"
        />
      )}
      
      {isVideo && !hasError && (
        <div className="relative">
          <video 
            src={finalUrl} 
            controls 
            preload="metadata"
            className={cn("w-full rounded-md cursor-pointer", className)}
            onClick={handleClick}
            controlsList="nodownload"
            onError={handleMediaError}
            crossOrigin="anonymous"
          />
          {isOpen && <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Film className="h-12 w-12 text-white animate-pulse" />
          </div>}
        </div>
      )}
      
      {isAudio && !hasError && (
        <div className="bg-primary/5 p-4 rounded-lg flex flex-col items-center">
          <AudioWaveform className="h-10 w-10 text-primary mb-3" />
          <div className="w-full">
          <audio 
            src={finalUrl} 
            controls 
            preload="metadata"
            className={cn("w-full rounded-md", className)}
            onError={handleMediaError}
            crossOrigin="anonymous"
          />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Audio note</p>
        </div>
      )}

      {hasError && !isImage && (
        <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground text-center">
          No se pudo cargar el medio.
        </div>
      )}

      {/* Modal for full-screen view */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
          <DialogTitle className="sr-only">Vista de medio</DialogTitle>
          <DialogDescription className="sr-only">
            Visualización de imagen o video en pantalla completa
          </DialogDescription>
          {isImage && (
            <img 
              src={finalUrl} 
              alt="Media content" 
              className="w-full h-auto"
            />
          )}
          
          {isVideo && (
            <video 
              ref={(el) => {
                if (!el) return;
                try {
                  el.setAttribute('webkit-playsinline', 'true');
                } catch {
                  // ignore
                }
              }}
              src={finalUrl} 
              controls 
              autoPlay
              muted
              loop
              playsInline
              className="w-full"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
