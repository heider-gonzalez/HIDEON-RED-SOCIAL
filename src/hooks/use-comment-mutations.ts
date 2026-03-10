
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createComment } from "@/lib/api/comments";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { uploadMediaFile, getMediaType } from "@/lib/api/posts/storage";

export function useCommentMutations(postId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateCommentInCache = (
    data: any,
    commentId: string,
    patch: (c: any) => any
  ) => {
    if (!data?.pages) return data;

    const patchInReplies = (arr: any[]): any[] => {
      return arr.map((c) => {
        if (String(c?.id) === String(commentId)) {
          return patch(c);
        }
        if (Array.isArray(c?.replies) && c.replies.length > 0) {
          return { ...c, replies: patchInReplies(c.replies) };
        }
        return c;
      });
    };

    return {
      ...data,
      pages: data.pages.map((page: any) => ({
        ...page,
        comments: patchInReplies(page?.comments || []),
      })),
    };
  };

  const { mutate: submitComment } = useMutation({
    mutationFn: async ({ 
      content, 
      replyToId, 
      image 
    }: { 
      content: string; 
      replyToId?: string; 
      image?: File | null 
    }) => {
      // Si no hay contenido ni imagen, mostrar error
      if (!content.trim() && !image) {
        throw new Error("El comentario no puede estar vacío");
      }

      let mediaUrl = null;
      let mediaType = null;

      // Si hay una imagen, subir al almacenamiento
      if (image) {
        mediaUrl = await uploadMediaFile(image);
        mediaType = getMediaType(image);
      }

      return createComment(postId, content, replyToId, mediaUrl, mediaType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      toast({
        title: "Comentario añadido",
        description: "Tu comentario se ha publicado correctamente",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Error al publicar el comentario",
      });
    },
  });

  const { mutate: deleteComment } = useMutation({
    mutationFn: async (commentId: string) => {
      // Verificar que el usuario está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Debes iniciar sesión para eliminar un comentario");
      }
      
      // Obtener el comentario para verificar la propiedad
      const { data: comment } = await (supabase as any)
        .from('comments')
        .select('user_id')
        .eq('id', commentId)
        .single();
      
      if (!comment) {
        throw new Error("Comentario no encontrado");
      }
      
      if (comment.user_id !== user.id) {
        const [{ data: isMod }, { data: isAdmin }] = await Promise.all([
          (supabase.rpc as any)("has_role", { _role: "moderator", _user_id: user.id }),
          (supabase.rpc as any)("has_role", { _role: "admin", _user_id: user.id }),
        ]);

        if (!Boolean(isMod) && !Boolean(isAdmin)) {
          throw new Error("No tienes permiso para eliminar este comentario");
        }
      }
      
      // Eliminar el comentario
      const { error } = await (supabase as any)
        .from('comments')
        .delete()
        .eq('id', commentId);
        
      if (error) throw error;
      
      return { success: true };
    },
    onMutate: async (commentId: string) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      const previous = queryClient.getQueryData(["comments", postId]);

      const removeFromArr = (arr: any[]): { next: any[]; removed: boolean } => {
        let removed = false;
        const next = (arr || [])
          .map((c) => {
            if (!c) return c;

            if (String(c?.id) === String(commentId)) {
              removed = true;
              return null;
            }

            if (Array.isArray(c?.replies) && c.replies.length > 0) {
              const { next: nextReplies, removed: removedReply } = removeFromArr(c.replies);
              if (removedReply) {
                removed = true;
                const currentCount = Number(c?.replies_count || c?.replies?.length || 0);
                return {
                  ...c,
                  replies: nextReplies,
                  replies_count: Math.max(0, currentCount - 1),
                };
              }
            }

            return c;
          })
          .filter(Boolean);

        return { next, removed };
      };

      queryClient.setQueryData(["comments", postId], (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => {
            const { next } = removeFromArr(page?.comments || []);
            return {
              ...page,
              comments: next,
            };
          }),
        };
      });

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      toast({
        title: "Comentario eliminado",
        description: "El comentario se ha eliminado correctamente",
      });
    },
    onError: (error, _vars, context) => {
      console.error("Error deleting comment:", error);

      const previous = (context as any)?.previous;
      if (previous) {
        queryClient.setQueryData(["comments", postId], previous);
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el comentario",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });

  const { mutateAsync: editCommentAsync } = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      // Verificar que el usuario está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Debes iniciar sesión para editar un comentario");
      }
      
      // Obtener el comentario para verificar la propiedad
      const { data: comment } = await (supabase as any)
        .from('comments')
        .select('user_id')
        .eq('id', commentId)
        .single();
      
      if (!comment) {
        throw new Error("Comentario no encontrado");
      }
      
      if (comment.user_id !== user.id) {
        throw new Error("No tienes permiso para editar este comentario");
      }
      
      const { error } = await (supabase as any)
        .from('comments')
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId);
        
      if (error) throw error;
      
      return { success: true };
    },
    onMutate: async ({ commentId, content }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      const previous = queryClient.getQueryData(["comments", postId]);

      queryClient.setQueryData(["comments", postId], (old: any) =>
        updateCommentInCache(old, commentId, (c) => ({
          ...c,
          content,
          updated_at: new Date().toISOString(),
        }))
      );

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      toast({
        title: "Comentario actualizado",
        description: "El comentario se ha actualizado correctamente",
      });
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["comments", postId], context.previous);
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el comentario",
      });
    },
  });

  return {
    submitComment,
    deleteComment,
    editCommentAsync
  };
}
