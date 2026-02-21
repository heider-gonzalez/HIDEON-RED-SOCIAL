import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link2, Plus, Trash2, Trophy } from "lucide-react";

interface AchievementRow {
  id: string;
  profile_id: string;
  title: string;
  metric_label: string | null;
  metric_value: string | null;
  proof_url: string | null;
  description: string | null;
  created_at: string;
}

interface ProfileAchievementsSectionProps {
  profileId: string;
  isOwner: boolean;
}

export function ProfileAchievementsSection({ profileId, isOwner }: ProfileAchievementsSectionProps) {
  const { toast } = useToast();
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);

  const [title, setTitle] = useState("");
  const [metricLabel, setMetricLabel] = useState("");
  const [metricValue, setMetricValue] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("profile_achievements")
          .select("id, profile_id, title, metric_label, metric_value, proof_url, description, created_at")
          .eq("profile_id", profileId)
          .order("created_at", { ascending: false });

        if (error) {
          const message = String((error as any)?.message || "");
          if (message.toLowerCase().includes("does not exist")) {
            if (isMounted) setAvailable(false);
            return;
          }
          throw error;
        }

        if (isMounted) {
          setAchievements((data || []) as any);
        }
      } catch (e: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: String(e?.message || "No se pudieron cargar los logros"),
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (profileId) void load();

    return () => {
      isMounted = false;
    };
  }, [profileId, toast]);

  const addAchievement = async () => {
    if (!isOwner) return;
    if (!available) return;
    if (saving) return;

    const nextTitle = title.trim();
    if (!nextTitle) return;

    setSaving(true);
    try {
      const payload = {
        profile_id: profileId,
        title: nextTitle,
        metric_label: metricLabel.trim() ? metricLabel.trim() : null,
        metric_value: metricValue.trim() ? metricValue.trim() : null,
        proof_url: proofUrl.trim() ? proofUrl.trim() : null,
        description: description.trim() ? description.trim() : null,
      };

      const { data, error } = await (supabase as any)
        .from("profile_achievements")
        .insert(payload)
        .select("id, profile_id, title, metric_label, metric_value, proof_url, description, created_at")
        .single();

      if (error) throw error;

      setAchievements((prev) => [data as any, ...prev]);
      setTitle("");
      setMetricLabel("");
      setMetricValue("");
      setProofUrl("");
      setDescription("");

      toast({
        title: "Guardado",
        description: "Logro agregado correctamente.",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: String(e?.message || "No se pudo agregar el logro"),
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAchievement = async (id: string) => {
    if (!isOwner) return;
    if (!available) return;
    if (saving) return;

    const prev = achievements;
    setAchievements((list) => list.filter((a) => a.id !== id));
    setSaving(true);

    try {
      const { error } = await (supabase as any)
        .from("profile_achievements")
        .delete()
        .eq("id", id)
        .eq("profile_id", profileId);

      if (error) throw error;
    } catch (e: any) {
      setAchievements(prev);
      toast({
        variant: "destructive",
        title: "Error",
        description: String(e?.message || "No se pudo eliminar"),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!available) return null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Logros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-20 bg-muted rounded animate-pulse" />
            <div className="h-20 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Logros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isOwner && (
          <div className="rounded-md border border-border/60 p-3 space-y-3">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Aumenté las ventas en 25%"
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Métrica (opcional)</Label>
                <Input
                  value={metricLabel}
                  onChange={(e) => setMetricLabel(e.target.value)}
                  placeholder="Ej: Ventas"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1">
                <Label>Valor (opcional)</Label>
                <Input
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                  placeholder="Ej: +25%"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Prueba (URL opcional)</Label>
              <Input
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://..."
                disabled={saving}
              />
            </div>

            <div className="space-y-1">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contexto, alcance, herramientas, impacto..."
                disabled={saving}
              />
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={addAchievement} disabled={saving || !title.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>
        )}

        {achievements.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {isOwner
              ? "Aún no has agregado logros. Agrega 1-3 con métricas para que tu perfil se vea profesional."
              : "Este perfil aún no tiene logros públicos."}
          </div>
        ) : (
          <div className="space-y-3">
            {achievements.map((a) => (
              <div key={a.id} className="rounded-md border border-border/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    {(a.metric_label || a.metric_value) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {[a.metric_label, a.metric_value].filter(Boolean).join(": ")}
                      </p>
                    )}
                    {a.description && (
                      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{a.description}</p>
                    )}
                    {a.proof_url && (
                      <button
                        type="button"
                        className="mt-2 text-xs text-primary inline-flex items-center gap-1 hover:underline"
                        onClick={() => window.open(a.proof_url as string, "_blank")}
                      >
                        <Link2 className="h-3 w-3" />
                        Ver prueba
                      </button>
                    )}
                  </div>

                  {isOwner && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAchievement(a.id)}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
