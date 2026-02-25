
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook for managing post actions like deletion
 */
export function usePostActions(postId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const onDeletePost = async () => {
    try {
      // First, get the post to check if it's an idea
      const { data: post } = await supabase
        .from('posts')
        .select('post_type')
        .eq('id', postId)
        .single();
      
      // If it's an idea, delete participants first
      if (post?.post_type === 'idea') {
        const { error: participantsError } = await supabase
          .from('idea_participants')
          .delete()
          .eq('post_id', postId);
        
        if (participantsError) {
          console.error('Error deleting idea participants:', participantsError);
        }
      }
      
      // Now delete the post
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      toast({
        title: "Publicación eliminada",
        description: "La publicación se ha eliminado correctamente",
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la publicación",
      });
    }
  };
  
  return { onDeletePost };
}
