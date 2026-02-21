
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AudioRecorder } from "@/components/media/AudioRecorder";
import { MusicSelector } from "@/components/media/MusicSelector";
import { InstagramAudioEditor } from "@/components/media/InstagramAudioEditor";
import { MousePointerClick, PlusCircle, Lightbulb, Mic, BarChartBig, Music } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
// Removed StoryCreator - stories feature removed
import { supabase } from "@/integrations/supabase/client";
import { AttachmentInput } from "@/components/media/AttachmentInput";

interface PostActionButtonsProps {
  onFileSelect: (file: File) => void;
  onPollCreate: () => void;
  onIdeaCreate?: () => void;
  isPending: boolean;
  isIdeaMode?: boolean;
  onAudioRecord?: () => void;
  onMusicSelect?: (audioData: any) => void;
}

export function PostActionButtons({ 
  onFileSelect, 
  onPollCreate, 
  onIdeaCreate, 
  isPending,
  isIdeaMode = false,
  onAudioRecord,
  onMusicSelect
}: PostActionButtonsProps) {
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [showAudioEditor, setShowAudioEditor] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);

  const handleMusicTrackSelect = (track: any, bestMoment?: any) => {
    setSelectedTrack(track);
    setShowMusicSelector(false);
    setShowAudioEditor(true);
  };

  const handleAudioDataSelect = (audioData: any) => {
    if (onMusicSelect) {
      onMusicSelect(audioData);
    }
    setShowAudioEditor(false);
    setSelectedTrack(null);
  };

  const handleFileSelect = (files: File[] | null) => {
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  return (
    <div className="flex">
      {/* Mobile dropdown menu with click icon */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground"
            >
              <MousePointerClick className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-background border-border">
            <DropdownMenuItem>
              <AttachmentInput
                type="image"
                onAttachmentChange={handleFileSelect}
                showLabel={true}
                buttonVariant="ghost"
                buttonClassName="w-full flex justify-start text-primary"
                label="Foto/vídeo"
                accept="image/*,video/*"
              />
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Button 
                variant="ghost" 
                className="w-full flex justify-start"
                onClick={() => setShowMusicSelector(true)}
              >
                <Music className="h-4 w-4 mr-2" />
                Música
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPollCreate}>
              <Button variant="ghost" className="w-full flex justify-start">
                <BarChartBig className="h-4 w-4 mr-2" />
                Encuesta
              </Button>
            </DropdownMenuItem>
            {onIdeaCreate && (
              <DropdownMenuItem onClick={onIdeaCreate}>
                <Button 
                  variant="ghost" 
                  className={`w-full flex justify-start ${isIdeaMode ? 'text-primary' : ''}`}
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  {isIdeaMode ? "Cancelar idea" : "Idea"}
                </Button>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop buttons */}
      <div className="hidden md:flex items-center space-x-1">
        <AttachmentInput
          type="image"
          onAttachmentChange={handleFileSelect}
          showLabel={false}
          buttonSize="icon"
          buttonVariant="ghost"
          disabled={isPending}
          buttonClassName="h-10 w-10 p-0 text-primary"
          accept="image/*,video/*"
        />
        <Button 
          variant="ghost" 
          disabled={isPending}
          onClick={() => setShowMusicSelector(true)}
          className="h-10 w-10 p-0 text-muted-foreground"
          title="Agregar música"
        >
          <Music className="h-4 w-4" />
        </Button>
        <AudioRecorder onRecordingComplete={(blob, _durationSeconds) => onFileSelect(new File([blob], "audio.webm", { type: "audio/webm" }))} />
        <Button
          variant="ghost"
          disabled={isPending}
          title="Crear encuesta"
          onClick={onPollCreate}
          className="h-10 text-sm font-normal px-2 text-muted-foreground"
        >
          Encuesta
        </Button>
        {onIdeaCreate && (
          <Button
            variant={isIdeaMode ? "default" : "ghost"}
            disabled={isPending}
            title={isIdeaMode ? "Cancelar idea" : "Crear idea"}
            onClick={onIdeaCreate}
            className={`h-10 ${isIdeaMode ? 'bg-primary/10 hover:bg-primary/20 text-primary border-primary' : 'text-muted-foreground'}`}
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Music Selector Modal */}
      {showMusicSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <MusicSelector
              onTrackSelect={handleMusicTrackSelect}
              onClose={() => setShowMusicSelector(false)}
            />
          </div>
        </div>
      )}

      {/* Audio Editor Modal */}
      {showAudioEditor && selectedTrack && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <InstagramAudioEditor
              track={selectedTrack}
              videoDuration={30}
              onAudioSelect={handleAudioDataSelect}
              onClose={() => setShowAudioEditor(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
