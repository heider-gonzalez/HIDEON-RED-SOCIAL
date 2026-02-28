import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ReactionType } from "@/types/database/social.types";
import { useToast } from "@/hooks/use-toast";
import { toggleReactionOptimized, getUserPostReaction } from "@/lib/api/reactions/optimized-reactions";
import { playUiSound } from "@/lib/ui-sounds";

export function usePostReactions(postId: string) {
  const [isReacting, setIsReacting] = useState(false);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updatePostReactionsInCache = useCallback((postIdToUpdate: string, updater: (post: any) => any) => {
    queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
      if (!oldData) return oldData;

      if (Array.isArray(oldData)) {
        return oldData.map((p: any) => (p?.id === postIdToUpdate ? updater(p) : p));
      }

      if (oldData?.pages) {
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: page.data?.map((p: any) => (p?.id === postIdToUpdate ? updater(p) : p))
          }))
        };
      }

      if (oldData?.data && Array.isArray(oldData.data)) {
        return {
          ...oldData,
          data: oldData.data.map((p: any) => (p?.id === postIdToUpdate ? updater(p) : p))
        };
      }

      return oldData;
    });
  }, [queryClient]);

  useEffect(() => {
    const checkUserReaction = async () => {
      try {
        const reaction = await getUserPostReaction(postId);
        setUserReaction(reaction);
      } catch (error) {
        console.error("Error checking user reaction:", error);
        setUserReaction(null);
      }
    };

    if (postId) {
      checkUserReaction();
    }
  }, [postId]);

  const onReaction = useCallback(async (postId: string, type: ReactionType) => {
    if (isReacting) {
      return;
    }
    
    setIsReacting(true);
    
    const previousReaction = userReaction;
    const newReaction = userReaction === type ? null : type;
    setUserReaction(newReaction);
    playUiSound(newReaction ? 'reaction_add' : 'reaction_remove');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserReaction(previousReaction);
        toast({
          title: "Error",
          description: "Debes iniciar sesión para reaccionar",
          variant: "destructive"
        });
        return;
      }

      updatePostReactionsInCache(postId, (post: any) => {
        const reactions = post.reactions || [];
        let newReactions = Array.isArray(reactions) ? [...reactions] : [];

        if (newReaction) {
          const existingIndex = newReactions.findIndex((r: any) => r.user_id === user.id);
          if (existingIndex >= 0) {
            newReactions[existingIndex] = { ...newReactions[existingIndex], reaction_type: newReaction };
          } else {
            newReactions.push({ user_id: user.id, reaction_type: newReaction });
          }
        } else {
          newReactions = newReactions.filter((r: any) => r.user_id !== user.id);
        }

        return { ...post, reactions: newReactions, user_reaction: newReaction };
      });

      const result = await toggleReactionOptimized(postId, undefined, type);

      if (!result.success) {
        setUserReaction(previousReaction);
        queryClient.invalidateQueries({ queryKey: ['posts', postId] });
        queryClient.invalidateQueries({ queryKey: ['posts'], exact: false });
        
        toast({
          title: "Error",
          description: result.error || "Error al procesar la reacción",
          variant: "destructive"
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['posts', postId] });
      }
    } catch (error: any) {
      console.error('Error in onReaction:', error);
      setUserReaction(previousReaction);
      queryClient.invalidateQueries({ queryKey: ['posts', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'], exact: false });
      
      toast({
        title: "Error",
        description: error.message || "Error al procesar la reacción",
        variant: "destructive"
      });
    } finally {
      setIsReacting(false);
    }
  }, [isReacting, queryClient, toast, userReaction, updatePostReactionsInCache]);

  return {
    isReacting,
    onReaction,
    userReaction
  };
}
