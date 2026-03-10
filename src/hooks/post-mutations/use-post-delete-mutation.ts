
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function usePostDeleteMutation(postId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: handleDeletePost } = useMutation({
    mutationFn: async () => {
      console.log("Trying to delete post with ID:", postId);
      
      // Check if we're authenticated
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.user) {
        throw new Error("Debes iniciar sesión para eliminar esta publicación");
      }
      
      // First check if this post belongs to the current user
      const { data: post, error: fetchError } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();
        
      if (fetchError) throw fetchError;
      
      // If this post doesn't belong to the current user, allow only moderator/admin
      if (post.user_id !== currentSession.user.id) {
        const [{ data: isMod }, { data: isAdmin }] = await Promise.all([
          (supabase.rpc as any)("has_role", { _role: "moderator", _user_id: currentSession.user.id }),
          (supabase.rpc as any)("has_role", { _role: "admin", _user_id: currentSession.user.id }),
        ]);

        if (!Boolean(isMod) && !Boolean(isAdmin)) {
          throw new Error("No tienes permiso para eliminar esta publicación");
        }
      }
      
      // Now we can delete the post
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);
        
      if (error) throw error;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["personalized-feed"] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["project-posts"] });
      toast({
        title: "Post eliminado",
        description: "El post se ha eliminado correctamente",
      });
    },
    onError: (error) => {
      console.error("Error deleting post:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar la publicación",
      });
    }
  });

  return { handleDeletePost };
}
