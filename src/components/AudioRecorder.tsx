
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Square, Loader2, AudioWaveform } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useEffect } from "react";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, durationSeconds?: number) => void;
  className?: string;
  maxDurationSeconds?: number;
}

export function AudioRecorder({ onRecordingComplete, className, maxDurationSeconds }: AudioRecorderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { isRecording, recordingDuration, startRecording, stopRecording } = useAudioRecorder();

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo iniciar la grabación de audio",
      });
    }
  };

  const handleStopRecording = async () => {
    const durationAtStop = recordingDuration;
    setIsProcessing(true);
    try {
      const audioBlob = await stopRecording();
      if (audioBlob) {
        onRecordingComplete(audioBlob, durationAtStop);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al procesar la grabación de audio",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!isRecording) return;
    if (isProcessing) return;
    if (typeof maxDurationSeconds !== "number") return;
    if (maxDurationSeconds <= 0) return;

    if (recordingDuration >= maxDurationSeconds) {
      void handleStopRecording();
    }
  }, [isRecording, isProcessing, maxDurationSeconds, recordingDuration]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isRecording ? (
        <>
          <Button
            variant="destructive"
            size="icon"
            onClick={handleStopRecording}
            disabled={isProcessing}
            className="h-10 w-10 rounded-full"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </Button>
          <span className="text-sm font-medium text-destructive">
            {formatTime(recordingDuration)}
          </span>
        </>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleStartRecording}
          className="h-10 w-10 text-gray-500"
          title="Grabar audio"
        >
          <AudioWaveform className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
