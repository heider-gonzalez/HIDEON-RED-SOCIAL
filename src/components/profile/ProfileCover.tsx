
import { Button } from "@/components/ui/button";
import { ImagePlus, Maximize } from "lucide-react";
import { getHybridUrl } from "@/lib/hybrid-url";

interface ProfileCoverProps {
  coverUrl: string | null;
  isOwner: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<string>;
  onOpenFullscreen: () => void;
}

export function ProfileCover({ 
  coverUrl, 
  isOwner, 
  onUpload, 
  onOpenFullscreen 
}: ProfileCoverProps) {
  const resolvedCoverUrl = getHybridUrl(coverUrl) || coverUrl;

  return (
    <div className="relative h-[300px]">
      <div className="w-full h-full bg-muted flex items-center justify-center">
        {resolvedCoverUrl ? (
          <img 
            src={resolvedCoverUrl} 
            alt="Cover" 
            className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
            onClick={onOpenFullscreen}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <ImagePlus className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        {isOwner && (
          <div className="absolute top-4 right-4">
            <input
              type="file"
              id="cover-upload"
              className="hidden"
              accept="image/*"
              onChange={onUpload}
            />
            <label htmlFor="cover-upload">
              <Button
                size="sm"
                variant="secondary"
                className="cursor-pointer bg-background/80 backdrop-blur-sm hover:bg-background/90"
                asChild
              >
                <span className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4" />
                  Editar portada
                </span>
              </Button>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
