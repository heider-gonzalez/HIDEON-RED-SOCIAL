import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EditCommentDialogProps {
  commentId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (content: string) => void;
}

export function EditCommentDialog({ commentId, isOpen, onOpenChange, onSave }: EditCommentDialogProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authorProfile, setAuthorProfile] = useState<any>(null);

  useEffect(() => {
    if (isOpen && commentId) {
      const loadComment = async () => {
        try {
          setIsLoading(true);
          const { data } = await (supabase as any)
            .from("comments")
            .select(`
              content,
              profiles:profiles(id, username, avatar_url)
            `)
            .eq("id", commentId)
            .single();
          
          if (data) {
            setContent(data.content || "");
            setAuthorProfile(data.profiles);
            console.log('Comentario cargado para edición:', data);
          }
        } catch (error) {
          console.error("Error loading comment:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadComment();
    }
  }, [isOpen, commentId]);

  const handleSave = () => {
    if (content.trim()) {
      onSave(content);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar comentario</DialogTitle>
          <DialogDescription>
            Modifica el contenido de tu comentario.
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
              <div className="text-xs text-muted-foreground">Editando comentario</div>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe tu comentario..."
            className="min-h-[100px]"
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
