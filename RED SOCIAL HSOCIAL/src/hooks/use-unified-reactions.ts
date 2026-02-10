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

          setUserReaction(null);
          setReactionCount(prev => Math.max(0, prev - 1));
        } else {
          // Actualizar tipo de reacción
          await (supabase as any)
            .from('reactions')
            .update({ reaction_type: type } as any)
            .eq('post_id', postId)
            .eq('user_id', user.id);

          setUserReaction(type);
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

        setUserReaction(type);
        setReactionCount(prev => prev + 1);
      }

      // Invalidar queries para actualizar ambos sistemas
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['personalized-feed'] });
      queryClient.invalidateQueries({ queryKey: ['project-posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', postId] });
      queryClient.invalidateQueries({ queryKey: ['project-posts', postId] });
      queryClient.invalidateQueries({ queryKey: ['personalized-feed', postId] });

      toast({
        title: "Reacción guardada",
        description: "Tu reacción ha sido guardada exitosamente",
      });

    } catch (error) {
      console.error('Error handling reaction:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar tu reacción",
        variant: "destructive"
      });
    } finally {
      setIsReacting(false);
    }
  }, [isReacting, postId, queryClient, toast]);

  return {
    isReacting,
    userReaction,
    reactionCount,
    handleReaction
  };
}
