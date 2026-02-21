
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AttachmentInput } from "@/components/media/AttachmentInput";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { BarChartBig, ImageIcon, SparklesIcon, Video, BookOpen } from "lucide-react";
import { AudioRecorder } from "@/components/media/AudioRecorder";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Visibility } from "@/lib/api/posts/types";

interface PostFooterProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPollToggle: () => void;
  onIdeaToggle: () => void;
  onMarketplaceToggle: () => void;
  onPublish: () => void;
  isPending: boolean;
  hasContent: boolean;
  visibility: Visibility;
  onVisibilityChange: (value: Visibility) => void;
  isIdeaMode: boolean;
  isMarketplaceMode: boolean;
  onAudioRecordingComplete: (audioBlob: Blob, durationSeconds?: number) => void;
}

export function PostFooter({
  onFileSelect,
  onPollToggle,
  onIdeaToggle,
  onMarketplaceToggle,
  onPublish,
  isPending,
  hasContent,
  visibility,
  onVisibilityChange,
  isIdeaMode,
  isMarketplaceMode,
  onAudioRecordingComplete
}: PostFooterProps) {
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const isMobile = useIsMobile();
  
  // Handle visibility change with proper type casting
  const handleVisibilityChange = (value: string) => {
    onVisibilityChange(value as Visibility);
  };
  
  return (
    <div>
      <div className="border-t pt-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center gap-1">
          <AttachmentInput
            type="image"
            buttonSize="sm"
            buttonVariant="ghost"
            showLabel={false}
            onAttachmentChange={(files) => {
              if (files && files[0]) {
                const file = files[0];
                const event = {
                  target: {
                    files: [file]
                  }
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                onFileSelect(event);
              }
            }}
            accept="image/*,video/*"
            label="Foto/Vídeo"
          />
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onPollToggle}
            title="Crear encuesta"
            className="text-muted-foreground"
            type="button"
          >
            <BarChartBig className="h-4 w-4" />
          </Button>
          
          <Button 
            variant={isIdeaMode ? "default" : "ghost"}
            size="sm" 
            onClick={onIdeaToggle}
            title="Publicar una idea"
            className={isIdeaMode ? "" : "text-muted-foreground"}
            type="button"
          >
            <SparklesIcon className="h-4 w-4" />
          </Button>

          <Button 
            variant={isMarketplaceMode ? "default" : "ghost"}
            size="sm" 
            onClick={onMarketplaceToggle}
            title="Vender apuntes"
            className={isMarketplaceMode ? "bg-orange-600 hover:bg-orange-700" : "text-muted-foreground"}
            type="button"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAudioRecorder(!showAudioRecorder)}
            title="Grabar audio"
            className="text-muted-foreground"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 sm:mt-0">
          <Select 
            value={visibility} 
            onValueChange={handleVisibilityChange}
          >
            <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs">
              <SelectValue placeholder="Visibilidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Público</SelectItem>
              <SelectItem value="friends">Amigos</SelectItem>
              <SelectItem value="private">Solo yo</SelectItem>
              <SelectItem value="incognito">Incógnito</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={onPublish}
            disabled={!hasContent || isPending}
            size="sm"
            type="button"
            className="w-full sm:w-auto"
          >
            {isPending ? "Publicando..." : isMarketplaceMode ? "Publicar apuntes" : isIdeaMode ? "Publicar idea" : "Publicar"}
          </Button>
        </div>
      </div>
      
      {showAudioRecorder && (
        <div className="mt-3 p-3 bg-muted/20 rounded-lg">
          <AudioRecorder onRecordingComplete={onAudioRecordingComplete} />
        </div>
      )}
    </div>
  );
}
