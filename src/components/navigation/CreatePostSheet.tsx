import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  X, 
  Image as ImageIcon, 
  Tag, 
  Smile, 
  MapPin, 
  FileText,
  Lightbulb,
  FolderKanban,
  Users
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface CreatePostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabType = "post" | "idea" | "project";
type Visibility = "public" | "friends" | "private";

const textBackgrounds = [
  { key: "none", label: "Ninguno", gradient: "bg-white dark:bg-gray-800" },
  { key: "gradient-1", label: "Púrpura", gradient: "bg-gradient-to-br from-purple-500 to-purple-700" },
  { key: "gradient-2", label: "Rosa", gradient: "bg-gradient-to-br from-pink-500 to-pink-700" },
  { key: "gradient-3", label: "Cyan", gradient: "bg-gradient-to-br from-cyan-400 to-cyan-600" },
  { key: "gradient-4", label: "Magenta", gradient: "bg-gradient-to-br from-pink-500 to-purple-600" },
  { key: "gradient-5", label: "Verde", gradient: "bg-gradient-to-br from-green-400 to-green-600" },
  { key: "gradient-6", label: "Coral", gradient: "bg-gradient-to-br from-red-400 to-orange-500" },
];

export function CreatePostSheet({ open, onOpenChange }: CreatePostSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<TabType>("post");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [selectedBackground, setSelectedBackground] = useState("none");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [userGroups, setUserGroups] = useState<
    Array<{ group_id: string; group_name: string; status?: string }>
  >([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  const [userCompanies, setUserCompanies] = useState<
    Array<{ company_id: string; company_name: string; logo_url?: string | null }>
  >([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  const setTabWithTemplate = (tab: TabType) => {
    setActiveTab(tab);

    if (selectedFile) return;
    if (content.trim()) return;

    if (tab === "idea") {
      setContent(
        "Título: \n\n¿De qué trata?: \n\n¿A quién buscas (roles/skills)?: \n\nMeta en 2 semanas: \n\nContacto (WhatsApp/IG/Email): "
      );
      return;
    }

    if (tab === "project") {
      setContent(
        "Nombre del proyecto: \n\nProblema que resuelve: \n\nStack/Tecnologías: \n\nEstado (idea / en progreso / terminado): \n\nRoles que busco: \n\nLink (repo/demo): \n\nContacto: "
      );
    }
  };

  React.useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setUserProfile(data);
          }
        });
    }
  }, [user?.id]);

  React.useEffect(() => {
    if (!open) return;

    const loadUserGroups = async () => {
      setIsLoadingGroups(true);
      try {
        if (!user?.id) {
          setUserGroups([]);
          return;
        }

        const { data, error } = await (supabase as any).rpc('get_user_groups', {
          user_id_param: user.id,
        });
        if (error) throw error;

        const activeGroups = (data || []).filter((g: any) => g.status === 'active');
        setUserGroups(activeGroups);
      } catch (e) {
        console.error('Error loading user groups:', e);
        setUserGroups([]);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    const loadUserCompanies = async () => {
      setIsLoadingCompanies(true);
      try {
        if (!user?.id) {
          setUserCompanies([]);
          return;
        }

        const { data, error } = await (supabase as any)
          .from('company_members')
          .select('role, companies:companies(id, name, slug, logo_url)')
          .eq('user_id', user.id)
          .in('role', ['admin', 'editor']);
        if (error) throw error;

        const mapped = (data || [])
          .map((row: any) => {
            const c = row?.companies;
            if (!c?.id || !c?.name) return null;
            return {
              company_id: String(c.id),
              company_name: String(c.name),
              logo_url: c.logo_url ?? null,
            };
          })
          .filter(Boolean) as Array<{ company_id: string; company_name: string; logo_url?: string | null }>;

        const byId: Record<string, { company_id: string; company_name: string; logo_url?: string | null }> = {};
        mapped.forEach((c) => {
          byId[c.company_id] = c;
        });
        setUserCompanies(Object.values(byId).sort((a, b) => a.company_name.localeCompare(b.company_name)));
      } catch (e) {
        console.error('Error loading user companies:', e);
        setUserCompanies([]);
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    setSelectedGroupId('');
    setSelectedCompanyId('');
    loadUserGroups();
    loadUserCompanies();
  }, [open, user?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleSubmit = async () => {
    if ((!content.trim() && !selectedFile) || !user?.id) return;
    
    setIsSubmitting(true);
    
    try {
      let mediaUrl = null;
      let mediaType: 'image' | 'video' | 'audio' | null = null;

      // Upload file if present
      if (selectedFile) {
        try {
          const { uploadWithOptimization, getMediaType } = await import("@/lib/storage/cloudflare-r2");
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          
          mediaUrl = await uploadWithOptimization(selectedFile, fileName);
          mediaType = getMediaType(selectedFile);
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          toast({
            title: "Error al subir imagen",
            description: "No se pudo subir la imagen. Intenta con otra.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      const postData: any = {
        user_id: user.id,
        content: content.trim() || null,
        visibility,
        media_url: mediaUrl,
        media_type: mediaType,
      };

      if (selectedGroupId) {
        postData.group_id = selectedGroupId;
      }

      if (selectedCompanyId) {
        postData.company_id = selectedCompanyId;
      }

      // Add background if selected and no file
      if (selectedBackground !== "none" && !selectedFile) {
        postData.background_color = selectedBackground;
      }

      // Handle different post types
      if (activeTab === "idea") {
        postData.post_type = "idea";
        postData.idea = {
          title: content.split('\n')[0] || "Nueva Idea",
          description: content,
          participants: []
        };
      } else if (activeTab === "project") {
        postData.post_type = "project";
      }

      const { data, error } = await (supabase as any)
        .from("posts")
        .insert(postData)
        .select(`
          *,
          profiles:profiles(id, username, avatar_url, career),
          comments:comments(count)
        `)
        .single();

      if (error) throw error;

      try {
        const createdPost: any = {
          ...(data || {}),
        };

        createdPost.comments_count =
          (createdPost.comments && Array.isArray(createdPost.comments) && createdPost.comments[0]?.count) ||
          createdPost.comments_count ||
          0;

        if (typeof createdPost.reactions_count !== 'number') createdPost.reactions_count = 0;
        if (typeof createdPost.shares_count !== 'number') createdPost.shares_count = 0;
        if (typeof createdPost.views_count !== 'number') createdPost.views_count = 0;

        const queryCache = queryClient.getQueryCache();
        const targets = queryCache.findAll({ queryKey: ["posts"], exact: false });

        targets.forEach((q) => {
          const key = q.queryKey as any[];
          if (!Array.isArray(key)) return;
          if (key[key.length - 1] !== 'infinite') return;

          queryClient.setQueryData(key, (old: any) => {
            if (!old || !Array.isArray(old.pages)) return old;
            const pages = [...old.pages];
            const first = pages[0];
            if (!first || !Array.isArray(first.posts)) return old;

            const existing = first.posts as any[];
            const id = String(createdPost?.id || '');
            if (!id) return old;

            const filtered = existing.filter((p) => String((p as any)?.id || '') !== id);
            const nextFirst = {
              ...first,
              posts: [createdPost, ...filtered],
            };
            pages[0] = nextFirst;
            return {
              ...old,
              pages,
            };
          });
        });
      } catch {
        // ignore
      }

      // Invalidar múltiples queries para asegurar actualización
      queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["feed"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["user-posts"], exact: false });
      queryClient.refetchQueries({ queryKey: ["posts"], exact: false });

      try {
        window.dispatchEvent(new Event('hsocial:home_refresh'));
      } catch {
        // ignore
      }
      
      toast({
        title: "Listo",
        description: "Ya quedó compartido con la comunidad",
      });

      // Reset form
      setContent("");
      setSelectedBackground("none");
      setSelectedFile(null);
      setFilePreview(null);
      setSelectedGroupId('');
      setSelectedCompanyId('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "No pudimos publicarlo. Intenta de nuevo en un momento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] p-0 rounded-t-2xl"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b flex flex-row items-center justify-between space-y-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-5 w-5" />
          </Button>
          <SheetTitle className="text-base font-semibold">Crear publicación</SheetTitle>
          <div className="w-8" />
        </SheetHeader>

        <SheetDescription className="px-4 pt-2 text-xs text-muted-foreground">
          Comparte un avance, una idea o una pregunta. Aquí se vale empezar simple.
        </SheetDescription>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <Button
              variant="ghost"
              className={`flex-1 rounded-none border-b-2 ${
                activeTab === "post" 
                  ? "border-foreground font-semibold" 
                  : "border-transparent"
              }`}
              onClick={() => setTabWithTemplate("post")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Publicación
            </Button>
            <Button
              variant="ghost"
              className={`flex-1 rounded-none border-b-2 ${
                activeTab === "idea" 
                  ? "border-foreground font-semibold" 
                  : "border-transparent"
              }`}
              onClick={() => setTabWithTemplate("idea")}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Idea
            </Button>
            <Button
              variant="ghost"
              className={`flex-1 rounded-none border-b-2 ${
                activeTab === "project" 
                  ? "border-foreground font-semibold" 
                  : "border-transparent"
              }`}
              onClick={() => setTabWithTemplate("project")}
            >
              <FolderKanban className="h-4 w-4 mr-2" />
              Proyecto
            </Button>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback>
                {userProfile?.username?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{userProfile?.username || "Usuario"}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent"
              >
                <Users className="h-3 w-3 mr-1" />
                Amigos
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-[220px] w-full">
              <Select
                value={selectedCompanyId || 'profile'}
                onValueChange={(value) => {
                  const next = value === 'profile' ? '' : value;
                  setSelectedCompanyId(next);
                  if (next) setSelectedGroupId('');
                }}
                disabled={isLoadingCompanies}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Mi perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profile">Mi perfil</SelectItem>
                  {userCompanies.map((c) => (
                    <SelectItem key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[220px] w-full">
              <Select
                value={selectedGroupId || 'profile'}
                onValueChange={(value) => setSelectedGroupId(value === 'profile' ? '' : value)}
                disabled={isLoadingGroups || userGroups.length === 0 || Boolean(selectedCompanyId)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Mi perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profile">Mi perfil</SelectItem>
                  {userGroups.map((g) => (
                    <SelectItem key={g.group_id} value={g.group_id}>
                      {g.group_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content Input */}
          <Textarea
            placeholder={
              activeTab === "idea" 
                ? "Cuéntanos tu idea…" 
                : activeTab === "project" 
                ? "Cuéntanos de tu proyecto…" 
                : "¿Qué quieres compartir hoy?"
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none border-none focus-visible:ring-0 text-base"
          />

          {/* File Preview */}
          {filePreview && (
            <div className="relative">
              <img src={filePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
              <Button
                variant="ghost"
                size="icon"
                onClick={removeFile}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
          )}
          {selectedFile && !filePreview && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm truncate">{selectedFile.name}</span>
              <Button variant="ghost" size="icon" onClick={removeFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Text Background Palette */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Fondo del texto</p>
            <div className="grid grid-cols-4 gap-2">
              {textBackgrounds.map((bg) => (
                <button
                  key={bg.key}
                  onClick={() => setSelectedBackground(bg.key)}
                  className={`h-12 rounded-lg ${bg.gradient} flex items-center justify-center text-white text-xs font-medium transition-transform ${
                    selectedBackground === bg.key 
                      ? "ring-2 ring-offset-2 ring-primary scale-105" 
                      : ""
                  }`}
                >
                  Aa
                </button>
              ))}
            </div>
          </div>

          {/* Add to Publication */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Agregar a tu publicación</p>
            <div className="flex items-center gap-2">
              <label>
                <input
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  asChild
                >
                  <span>
                    <ImageIcon className="h-5 w-5 text-green-500" />
                  </span>
                </Button>
              </label>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
              >
                <Tag className="h-5 w-5 text-blue-500" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
              >
                <Smile className="h-5 w-5 text-yellow-500" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
              >
                <MapPin className="h-5 w-5 text-red-500" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
              >
                <FileText className="h-5 w-5 text-purple-500" />
              </Button>
            </div>
          </div>

          {/* Visibility Selector */}
          <div>
            <select 
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              className="w-full p-3 border rounded-lg bg-background"
            >
              <option value="public">👥 Público</option>
              <option value="friends">👫 Amigos</option>
              <option value="private">🔒 Privado</option>
            </select>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={(!content.trim() && !selectedFile) || isSubmitting}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg"
          >
            {isSubmitting ? "Compartiendo..." : "Compartir"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

}
