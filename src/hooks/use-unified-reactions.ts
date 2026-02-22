import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { ReactionType } from '@/types/database/social.types';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook unificado para reacciones que funciona tanto para feed como para proyectos
 * Usa la tabla 'reactions' y actualiza ambos sistemas (feed y projects)
 */
export function useUnifiedReactions(postId: string) {
  const [isReacting, setIsReacting] = useState(false);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [reactionCount, setReactionCount] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updatePostInCache = useCallback((updater: (post: any) => any) => {
    queryClient.setQueriesData({ queryKey: ['posts'] }, (oldData: any) => {
      if (!oldData) return oldData;

      if (Array.isArray(oldData)) {
        return oldData.map((p: any) => (p?.id === postId ? updater(p) : p));
      }

      if (oldData?.pages) {
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => {
            const itemsKey = Array.isArray(page?.data)
              ? 'data'
              : Array.isArray(page?.posts)
                ? 'posts'
                : null;

            if (!itemsKey) return page;

            return {
              ...page,
              [itemsKey]: (page as any)[itemsKey].map((p: any) => (p?.id === postId ? updater(p) : p))
            };
          })
        };
      }

      if (Array.isArray(oldData?.data)) {
        return {
          ...oldData,
          data: oldData.data.map((p: any) => (p?.id === postId ? updater(p) : p))
        };
      }

      if (Array.isArray(oldData?.posts)) {
        return {
          ...oldData,
          posts: oldData.posts.map((p: any) => (p?.id === postId ? updater(p) : p))
        };
      }

      return oldData;
    });
  }, [postId, queryClient]);

  // Obtener reacción del usuario y contador total
  useEffect(() => {
    const fetchReactionData = async () => {
      if (!postId) return;

      try {
        // Obtener reacción del usuario
        const { data: userReactionData, error: userError } = await supabase
          .from('reactions')
          .select('reaction_type')
          .eq('post_id', postId)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          throw userError;
        }

        setUserReaction(userReactionData?.reaction_type || null);

        // Obtener contador total de reacciones
        const { count, error: countError } = await (supabase as any)
          .from('reactions')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);

        if (countError) throw countError;
        setReactionCount(count || 0);

      } catch (error) {
        console.error('Error fetching reaction data:', error);
      }
    };

    fetchReactionData();
  }, [postId]);

  // Manejar reacción
  const handleReaction = useCallback(async (type: ReactionType) => {
    if (isReacting) return;

    setIsReacting(true);

    const previousUserReaction = userReaction;
    const previousReactionCount = reactionCount;
    const nextReaction = previousUserReaction === type ? null : type;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para reaccionar",
          variant: "destructive"
        });
        return;
      }

      // Optimistic UI + cache update
      setUserReaction(nextReaction);
      if (previousUserReaction && nextReaction === null) {
        setReactionCount(prev => Math.max(0, prev - 1));
      } else if (!previousUserReaction && nextReaction) {
        setReactionCount(prev => prev + 1);
      }

      updatePostInCache((post: any) => {
        const reactions = post?.reactions;

        // If feed uses breakdown object, update count only
        if (reactions && typeof reactions === 'object' && !Array.isArray(reactions)) {
          const nextCount = Math.max(0, Number(reactions.count || 0) + (previousUserReaction ? (nextReaction ? 0 : -1) : (nextReaction ? 1 : 0)));
          return {
            ...post,
            reactions: {
              ...reactions,
              count: nextCount,
            },
            reactions_count: nextCount,
            user_reaction: nextReaction,
          };
        }

        // If feed uses array reactions, patch it
        if (Array.isArray(reactions)) {
          const withoutMe = reactions.filter((r: any) => r?.user_id !== user.id);
          const nextArr = nextReaction ? [...withoutMe, { user_id: user.id, reaction_type: nextReaction }] : withoutMe;
          return {
            ...post,
            reactions: nextArr,
            reactions_count: nextArr.length,
            user_reaction: nextReaction,
          };
        }

        return {
          ...post,
          user_reaction: nextReaction,
        };
      });

      // Verificar si ya existe una reacción
      const { data: existingReaction } = await (supabase as any)
        .from('reactions')
        .select('id, reaction_type')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingReaction) {
        if (existingReaction.reaction_type === type) {
          // Eliminar reacción si es la misma
          await (supabase as any)
            .from('reactions')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id);
        } else {
          // Actualizar tipo de reacción
          await (supabase as any)
            .from('reactions')
            .update({ reaction_type: type } as any)
            .eq('post_id', postId)
            .eq('user_id', user.id);
        }
      } else {
        // Agregar nueva reacción
        await (supabase as any)
          .from('reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: type
          } as any);
      }

      // Targeted invalidation (for views that fetch a single post)
      queryClient.invalidateQueries({ queryKey: ['posts', postId] });

      toast({
        title: "Reacción guardada",
        description: "Tu reacción ha sido guardada exitosamente",
      });

    } catch (error) {
      console.error('Error handling reaction:', error);

      // Revert optimistic updates
      setUserReaction(previousUserReaction);
      setReactionCount(previousReactionCount);
      updatePostInCache((post: any) => ({
        ...post,
        user_reaction: previousUserReaction,
      }));

      toast({
        title: "Error",
        description: "No se pudo procesar tu reacción",
        variant: "destructive"
      });
    } finally {
      setIsReacting(false);
    }
  }, [isReacting, postId, queryClient, toast, updatePostInCache, userReaction, reactionCount]);

  return {
    isReacting,
    userReaction,
    reactionCount,
    handleReaction
  };
}
