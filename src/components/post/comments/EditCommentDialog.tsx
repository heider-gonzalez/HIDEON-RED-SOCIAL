import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EditCommentDialogProps {
  commentId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (content: string) => void;
  initialContent: string;
  authorProfile?: {
    username?: string;
    avatar_url?: string;
  } | null;
}

export function EditCommentDialog({
  commentId: _commentId,
  isOpen,
  onOpenChange,
  onSave,
  initialContent,
  authorProfile,
}: EditCommentDialogProps) {
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
    }
  }, [isOpen, initialContent]);

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
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!content.trim()}>
              Guardar cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
