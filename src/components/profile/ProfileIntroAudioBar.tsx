import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { AudioRecorder } from "@/components/media/AudioRecorder";
import { AttachmentInput } from "@/components/media/AttachmentInput";
import { uploadWithOptimization } from "@/lib/storage/cloudflare-r2";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Profile } from "@/pages/Profile";
import { Pause, Play, Trash2, Volume2 } from "lucide-react";

interface ProfileIntroAudioBarProps {
  profileId: string;
  isOwner: boolean;
  profile: Profile;
  onProfileUpdate: (profile: Profile) => void;
}

function clampDurationSeconds(durationSeconds?: number | null) {
  if (typeof durationSeconds !== "number" || Number.isNaN(durationSeconds)) return null;
  const d = Math.floor(durationSeconds);
  if (d < 1) return null;
  return Math.min(30, d);
}

async function getAudioDurationSeconds(file: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);

    const cleanup = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    };

    audio.preload = "metadata";
    audio.src = url;

    audio.onloadedmetadata = () => {
      const d = Number(audio.duration);
      cleanup();
      if (!Number.isFinite(d) || d <= 0) resolve(null);
      else resolve(d);
    };

    audio.onerror = () => {
      cleanup();
      resolve(null);
    };
  });
}

export function ProfileIntroAudioBar({ profileId, isOwner, profile, onProfileUpdate }: ProfileIntroAudioBarProps) {
  const { toast } = useToast();

  const url = (profile as any).intro_audio_url as string | null | undefined;
  const durationSeconds = clampDurationSeconds((profile as any).intro_audio_duration_seconds);
  const isActive = Boolean((profile as any).intro_audio_is_active);

  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const canShow = Boolean(url) && isActive;

  const progress = useMemo(() => {
    const denom = durationSeconds ?? (audioRef.current?.duration || 0);
    if (!denom || denom <= 0) return 0;
    return Math.min(100, Math.max(0, (currentTime / denom) * 100));
  }, [currentTime, durationSeconds]);

  useEffect(() => {
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
  }, [url]);

  useEffect(() => {
    // Reset state when audio source changes
    setIsPlaying(false);
    setCurrentTime(0);
  }, [url]);

  const updateProfileIntroAudio = async (patch: Record<string, any>) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Debes iniciar sesión");
      if (user.id !== profileId) throw new Error("No autorizado");

      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      if (error) throw error;

      onProfileUpdate({
        ...profile,
        ...(patch as any),
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: String(e?.message || "No se pudo guardar"),
      });
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadFile = async (files: File[] | null) => {
    if (!isOwner) return;
    if (isSaving) return;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      toast({
        variant: "destructive",
        title: "Archivo inválido",
        description: "Solo se permiten audios.",
      });
      return;
    }

    const dur = await getAudioDurationSeconds(file);
    const d = clampDurationSeconds(dur ?? undefined);
    if (d == null) {
      toast({
        variant: "destructive",
        title: "Audio inválido",
        description: "El audio debe durar entre 1 y 30 segundos.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Debes iniciar sesión");
      if (user.id !== profileId) throw new Error("No autorizado");

      const ext = file.name.split(".").pop() || "webm";
      const publicUrl = await uploadWithOptimization(
        file,
        `profiles/${profileId}/intro-audio/${Date.now()}.${ext}`
      );

      await updateProfileIntroAudio({
        intro_audio_url: publicUrl,
        intro_audio_duration_seconds: d,
        intro_audio_is_active: true,
      });

      toast({
        title: "Audio guardado",
        description: "Tu audio de presentación se actualizó correctamente.",
      });
    } catch {
      // handled
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob, duration?: number) => {
    if (!isOwner) return;
    if (isSaving) return;

    const resolvedDuration = typeof duration === "number" ? duration : await getAudioDurationSeconds(audioBlob);
    const d = clampDurationSeconds(resolvedDuration ?? undefined);
    if (d == null) {
      toast({
        variant: "destructive",
        title: "Audio inválido",
        description: "La grabación debe durar entre 1 y 30 segundos.",
      });
      return;
    }

    const file = new File([audioBlob], `intro-audio-${Date.now()}.webm`, { type: "audio/webm" });

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Debes iniciar sesión");
      if (user.id !== profileId) throw new Error("No autorizado");

      const publicUrl = await uploadWithOptimization(file, `profiles/${profileId}/intro-audio/${Date.now()}.webm`);

      await updateProfileIntroAudio({
        intro_audio_url: publicUrl,
        intro_audio_duration_seconds: d,
        intro_audio_is_active: true,
      });

      toast({
        title: "Audio guardado",
        description: "Tu audio de presentación se actualizó correctamente.",
      });
    } catch (e) {
      // handled in updateProfileIntroAudio
    } finally {
      setIsSaving(false);
    }
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

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

  const handleDelete = async () => {
    if (!isOwner) return;
    if (isSaving) return;

    try {
      await updateProfileIntroAudio({
        intro_audio_url: null,
        intro_audio_duration_seconds: null,
        intro_audio_is_active: false,
      });

      toast({
        title: "Audio eliminado",
        description: "El audio de presentación fue eliminado.",
      });
    } catch {
      // handled
    }
  };

  const handleToggleActive = async (next: boolean) => {
    if (!isOwner) return;
    if (isSaving) return;

    try {
      await updateProfileIntroAudio({ intro_audio_is_active: next });
    } catch {
      // handled
    }
  };

  if (!isOwner && !canShow) return null;

  return (
    <div className="sticky top-16 z-20 px-2 sm:px-4">
      <Card className="mb-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Audio de presentación</p>
              <p className="text-xs text-muted-foreground">
                {durationSeconds ? `${durationSeconds}s` : "máx 30s"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {url && (isOwner || isActive) && (
              <Button type="button" size="icon" variant="secondary" onClick={togglePlay} disabled={!canShow && !isOwner}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            )}

            {isOwner && (
              <>
                <div className="flex items-center gap-2 px-2">
                  <span className="text-xs text-muted-foreground">Activo</span>
                  <Switch checked={isActive} onCheckedChange={handleToggleActive} disabled={!url || isSaving} />
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={handleDelete} disabled={!url || isSaving}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {url && (
          <div className="mt-2">
            <Progress value={progress} />
            <audio ref={audioRef} src={url || undefined} preload="metadata" />
          </div>
        )}

        {isOwner && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Graba un audio (máx 30s). Puedes activarlo o desactivarlo.
            </p>
            <div className="flex items-center gap-2">
              <AttachmentInput
                type="audio"
                buttonSize="icon"
                buttonVariant="ghost"
                showLabel={false}
                disabled={isSaving}
                onAttachmentChange={handleUploadFile}
              />
              <AudioRecorder onRecordingComplete={handleRecordingComplete} maxDurationSeconds={30} />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
