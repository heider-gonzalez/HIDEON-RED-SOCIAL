import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FacebookLayout } from "@/components/layout/FacebookLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CreateGroup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [rules, setRules] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [groupType, setGroupType] = useState<"project" | "community">("community");
  const [saving, setSaving] = useState(false);

  const tags = useMemo(() => {
    const raw = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    return Array.from(new Set(raw)).slice(0, 12);
  }, [tagsInput]);

  const canSubmit = name.trim().length >= 3 && category.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user?.id) {
        toast({
          title: "Sesión requerida",
          description: "Inicia sesión para crear un grupo.",
          variant: "destructive",
        });
        return;
      }

      const baseSlug = slugify(name);
      const fallbackSlug = `group-${Date.now()}`;
      const groupSlug = baseSlug || fallbackSlug;

      const { data, error } = await (supabase as any).rpc("create_group_atomic", {
        group_name: name.trim(),
        group_description: description.trim(),
        group_slug: groupSlug,
        is_private: isPrivate,
        category: category.trim(),
        tags,
        rules: rules.trim(),
        creator_id: user.id,
        group_type: groupType,
      });

      if (error) throw error;

      const success = (data as any)?.success;
      const groupId = (data as any)?.group_id;
      const status = (data as any)?.status;
      const message = (data as any)?.message;
      const err = (data as any)?.error;

      if (!success) {
        toast({
          title: "No se pudo crear",
          description: err || "Intenta nuevamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Grupo creado",
        description:
          status === "pending_approval"
            ? "Tu grupo quedó pendiente de aprobación."
            : message || "Grupo creado exitosamente.",
      });

      queryClient.invalidateQueries({ queryKey: ["explore-groups"] });

      navigate(`/groups/${groupSlug || groupId}`);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Ocurrió un error.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FacebookLayout>
      <div className="w-full px-2 sm:px-4 max-w-3xl pt-4 pb-10">
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-5">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del grupo" />
              <p className="text-xs text-muted-foreground">Mínimo 3 caracteres.</p>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="¿De qué se trata el grupo?"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={groupType} onValueChange={(v) => setGroupType(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="community">Comunidad</SelectItem>
                    <SelectItem value="project">Proyecto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ej: Ingeniería, Salud, Marketing"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags (separados por coma)</Label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ej: IA, redes, investigación"
              />
              {tags.length > 0 && (
                <p className="text-xs text-muted-foreground">Tags: {tags.join(", ")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Reglas</Label>
              <Textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Reglas básicas del grupo (opcional)"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Grupo privado</p>
                <p className="text-xs text-muted-foreground">
                  Si está activo, solo miembros podrán ver el contenido.
                </p>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
                {saving ? "Creando..." : "Crear"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </FacebookLayout>
  );
}
