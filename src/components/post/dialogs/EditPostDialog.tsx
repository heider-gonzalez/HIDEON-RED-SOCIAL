
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Upload, Image, Video, Music, FileText, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Post } from "@/types/post";

interface EditPostDialogProps {
  postId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedPost: Partial<Post>) => void;
}

export function EditPostDialog({ postId, isOpen, onOpenChange, onSave }: EditPostDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const [postData, setPostData] = useState<Partial<Post>>({});
  
  // Form state
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Post['visibility']>('public');
  const [postType, setPostType] = useState<string>('post');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaUrl, setMediaUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [projectStatus, setProjectStatus] = useState<Post['project_status']>(null);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [demoCategory, setDemoCategory] = useState("");
  const [demoSource, setDemoSource] = useState("");
  const [demoReadonly, setDemoReadonly] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      const loadPost = async () => {
        try {
          setIsLoading(true);
          const { data } = await (supabase as any)
            .from("posts")
            .select(`
              *,
              profiles:profiles(id, username, avatar_url)
            `)
            .eq("id", postId)
            .single();
          
          if (data) {
            setPostData(data);
            setContent(data.content || "");
            setVisibility(data.visibility || 'public');
            setPostType(data.post_type || 'post');
            setMediaUrls(data.media_urls || []);
            setDemoUrl(data.demo_url || "");
            setProjectStatus(data.project_status || null);
            setTechnologies(data.technologies || []);
            setIsDemo(data.is_demo || false);
            setDemoCategory(data.demo_category || "");
            setDemoSource(data.demo_source || "");
            setDemoReadonly(data.demo_readonly || false);
            setAuthorProfile(data.profiles);
            console.log('Post cargado para edición:', data);
          }
        } catch (error) {
          console.error("Error loading post:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadPost();
    }
  }, [isOpen, postId]);

  const handleAddMediaUrl = () => {
    if (mediaUrl.trim() && !mediaUrls.includes(mediaUrl.trim())) {
      setMediaUrls([...mediaUrls, mediaUrl.trim()]);
      setMediaUrl("");
    }
  };

  const handleRemoveMediaUrl = (urlToRemove: string) => {
    setMediaUrls(mediaUrls.filter(url => url !== urlToRemove));
  };

  const handleAddTechnology = () => {
    if (techInput.trim() && !technologies.includes(techInput.trim())) {
      setTechnologies([...technologies, techInput.trim()]);
      setTechInput("");
    }
  };

  const handleRemoveTechnology = (techToRemove: string) => {
    setTechnologies(technologies.filter(tech => tech !== techToRemove));
  };

  const getFileIcon = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return <Image className="h-4 w-4" />;
    }
    if (['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(extension || '')) {
      return <Video className="h-4 w-4" />;
    }
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension || '')) {
      return <Music className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const handleSave = () => {
    const updatedPost: Partial<Post> = {
      content: content.trim() || null,
      visibility,
      post_type: postType,
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      demo_url: demoUrl.trim() || null,
      project_status: projectStatus,
      technologies: technologies.length > 0 ? technologies : null,
      is_demo: isDemo,
      demo_category: demoCategory.trim() || null,
      demo_source: demoSource.trim() || null,
      demo_readonly: demoReadonly,
      updated_at: new Date().toISOString()
    };

    onSave(updatedPost);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar publicación</DialogTitle>
          <DialogDescription>
            Modifica todos los campos de tu publicación.
          </DialogDescription>
        </DialogHeader>
        
        {authorProfile && (
          <div className="flex items-center gap-3 pb-4 border-b">
            <Avatar className="h-10 w-10">
              <AvatarImage src={authorProfile.avatar_url || undefined} />
              <AvatarFallback>
                {authorProfile.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{authorProfile.username || 'Usuario'}</div>
              <div className="text-sm text-muted-foreground">Editando publicación</div>
            </div>
          </div>
        )}
        
        <div className="space-y-6">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Contenido</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="¿Qué estás pensando?"
              className="min-h-[120px]"
              disabled={isLoading}
            />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibilidad</Label>
            <Select value={visibility} onValueChange={(value: Post['visibility']) => setVisibility(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">🌍 Público</SelectItem>
                <SelectItem value="friends">👥 Amigos</SelectItem>
                <SelectItem value="private">🔒 Privado</SelectItem>
                <SelectItem value="incognito">👤 Incógnito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Post Type */}
          <div className="space-y-2">
            <Label htmlFor="postType">Tipo de publicación</Label>
            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="post">📝 Publicación normal</SelectItem>
                <SelectItem value="project">🚀 Proyecto</SelectItem>
                <SelectItem value="idea">💡 Idea</SelectItem>
                <SelectItem value="demo">🎮 Demo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Media URLs */}
          <div className="space-y-2">
            <Label>Archivos multimedia</Label>
            <div className="flex gap-2">
              <Input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="URL de imagen, video o archivo"
                disabled={isLoading}
              />
              <Button 
                type="button" 
                onClick={handleAddMediaUrl}
                disabled={!mediaUrl.trim() || isLoading}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {mediaUrls.length > 0 && (
              <div className="space-y-2">
                {mediaUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                    {getFileIcon(url)}
                    <span className="text-sm flex-1 truncate">{url}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMediaUrl(url)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Demo URL (for projects) */}
          {(postType === 'project' || postType === 'demo') && (
            <div className="space-y-2">
              <Label htmlFor="demoUrl">URL de Demo</Label>
              <Input
                id="demoUrl"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://ejemplo.com/demo"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Project Status */}
          {postType === 'project' && (
            <div className="space-y-2">
              <Label htmlFor="projectStatus">Estado del proyecto</Label>
              <Select value={projectStatus || ''} onValueChange={(value: Post['project_status']) => setProjectStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">💡 Idea</SelectItem>
                  <SelectItem value="in_progress">🚧 En desarrollo</SelectItem>
                  <SelectItem value="completed">✅ Completado</SelectItem>
                  <SelectItem value="paused">⏸️ Pausado</SelectItem>
                  <SelectItem value="cancelled">❌ Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Technologies */}
          {postType === 'project' && (
            <div className="space-y-2">
              <Label>Tecnologías</Label>
              <div className="flex gap-2">
                <Input
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  placeholder="Ej: React, TypeScript, Node.js"
                  disabled={isLoading}
                />
                <Button 
                  type="button" 
                  onClick={handleAddTechnology}
                  disabled={!techInput.trim() || isLoading}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {technologies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {technologies.map((tech, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tech}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => handleRemoveTechnology(tech)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Demo Settings */}
          {postType === 'demo' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="demoCategory">Categoría de Demo</Label>
                <Input
                  id="demoCategory"
                  value={demoCategory}
                  onChange={(e) => setDemoCategory(e.target.value)}
                  placeholder="Ej: Juego, Aplicación, Herramienta"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demoSource">Fuente/Repositorio</Label>
                <Input
                  id="demoSource"
                  value={demoSource}
                  onChange={(e) => setDemoSource(e.target.value)}
                  placeholder="https://github.com/usuario/repo"
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="demoReadonly"
                  checked={demoReadonly}
                  onChange={(e) => setDemoReadonly(e.target.checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="demoReadonly">Demo de solo lectura</Label>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
