
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EditPostDialogProps {
  postId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (content: string) => void;
}

export function EditPostDialog({ postId, isOpen, onOpenChange, onSave }: EditPostDialogProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authorProfile, setAuthorProfile] = useState<any>(null);

  useEffect(() => {
    if (isOpen && postId) {
      const loadPost = async () => {
        try {
          setIsLoading(true);
          const { data } = await (supabase as any)
            .from("posts")
            .select(`
              content,
              profiles:profiles(id, username, avatar_url)
            `)
            .eq("id", postId)
            .single();
          
          if (data) {
            setContent(data.content || "");
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

  const handleSave = () => {
    onSave(content);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar publicación</DialogTitle>
          <DialogDescription>
            Modifica el contenido de tu publicación.
          </DialogDescription>
        </DialogHeader>
        
        {authorProfile && (
          <div className="flex items-center gap-3 pb-4 border-b">
            <Avatar className="h-8 w-8">
              <AvatarImage src={authorProfile.avatar_url || undefined} />
              <AvatarFallback>
                {authorProfile.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-sm">{authorProfile.username || 'Usuario'}</div>
              <div className="text-xs text-muted-foreground">Editando publicación</div>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="¿Qué estás pensando?"
            className="min-h-[120px]"
            disabled={isLoading}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !content.trim()}>
              {isLoading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
