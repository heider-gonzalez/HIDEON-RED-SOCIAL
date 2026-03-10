
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook for managing post actions like deletion
 */
export function usePostActions(postId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: onDeletePost } = useMutation({
    mutationFn: async () => {
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

      return { success: true };
    },
    onMutate: async () => {
      // Optimistically remove from any cached lists that contain posts
      const previousQueries = queryClient.getQueriesData({ queryKey: ['posts'] });

      for (const [key, data] of previousQueries) {
        if (!data) continue;

        // Infinite query shape: { pages: [{... , posts: [] | data: [] | items: [] }, ...] }
        if (typeof data === 'object' && data && 'pages' in (data as any)) {
          queryClient.setQueryData(key, (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((p: any) => {
                const listKey = Array.isArray(p?.posts)
                  ? 'posts'
                  : Array.isArray(p?.data)
                    ? 'data'
                    : Array.isArray(p?.items)
                      ? 'items'
                      : null;

                if (!listKey) return p;
                return {
                  ...p,
                  [listKey]: (p[listKey] || []).filter((x: any) => String(x?.id) !== String(postId)),
                };
              }),
            };
          });
          continue;
        }

        // Simple array shape
        if (Array.isArray(data)) {
          queryClient.setQueryData(key, (old: any) => (old || []).filter((x: any) => String(x?.id) !== String(postId)));
        }
      }

      return { previousQueries };
    },
    onSuccess: () => {
      toast({
        title: "Publicación eliminada",
        description: "La publicación se ha eliminado correctamente",
      });
    },
    onError: (error, _vars, context) => {
      console.error('Error deleting post:', error);

      const previousQueries = (context as any)?.previousQueries as Array<[unknown, unknown]> | undefined;
      if (previousQueries) {
        for (const [key, data] of previousQueries) {
          queryClient.setQueryData(key as any, data);
        }
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la publicación",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['personalized-feed'] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
      queryClient.invalidateQueries({ queryKey: ['project-posts'] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
  });

  return { onDeletePost };
}
