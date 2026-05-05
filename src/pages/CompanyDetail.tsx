import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FullScreenPageLayout } from "@/components/layout/FullScreenPageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Feed } from "@/components/feed/Feed";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getHybridUrl } from "@/lib/hybrid-url";

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  website_url: string | null;
  status: string;
  created_by?: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function CompanyDetail() {
  const { slugOrId } = useParams();
  const slugOrIdSafe = useMemo(() => (slugOrId ?? "").trim(), [slugOrId]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [manageOpen, setManageOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    logo_url: '',
    cover_url: '',
    description: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<'member' | 'editor' | 'admin'>('member');
  const [savingMember, setSavingMember] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ["company-detail", slugOrIdSafe],
    enabled: !!slugOrIdSafe,
    queryFn: async () => {
      if (!slugOrIdSafe) return null;

      if (isUuid(slugOrIdSafe)) {
        const { data, error } = await (supabase as any)
          .from("companies")
          .select("id, name, slug, description, logo_url, cover_url, website_url, status, created_by")
          .eq("id", slugOrIdSafe)
          .single();
        if (error) throw error;
        return data as CompanyRow;
      }

      const { data, error } = await (supabase as any)
        .from("companies")
        .select("id, name, slug, description, logo_url, cover_url, website_url, status, created_by")
        .eq("slug", slugOrIdSafe)
        .single();
      if (error) throw error;
      return data as CompanyRow;
    },
  });

  const { data: myRole } = useQuery({
    queryKey: ["company-my-role", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !company?.id) return null;

      const { data, error } = await (supabase as any)
        .from("company_members")
        .select("role")
        .eq("company_id", company.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return (data?.role as string | undefined) ?? null;
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["company-members", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("company_members")
        .select("user_id, role, profiles:profiles(id, username, avatar_url)")
        .eq("company_id", company.id)
        .order("role", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const adminsCount = useMemo(() => {
    return (members || []).filter((m: any) => String(m?.role) === 'admin').length;
  }, [members]);

  const isAdmin = useMemo(() => {
    if ((company as any)?.created_by) {
      // fallback: creator should have admin powers
      // (companies RLS allows created_by anyway)
      // myRole can be null if not a member yet
      return myRole === 'admin' || myRole === 'editor' ? myRole === 'admin' : false;
    }
    return myRole === 'admin';
  }, [company, myRole]);

  const canManageMembers = myRole === 'admin';

  const openEditProfile = () => {
    if (!company) return;
    setEditForm({
      logo_url: company.logo_url || '',
      cover_url: company.cover_url || '',
      description: company.description || '',
    });
    setEditProfileOpen(true);
  };

  const saveProfile = async () => {
    if (!company?.id) return;
    setSavingProfile(true);
    try {
      const { error } = await (supabase as any)
        .from('companies')
        .update({
          logo_url: editForm.logo_url || null,
          cover_url: editForm.cover_url || null,
          description: editForm.description || null,
        })
        .eq('id', company.id);
      if (error) throw error;
      toast({ title: 'Perfil actualizado', description: 'Los cambios se guardaron correctamente.' });
      queryClient.invalidateQueries({ queryKey: ['company-detail', slugOrIdSafe] });
      setEditProfileOpen(false);
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'No se pudo actualizar el perfil',
        variant: 'destructive',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const addMemberByUsername = async () => {
    if (!company?.id) return;
    const username = newMemberUsername.trim();
    if (!username) return;
    if (savingMember) return;

    setSavingMember(true);
    try {
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('id, username')
        .eq('username', username)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile?.id) {
        toast({
          title: 'Usuario no encontrado',
          description: 'Verifica el username e intenta de nuevo.',
          variant: 'destructive',
        });
        return;
      }

      const { error: insertError } = await (supabase as any)
        .from('company_members')
        .insert({
          company_id: company.id,
          user_id: profile.id,
          role: newMemberRole,
        });
      if (insertError) throw insertError;

      toast({ title: 'Miembro agregado', description: 'El usuario fue agregado a la empresa.' });
      setNewMemberUsername('');
      setNewMemberRole('member');
      queryClient.invalidateQueries({ queryKey: ['company-members', company.id] });
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'No se pudo agregar el miembro',
        variant: 'destructive',
      });
    } finally {
      setSavingMember(false);
    }
  };

  const updateMemberRole = async (userId: string, role: 'member' | 'editor' | 'admin') => {
    if (!company?.id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isSelf = user?.id === userId;
      if (isSelf && myRole === 'admin' && adminsCount <= 1 && role !== 'admin') {
        toast({
          title: 'Acción no permitida',
          description: 'No puedes quitar el último admin de la empresa.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await (supabase as any)
        .from('company_members')
        .update({ role })
        .eq('company_id', company.id)
        .eq('user_id', userId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['company-members', company.id] });
      queryClient.invalidateQueries({ queryKey: ['company-my-role', company.id] });
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'No se pudo actualizar el rol',
        variant: 'destructive',
      });
    }
  };

  const removeMember = async (userId: string) => {
    if (!company?.id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isSelf = user?.id === userId;
      const member = (members || []).find((m: any) => String(m?.user_id) === String(userId));
      const isRemovingAdmin = String(member?.role) === 'admin';

      if (isSelf && isRemovingAdmin && adminsCount <= 1) {
        toast({
          title: 'Acción no permitida',
          description: 'No puedes salir siendo el último admin de la empresa.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await (supabase as any)
        .from('company_members')
        .delete()
        .eq('company_id', company.id)
        .eq('user_id', userId);
      if (error) throw error;

      toast({ title: 'Miembro eliminado', description: 'El miembro fue removido.' });
      queryClient.invalidateQueries({ queryKey: ['company-members', company.id] });
      queryClient.invalidateQueries({ queryKey: ['company-my-role', company.id] });
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'No se pudo remover el miembro',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <FullScreenPageLayout title="Empresa">
        <div className="container px-2 sm:px-4 max-w-5xl pt-4">
          <div className="h-40 bg-muted animate-pulse rounded-lg" />
        </div>
      </FullScreenPageLayout>
    );
  }

  if (!company) {
    return (
      <FullScreenPageLayout title="Empresa">
        <div className="container px-2 sm:px-4 max-w-5xl pt-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Empresa no encontrada o no tienes acceso.</p>
            </CardContent>
          </Card>
        </div>
      </FullScreenPageLayout>
    );
  }

  return (
    <FullScreenPageLayout title={company.name || "Empresa"}>
      <div className="container px-2 sm:px-4 max-w-5xl pt-4 pb-10 space-y-4">
        <Card>
          <CardContent className="p-0 overflow-hidden">
            <div className="h-32 sm:h-40 bg-muted relative">
              {company.cover_url ? (
                <img src={getHybridUrl(company.cover_url) || "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="p-4 sm:p-6 flex items-start gap-4">
              <Avatar className="h-16 w-16 -mt-10 border-4 border-background">
                <AvatarImage src={getHybridUrl(company.logo_url) || undefined} />
                <AvatarFallback>{(company.name || "E").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold truncate">{company.name}</h2>
                  <Badge variant="secondary" className="text-xs">Empresa</Badge>
                  {(isAdmin || myRole === 'editor') && (
                    <Button size="sm" variant="outline" onClick={openEditProfile}>
                      Editar perfil
                    </Button>
                  )}
                </div>
                {company.description && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{company.description}</p>
                )}
                {company.website_url && (
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline mt-2 inline-block"
                  >
                    {company.website_url}
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-3">
                <div>
                  <p className="text-sm font-semibold">Representantes</p>
                  <p className="text-xs text-muted-foreground">{members.length} miembro(s)</p>
                </div>
                <div className="space-y-2">
                  {members.slice(0, 8).map((m: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={m?.profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(m?.profiles?.username || "U").slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{m?.profiles?.username || "Usuario"}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {String(m?.role || "member").toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>

                {canManageMembers ? (
                  <div className="pt-2">
                    <Button className="w-full" variant="secondary" onClick={() => setManageOpen(true)}>
                      Administrar miembros
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Feed companyId={company.id} />
          </div>
        </div>

        <Dialog open={manageOpen} onOpenChange={setManageOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Administrar miembros</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  value={newMemberUsername}
                  onChange={(e) => setNewMemberUsername(e.target.value)}
                  placeholder="Username"
                  disabled={savingMember}
                />
                <Select
                  value={newMemberRole}
                  onValueChange={(v) => setNewMemberRole(v as any)}
                  disabled={savingMember}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Miembro</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addMemberByUsername} disabled={savingMember || !newMemberUsername.trim()}>
                  Agregar
                </Button>
              </div>

              <div className="space-y-2">
                {(members || []).map((m: any) => {
                  const uid = String(m?.user_id || '');
                  const uname = String(m?.profiles?.username || 'Usuario');
                  const avatar = m?.profiles?.avatar_url || null;

                  return (
                    <div key={uid} className="flex items-center gap-3 border rounded-md p-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={avatar || undefined} />
                        <AvatarFallback>{uname.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{uname}</p>
                        <p className="text-xs text-muted-foreground truncate">{uid}</p>
                      </div>

                      <div className="w-[160px]">
                        <Select
                          value={String(m?.role || 'member')}
                          onValueChange={(v) => updateMemberRole(uid, v as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Miembro</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button variant="destructive" onClick={() => removeMember(uid)}>
                        Remover
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogDescription className="sr-only">Descripción del diálogo</DialogDescription>
</DialogContent>
        </Dialog>

        <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar perfil de empresa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">URL del logo</label>
                <Input
                  value={editForm.logo_url}
                  onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
                  placeholder="https://ejemplo.com/logo.png"
                  disabled={savingProfile}
                />
              </div>
              <div>
                <label className="text-sm font-medium">URL de la portada</label>
                <Input
                  value={editForm.cover_url}
                  onChange={(e) => setEditForm({ ...editForm, cover_url: e.target.value })}
                  placeholder="https://ejemplo.com/portada.png"
                  disabled={savingProfile}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descripción</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Describe tu empresa..."
                  rows={4}
                  disabled={savingProfile}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditProfileOpen(false)} disabled={savingProfile}>
                  Cancelar
                </Button>
                <Button onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
            <DialogDescription className="sr-only">Descripción del diálogo</DialogDescription>
</DialogContent>
        </Dialog>
      </div>
    </FullScreenPageLayout>
  );
}
