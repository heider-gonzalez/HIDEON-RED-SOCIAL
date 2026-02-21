import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AudioRecorder } from "@/components/media/AudioRecorder";
import { AttachmentInput } from "@/components/media/AttachmentInput";
import { uploadWithOptimization } from "@/lib/storage/cloudflare-r2";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Volume2, Mic, Upload } from "lucide-react";
import type { Profile } from "@/pages/Profile";

interface ProfileAudioSectionProps {
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

export function ProfileAudioSection({ profile, onProfileUpdate }: ProfileAudioSectionProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const url = (profile as any).intro_audio_url as string | null | undefined;
  const durationSeconds = clampDurationSeconds((profile as any).intro_audio_duration_seconds);
  const isActive = Boolean((profile as any).intro_audio_is_active);

  const updateProfileIntroAudio = async (patch: Record<string, any>) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Debes iniciar sesión");
      if (user.id !== profile.id) throw new Error("No autorizado");

      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

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
      if (user.id !== profile.id) throw new Error("No autorizado");

      const ext = file.name.split(".").pop() || "webm";
      const publicUrl = await uploadWithOptimization(
        file,
        `profiles/${profile.id}/intro-audio/${Date.now()}.${ext}`
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
      if (user.id !== profile.id) throw new Error("No autorizado");

      const publicUrl = await uploadWithOptimization(file, `profiles/${profile.id}/intro-audio/${Date.now()}.webm`);

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

  const handleDelete = async () => {
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
    if (isSaving) return;

    try {
      await updateProfileIntroAudio({ intro_audio_is_active: next });
    } catch {
      // handled
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Audio de presentación</h3>
      </div>

      {url && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">
              Audio guardado {durationSeconds && `(${durationSeconds}s)`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="audio-active" className="text-xs">Activo</Label>
              <Switch
                id="audio-active"
                checked={isActive}
                onCheckedChange={handleToggleActive}
                disabled={isSaving}
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleDelete}
              disabled={isSaving}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Graba o sube un audio de presentación (máx 30s)
        </Label>
        <div className="flex items-center gap-2">
          <AttachmentInput
            type="audio"
            buttonSize="sm"
            buttonVariant="outline"
            showLabel={false}
            disabled={isSaving}
            onAttachmentChange={handleUploadFile}
          />
          <AudioRecorder 
            onRecordingComplete={handleRecordingComplete} 
            maxDurationSeconds={30}
          />
        </div>
      </div>
    </Card>
  );
}
