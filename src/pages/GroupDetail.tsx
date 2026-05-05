import { useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Feed } from "@/components/feed/Feed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { uploadWithOptimization } from "@/lib/storage/cloudflare-r2";
import { ImagePlus, Lock, Trash2, Users } from "lucide-react";
import { useUserRoles } from "@/hooks/use-user-roles";
import { getHybridUrl } from "@/lib/hybrid-url";

function normalizeGroupName(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function validateGroupName(input: string) {
  const name = normalizeGroupName(input);
  const minLen = 3;
  const maxLen = 50;

  if (name.length < minLen) return { ok: false, message: `Mínimo ${minLen} caracteres.` };
  if (name.length > maxLen) return { ok: false, message: `Máximo ${maxLen} caracteres.` };
  if (!/\p{L}/u.test(name)) return { ok: false, message: "Debe incluir al menos una letra." };

  const allowed = /^[\p{L}\p{N}][\p{L}\p{N} ._-]*[\p{L}\p{N}]$/u;
  if (!allowed.test(name)) {
    return {
      ok: false,
      message: "Solo letras, números, espacios y . _ - (sin empezar/terminar con símbolo).",
    };
  }

  return { ok: true, message: "" };
}

export default function GroupDetail() {
  const { slugOrId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [joining, setJoining] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);

  const { data: authUser } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data?.user ?? null;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 0,
  });

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTagsInput, setEditTagsInput] = useState("");
  const [editRules, setEditRules] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);

  const slugOrIdSafe = useMemo(() => (slugOrId ?? "").trim(), [slugOrId]);

  const { data: groupRows, isLoading: groupLoading } = useQuery({
    queryKey: ["group-detail", slugOrIdSafe],
    enabled: !!slugOrIdSafe,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_group_by_slug_or_id", {
        slug_or_id_param: slugOrIdSafe,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const group = groupRows?.[0];
  const resolvedCoverUrl = getHybridUrl((group as any)?.cover_url) || null;

  const { data: myMembership } = useQuery({
    queryKey: ["group-my-membership", group?.id],
    enabled: !!group?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_group_membership", {
        group_id_param: group.id,
      });
      if (error) throw error;
      return ((data ?? []) as any[])[0] ?? null;
    },
  });

  const myRole = (myMembership as any)?.role as string | undefined;
  const isManager = myRole === "admin" || myRole === "moderator";
  const isAdmin = myRole === "admin";

  const { data: roles } = useUserRoles();
  const canDeleteGroup =
    isAdmin ||
    Boolean(roles?.isModeratorOrAdmin) ||
    String(authUser?.id || "") === "a12b715b-588a-41eb-bc09-5739bb579894";

  const { data: members } = useQuery({
    queryKey: ["group-members", group?.id],
    enabled: !!group?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_group_members", {
        group_id_param: group.id,
      });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: joinRequests } = useQuery({
    queryKey: ["group-join-requests", group?.id],
    enabled: !!group?.id && isManager,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_group_join_requests", {
        group_id_param: group.id,
      });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const tagsFromInput = (input: string) => {
    const raw = input
      .split(",")
      .flatMap((t) => {
        const trimmed = t.trim();
        return trimmed ? [trimmed] : [];
      });
    return Array.from(new Set(raw)).slice(0, 12);
  };

  const syncEditorFromGroup = () => {
    setEditName(String(group?.name || ""));
    setEditDescription(String(group?.description || ""));
    setEditCategory(String(group?.category || ""));
    setEditTagsInput(Array.isArray(group?.tags) ? (group.tags as any[]).join(", ") : "");
    setEditRules(String(group?.rules || ""));
    setEditIsPrivate(Boolean(group?.is_private));
  };

  const handleRequestJoin = async () => {
    if (!group?.id) return;
    setJoining(true);
    try {
      const { data, error } = await (supabase as any).rpc("request_to_join_group", {
        group_id_param: group.id,
      });
      if (error) throw error;

      const success = (data as any)?.success;
      const message = (data as any)?.message;
      const err = (data as any)?.error;

      if (success) {
        toast({
          title: "Solicitud enviada",
          description: message || "Tu solicitud fue enviada al equipo del grupo.",
        });
      } else {
        toast({
          title: "No se pudo enviar",
          description: err || "Intenta nuevamente.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Ocurrió un error.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  if (editName === "" && group?.name) {
    syncEditorFromGroup();
  }

  const handleRespondRequest = async (requestId: string, approve: boolean) => {
    if (!requestId) return;
    try {
      const { data, error } = await (supabase as any).rpc("respond_to_group_join_request", {
        request_id_param: requestId,
        approve_param: approve,
      });
      if (error) throw error;

      const success = (data as any)?.success;
      const message = (data as any)?.message;
      const err = (data as any)?.error;

      if (!success) {
        toast({ title: "No se pudo procesar", description: err || "Intenta nuevamente.", variant: "destructive" });
        return;
      }

      toast({ title: "Listo", description: message || "Solicitud procesada." });
      queryClient.invalidateQueries({ queryKey: ["group-join-requests", group?.id] });
      queryClient.invalidateQueries({ queryKey: ["group-members", group?.id] });
      queryClient.invalidateQueries({ queryKey: ["group-detail", slugOrIdSafe] });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Ocurrió un error.", variant: "destructive" });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!group?.id || !userId) return;
    try {
      const { data, error } = await (supabase as any).rpc("remove_group_member", {
        group_id_param: group.id,
        user_id_param: userId,
      });
      if (error) throw error;

      const success = (data as any)?.success;
      const err = (data as any)?.error;
      if (!success) {
        toast({ title: "No se pudo eliminar", description: err || "Intenta nuevamente.", variant: "destructive" });
        return;
      }

      toast({ title: "Listo", description: "Miembro eliminado del grupo." });
      queryClient.invalidateQueries({ queryKey: ["group-members", group?.id] });
      queryClient.invalidateQueries({ queryKey: ["group-detail", slugOrIdSafe] });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Ocurrió un error.", variant: "destructive" });
    }
  };

  const uploadGroupImage = async (type: "avatar" | "cover", e: React.ChangeEvent<HTMLInputElement>) => {
    if (!group?.id) return "";
    const file = e.target.files?.[0];
    if (!file) return "";
    if (!file.type.startsWith("image/")) {
      toast({ title: "Archivo inválido", description: "Solo se permiten imágenes.", variant: "destructive" });
      return "";
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: "Máximo 5MB.", variant: "destructive" });
      return "";
    }

    const setLoading = type === "avatar" ? setUploadingAvatar : setUploadingCover;
    setLoading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${group.id}_${type}_${Date.now()}.${fileExt}`;
      const publicUrl = await uploadWithOptimization(file, `groups/${group.id}/${type}/${fileName}`);

      const payload: any = {
        group_id_param: group.id,
      };
      if (type === "avatar") payload.avatar_url_param = publicUrl;
      else payload.cover_url_param = publicUrl;

      const { data, error } = await (supabase as any).rpc("update_group_profile", payload);
      if (error) throw error;

      const success = (data as any)?.success;
      const err = (data as any)?.error;
      if (!success) {
        toast({ title: "No se pudo actualizar", description: err || "Intenta nuevamente.", variant: "destructive" });
        return "";
      }

      toast({ title: "Actualizado", description: type === "avatar" ? "Foto del grupo actualizada." : "Portada del grupo actualizada." });
      queryClient.invalidateQueries({ queryKey: ["group-detail", slugOrIdSafe] });
      queryClient.invalidateQueries({ queryKey: ["explore-groups"] });
      return publicUrl;
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Ocurrió un error.", variant: "destructive" });
      return "";
    } finally {
      setLoading(false);
      try {
        e.target.value = "";
      } catch {
        // ignore
      }
    }
  };

  const handleSaveInfo = async () => {
    if (!group?.id) return;
    if (!isManager) return;

    const normalizedName = normalizeGroupName(editName);
    const nameValidation = validateGroupName(normalizedName);
    if (!nameValidation.ok) {
      toast({ title: "Nombre inválido", description: nameValidation.message, variant: "destructive" });
      return;
    }

    setSavingInfo(true);
    try {
      const { data, error } = await (supabase as any).rpc("update_group_profile", {
        group_id_param: group.id,
        name_param: normalizedName,
        description_param: editDescription,
        category_param: editCategory,
        tags_param: tagsFromInput(editTagsInput),
        rules_param: editRules,
        is_private_param: editIsPrivate,
      });
      if (error) throw error;

      const success = (data as any)?.success;
      const err = (data as any)?.error;
      if (!success) {
        toast({ title: "No se pudo guardar", description: err || "Intenta nuevamente.", variant: "destructive" });
        return;
      }

      toast({ title: "Guardado", description: "Información del grupo actualizada." });
      queryClient.invalidateQueries({ queryKey: ["group-detail", slugOrIdSafe] });
      queryClient.invalidateQueries({ queryKey: ["explore-groups"] });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Ocurrió un error.", variant: "destructive" });
    } finally {
      setSavingInfo(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!group?.id) return;
    try {
      const { data, error } = await (supabase as any).rpc("delete_group", {
        group_id_param: group.id,
      });
      if (error) throw error;

      const success = (data as any)?.success;
      const err = (data as any)?.error;
      if (!success) {
        toast({ title: "No se pudo eliminar", description: err || "Intenta nuevamente.", variant: "destructive" });
        return;
      }

      toast({ title: "Grupo eliminado", description: "El grupo fue eliminado correctamente." });
      queryClient.invalidateQueries({ queryKey: ["explore-groups"] });
      window.location.href = "/groups";
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Ocurrió un error.", variant: "destructive" });
    }
  };

  if (groupLoading) {
    return (
      <div className="w-full px-2 sm:px-4 pt-4">
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="w-full px-2 sm:px-4 pt-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Grupo no encontrado o no tienes acceso.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-2 sm:px-4 pt-4 pb-10">
      <div className="space-y-6">
          <div className="relative overflow-visible rounded-2xl border border-border">
            <div
              className="h-44 sm:h-56 bg-muted overflow-hidden rounded-t-2xl"
              style={{
                backgroundImage: resolvedCoverUrl ? `url(${resolvedCoverUrl})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {resolvedCoverUrl ? (
                <img src={resolvedCoverUrl} alt="Portada" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImagePlus className="h-10 w-10 text-muted-foreground/50" />
                </div>
              )}

              {isManager && (
                <div className="absolute top-3 right-3">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => uploadGroupImage("cover", e)}
                    disabled={uploadingCover}
                    ref={coverInputRef}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={uploadingCover}
                    className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {uploadingCover ? "Subiendo..." : "Editar portada"}
                  </Button>
                </div>
              )}

              <div className="absolute -bottom-10 left-4 flex items-end gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-4 border-background">
                    <AvatarImage src={group.avatar_url || undefined} />
                    <AvatarFallback>{(group.name || "G").slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {isManager && (
                    <div className="absolute -bottom-1 -right-1">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => uploadGroupImage("avatar", e)}
                        disabled={uploadingAvatar}
                        ref={avatarInputRef}
                      />
                      <Button
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        disabled={uploadingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        <ImagePlus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {canDeleteGroup && (
                <div className="absolute bottom-3 right-3">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar grupo
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar este grupo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Se eliminarán el grupo y sus miembros.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteGroup}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>

            <CardContent className="pt-16 sm:pt-20 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold truncate">{group.name}</h2>
                    {group.type && (
                      <Badge variant="secondary" className="text-xs">
                        {String(group.type).toUpperCase()}
                      </Badge>
                    )}
                    {group.is_private && (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        Privado
                      </Badge>
                    )}
                  </div>
                  {group.description && <p className="text-sm text-muted-foreground mt-1">{group.description}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {group.member_count ?? 0} miembros
                    </Badge>
                    {group.category && (
                      <Badge variant="outline" className="text-xs">
                        {group.category}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {myRole ? (
                    <Button variant="secondary" disabled>
                      Miembro
                    </Button>
                  ) : (
                    <Button onClick={handleRequestJoin} disabled={joining}>
                      {joining ? "Enviando..." : "Solicitar unirme"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </div>

          <Tabs defaultValue="posts" className="relative z-20 mt-14 sm:mt-12">
            <TabsList className="relative z-20 w-full justify-start pl-24 sm:pl-28 bg-background">
              <TabsTrigger value="posts">Publicaciones</TabsTrigger>
              <TabsTrigger value="members">Miembros</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>

            <TabsContent value="posts">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <Feed groupId={group.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="members">
              <div className="space-y-4">
                {isManager && (joinRequests?.length ?? 0) > 0 && (
                  <Card>
                    <CardContent className="p-4 sm:p-6 space-y-3">
                      <h3 className="font-semibold">Solicitudes pendientes</h3>
                      <div className="space-y-2">
                        {(joinRequests ?? []).map((r: any) => (
                          <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={r.avatar_url || undefined} />
                                <AvatarFallback>{String(r.username || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{r.username || "Usuario"}</p>
                                {r.message && <p className="text-xs text-muted-foreground truncate">{r.message}</p>}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="secondary" onClick={() => handleRespondRequest(String(r.id), false)}>
                                Rechazar
                              </Button>
                              <Button size="sm" onClick={() => handleRespondRequest(String(r.id), true)}>
                                Aprobar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="p-4 sm:p-6 space-y-3">
                    <h3 className="font-semibold">Miembros</h3>
                    <div className="space-y-2">
                      {(members ?? []).map((m: any) => (
                        <div key={m.user_id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={m.avatar_url || undefined} />
                              <AvatarFallback>{String(m.username || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{m.username || "Usuario"}</p>
                              <p className="text-xs text-muted-foreground">{String(m.role || "member")}</p>
                            </div>
                          </div>

                          {isManager && String(m.user_id) !== String(group.created_by) && (
                            <Button size="sm" variant="outline" onClick={() => handleRemoveMember(String(m.user_id))}>
                              Expulsar
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="info">
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4 sm:p-6 space-y-3">
                    <h3 className="font-semibold">Información</h3>

                    {isManager ? (
                      <>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Nombre</p>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Descripción</p>
                          <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Categoría</p>
                            <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Tags (separados por coma)</p>
                            <Input value={editTagsInput} onChange={(e) => setEditTagsInput(e.target.value)} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Reglas</p>
                          <Textarea value={editRules} onChange={(e) => setEditRules(e.target.value)} placeholder="Reglas del grupo" />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-border p-3">
                          <div>
                            <p className="text-sm font-medium">Grupo privado</p>
                            <p className="text-xs text-muted-foreground">Solo miembros podrán ver publicaciones.</p>
                          </div>
                          <Switch checked={editIsPrivate} onCheckedChange={setEditIsPrivate} />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={syncEditorFromGroup} disabled={savingInfo}>
                            Descartar
                          </Button>
                          <Button onClick={handleSaveInfo} disabled={savingInfo || editName.trim().length < 3}>
                            {savingInfo ? "Guardando..." : "Guardar"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        {group.category && <p className="text-sm">Categoría: {group.category}</p>}
                        {Array.isArray(group.tags) && (group.tags as any[]).length > 0 && (
                          <p className="text-sm">Tags: {(group.tags as any[]).join(", ")}</p>
                        )}
                        {group.rules && (
                          <div>
                            <p className="text-sm font-medium">Reglas</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{group.rules}</p>
                          </div>
                        )}
                        {!group.category && !group.rules && (!Array.isArray(group.tags) || (group.tags as any[]).length === 0) && (
                          <p className="text-sm text-muted-foreground">No hay información adicional.</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}
