import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link2, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { sharePost } from "@/lib/api/posts/queries/shares";
import type { Post } from "@/types/post";
import { playUiSound } from "@/lib/ui-sounds";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onSend?: () => void;
}

export function ShareModal({ isOpen, onClose, post, onSend }: ShareModalProps) {
  const [shareComment, setShareComment] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCopyLink = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      toast({
        title: "Enlace copiado",
        description: "El enlace de la publicación se ha copiado al portapapeles",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo copiar el enlace",
      });
    }
  };

  const handleShareToProfile = async () => {
    setIsSharing(true);
    
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ [ShareModal] Error obteniendo sesión:', sessionError);
        throw new Error('Error al verificar sesión');
      }
      
      const userId = sessionData.session?.user.id;
      
      if (!userId) {
        console.warn('⚠️ [ShareModal] Usuario no autenticado');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Debes iniciar sesión para compartir",
        });
        return;
      }

      const shareSuccess = await sharePost(post.id, 'profile', shareComment);
      
      if (!shareSuccess) {
        console.error('❌ [ShareModal] No se pudo registrar el compartir');
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo registrar el compartir",
        });
        return;
      }
      // 3. Crear el post compartido
      const authorUsername = post.profiles?.username || "Usuario";
      const postData = {
        content: shareComment || `Compartido de ${authorUsername}: ${post.content?.substring(0, 50)}${post.content && post.content.length > 50 ? '...' : ''}`,
        user_id: userId,
        media_type: null,
        visibility: 'public' as const,
        shared_post_id: post.id
      };
      
      const { error: insertError } = await (supabase as any)
        .from('posts')
        .insert(postData);

      if (insertError) {
        console.error('❌ [ShareModal] Error creando post compartido:', insertError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo compartir la publicación",
        });
        return;
      }
      
      queryClient.invalidateQueries({ queryKey: ['posts'] });

      playUiSound('share_success');

      toast({
        title: "¡Publicación compartida!",
        description: "La publicación ha sido compartida en tu perfil",
      });
      onClose();
      setShareComment("");
      
    } catch (error) {
      console.error('❌ [ShareModal] Error inesperado:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al compartir la publicación",
      });
    } finally {
      setIsSharing(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartir publicación
          </DialogTitle>
          <DialogDescription>
            Comparte esta publicación en tu perfil con un comentario opcional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {onSend && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                onClose();
                onSend();
              }}
            >
              Compartir por mensajes
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleCopyLink}
          >
            <Link2 className="h-4 w-4 mr-2" />
            Copiar enlace
          </Button>

          <Textarea
            value={shareComment}
            onChange={(e) => setShareComment(e.target.value)}
            placeholder="¿Qué piensas sobre esto?"
            rows={4}
            className="resize-none"
          />

          <Button
            onClick={handleShareToProfile}
            disabled={isSharing}
            className="w-full"
          >
            {isSharing ? "Compartiendo..." : "Compartir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}