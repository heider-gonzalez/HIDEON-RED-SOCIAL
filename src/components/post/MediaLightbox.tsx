import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LightboxMediaItem = {
  url: string;
  type: "image" | "video";
};

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  items: LightboxMediaItem[];
  startIndex?: number;
}

export function MediaLightbox({ isOpen, onClose, items, startIndex = 0 }: MediaLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const wheelLockRef = useRef<number>(0);

  const total = items.length;
  const current = items[index];

  useEffect(() => {
    if (isOpen) {
      setIndex(Math.min(Math.max(startIndex, 0), Math.max(total - 1, 0)));
    }
  }, [isOpen, startIndex, total]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "ArrowLeft") {
        setIndex((prev) => (prev - 1 + total) % total);
        return;
      }

      if (e.key === "ArrowRight") {
        setIndex((prev) => (prev + 1) % total);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, total]);

  if (!isOpen || !current) return null;

  const goPrev = () => setIndex((prev) => (prev - 1 + total) % total);
  const goNext = () => setIndex((prev) => (prev + 1) % total);

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    const now = Date.now();
    if (now - wheelLockRef.current < 350) return;

    if (Math.abs(e.deltaY) < 10) return;

    wheelLockRef.current = now;

    if (e.deltaY > 0) {
      goNext();
    } else {
      goPrev();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] p-0 overflow-hidden flex flex-col bg-background/95 backdrop-blur-sm border-none sm:rounded-lg [&>button]:hidden">
        <DialogTitle className="sr-only">Visor de medios</DialogTitle>
        <DialogDescription className="sr-only">Visor tipo lightbox para navegar por imágenes y videos</DialogDescription>

        <div className="p-2 flex items-center justify-between bg-black/10 dark:bg-white/5">
          <div className="text-sm text-muted-foreground">
            {total > 0 ? `${index + 1} / ${total}` : ""}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Cerrar visor"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div
          className="relative flex-1 flex items-center justify-center overflow-hidden bg-black/80 dark:bg-black/90"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          onWheel={handleWheel}
        >
          {total > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {current.type === "image" ? (
            <img
              src={current.url}
              alt={`Media ${index + 1} de ${total}`}
              className="max-h-[88vh] max-w-[98vw] object-contain"
              onClick={(e) => e.stopPropagation()}
              loading="eager"
              decoding="async"
            />
          ) : (
            <video
              src={current.url}
              className="max-h-[88vh] max-w-[98vw] object-contain"
              controls
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {total > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Siguiente"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
