import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/pages/Profile";
import { Briefcase, MapPin, Save, Plus, X } from "lucide-react";

type WorkMode = "remote" | "hybrid" | "onsite";

type ProfessionalRow = {
  profile_id: string;
  headline: string | null;
  city: string | null;
  work_mode: WorkMode | null;
  value_proposition: string | null;
  seeking_tags: string[] | null;
  offering_tags: string[] | null;
};

interface ProfileProfessionalCardProps {
  profile: Profile;
  isOwner: boolean;
}

export function ProfileProfessionalCard({ profile, isOwner }: ProfileProfessionalCardProps) {
  const { toast } = useToast();
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [headline, setHeadline] = useState("");
  const [city, setCity] = useState("");
  const [workMode, setWorkMode] = useState<WorkMode | "">("");
  const [valueProposition, setValueProposition] = useState("");

  const [seekingTags, setSeekingTags] = useState<string[]>([]);
  const [offeringTags, setOfferingTags] = useState<string[]>([]);
  const [seekingInput, setSeekingInput] = useState("");
  const [offeringInput, setOfferingInput] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("profile_professional")
          .select("profile_id, headline, city, work_mode, value_proposition, seeking_tags, offering_tags")
          .eq("profile_id", profile.id)
          .maybeSingle();

        if (error) {
          const message = String((error as any)?.message || "");
          if (message.toLowerCase().includes("does not exist")) {
            if (isMounted) setAvailable(false);
            return;
          }
          throw error;
        }

        const row = (data || null) as ProfessionalRow | null;
        if (!isMounted) return;

        setHeadline(String(row?.headline ?? ""));
        setCity(String(row?.city ?? ""));
        setWorkMode((row?.work_mode ?? "") as any);
        setValueProposition(String(row?.value_proposition ?? ""));
        setSeekingTags(Array.isArray(row?.seeking_tags) ? row!.seeking_tags!.filter(Boolean) : []);
        setOfferingTags(Array.isArray(row?.offering_tags) ? row!.offering_tags!.filter(Boolean) : []);
      } catch (e: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: String(e?.message || "No se pudo cargar el perfil profesional"),
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (profile?.id) void load();

    return () => {
      isMounted = false;
    };
  }, [profile.id, toast]);

  const workModeLabel = useMemo(() => {
    if (workMode === "remote") return "Remoto";
    if (workMode === "hybrid") return "Híbrido";
    if (workMode === "onsite") return "Presencial";
    return "";
  }, [workMode]);

  const addTag = (kind: "seeking" | "offering") => {
    const raw = (kind === "seeking" ? seekingInput : offeringInput).trim();
    if (!raw) return;

    const normalized = raw.replace(/\s+/g, " ").slice(0, 50);
    if (!normalized) return;

    if (kind === "seeking") {
      const nextLower = normalized.toLowerCase();
      if (seekingTags.some((t) => t.toLowerCase() === nextLower)) {
        setSeekingInput("");
        return;
      }
      setSeekingTags((prev) => [...prev, normalized]);
      setSeekingInput("");
    } else {
      const nextLower = normalized.toLowerCase();
      if (offeringTags.some((t) => t.toLowerCase() === nextLower)) {
        setOfferingInput("");
        return;
      }
      setOfferingTags((prev) => [...prev, normalized]);
      setOfferingInput("");
    }
  };

  const removeTag = (kind: "seeking" | "offering", tag: string) => {
    if (kind === "seeking") setSeekingTags((prev) => prev.filter((t) => t !== tag));
    else setOfferingTags((prev) => prev.filter((t) => t !== tag));
  };

  const save = async () => {
    if (!available) return;
    if (!isOwner) return;
    if (saving) return;

    setSaving(true);
    try {
      const payload = {
        profile_id: profile.id,
        headline: headline.trim() ? headline.trim() : null,
        city: city.trim() ? city.trim() : null,
        work_mode: workMode ? workMode : null,
        value_proposition: valueProposition.trim() ? valueProposition.trim() : null,
        seeking_tags: seekingTags,
        offering_tags: offeringTags,
      };

      const { error } = await (supabase as any)
        .from("profile_professional")
        .upsert(payload, { onConflict: "profile_id" });

      if (error) throw error;

      toast({
        title: "Guardado",
        description: "Tu información profesional se guardó correctamente.",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: String(e?.message || "No se pudo guardar"),
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
            <Briefcase className="h-4 w-4" />
            Perfil profesional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-10 bg-muted rounded animate-pulse" />
            <div className="h-10 bg-muted rounded animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Perfil profesional
          </CardTitle>
          {isOwner && (
            <Button type="button" size="sm" onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Headline</Label>
          {isOwner ? (
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Ej: Full‑Stack • Fintech • IA aplicada"
              disabled={saving}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{headline || ""}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Ciudad</Label>
            {isOwner ? (
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej: Bogotá"
                disabled={saving}
              />
            ) : (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{city || ""}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Modalidad</Label>
            {isOwner ? (
              <Select value={workMode || undefined} onValueChange={(v) => setWorkMode(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remoto</SelectItem>
                  <SelectItem value="hybrid">Híbrido</SelectItem>
                  <SelectItem value="onsite">Presencial</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">{workModeLabel}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Propuesta de valor</Label>
          {isOwner ? (
            <Textarea
              value={valueProposition}
              onChange={(e) => setValueProposition(e.target.value)}
              placeholder="En qué trabajas, qué buscas y qué ofreces."
              disabled={saving}
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{valueProposition || ""}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Busco</Label>
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <Input
                value={seekingInput}
                onChange={(e) => setSeekingInput(e.target.value)}
                placeholder="Ej: Cofounder, prácticas"
                disabled={saving}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag("seeking");
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={() => addTag("seeking")} disabled={!seekingInput.trim() || saving}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {seekingTags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs flex items-center gap-1">
                <span>{t}</span>
                {isOwner && (
                  <button type="button" onClick={() => removeTag("seeking", t)} disabled={saving}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Ofrezco</Label>
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <Input
                value={offeringInput}
                onChange={(e) => setOfferingInput(e.target.value)}
                placeholder="Ej: React, consultoría"
                disabled={saving}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag("offering");
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={() => addTag("offering")} disabled={!offeringInput.trim() || saving}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {offeringTags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs flex items-center gap-1">
                <span>{t}</span>
                {isOwner && (
                  <button type="button" onClick={() => removeTag("offering", t)} disabled={saving}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
