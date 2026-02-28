import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface ProfileAudioPlayButtonProps {
  audioUrl: string | null;
  durationSeconds?: number | null;
  className?: string;
}

export function ProfileAudioPlayButton({ 
  audioUrl, 
  durationSeconds, 
  className = "" 
}: ProfileAudioPlayButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);

    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      // ignore
    }
  };

  if (!audioUrl) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        onClick={togglePlay}
        className="h-8 w-8 rounded-full"
      >
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3 ml-0.5" />
        )}
      </Button>
      {durationSeconds && (
        <span className="text-xs text-muted-foreground">
          {durationSeconds}s
        </span>
      )}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
    </div>
  );
}
