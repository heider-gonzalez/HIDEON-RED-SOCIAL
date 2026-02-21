import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { ReactionType } from '@/types/database/social.types';

// Definir tipos para las reacciones de comentarios
interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

interface CommentReactionSummary {
  by_type: Record<string, number>;
  count: number;
  user_reaction: ReactionType | null;
}

export function useCommentReactions(commentId: string) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<CommentReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CommentReactionSummary>({
    by_type: {},
    count: 0,
    user_reaction: null
  });

  // Cargar reacciones del comentario
  const loadReactions = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('comment_reactions')
        .select('*')
        .eq('comment_id', commentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading comment reactions:', error);
        return;
      }

      const reactionsData = data as CommentReaction[] || [];
      setReactions(reactionsData);
      
      // Calcular resumen
      const byType: Record<string, number> = {};
      let userReaction: ReactionType | null = null;
      
      reactionsData.forEach(reaction => {
        const type = reaction.reaction_type;
        byType[type] = (byType[type] || 0) + 1;
        
        if (reaction.user_id === user?.id) {
          userReaction = type as ReactionType;
        }
      });

      setSummary({
        by_type: byType,
        count: reactionsData.length,
        user_reaction: userReaction
      });
    } catch (error) {
      console.error('Error in loadReactions:', error);
    } finally {
      setLoading(false);
    }
  }, [commentId, user?.id]);

  // Agregar o actualizar reacción
  const addReaction = useCallback(async (type: ReactionType) => {
    if (!user) {
      throw new Error('Debes estar autenticado para reaccionar');
    }

    try {
      // Verificar si ya existe una reacción del usuario
      const { data: existingReaction } = await supabase
        .from('comment_reactions')
        .select('*')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single();

      if (existingReaction) {
        // Actualizar reacción existente
        const { error } = await supabase
          .from('comment_reactions')
          .update({ reaction_type: type })
          .eq('id', (existingReaction as CommentReaction).id);

        if (error) throw error;
      } else {
        // Insertar nueva reacción
        const { error } = await supabase
          .from('comment_reactions')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: type
          });

        if (error) throw error;
      }

      // Recargar reacciones
      await loadReactions();
    } catch (error) {
      console.error('Error adding comment reaction:', error);
      throw error;
    }
  }, [commentId, user, loadReactions]);

  // Eliminar reacción del usuario
  const removeReaction = useCallback(async () => {
    if (!user) {
      throw new Error('Debes estar autenticado para eliminar reacción');
    }

    try {
      const { error } = await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Recargar reacciones
      await loadReactions();
    } catch (error) {
      console.error('Error removing comment reaction:', error);
      throw error;
    }
  }, [commentId, user, loadReactions]);

  // Toggle reacción (agregar si no existe, eliminar si existe)
  const toggleReaction = useCallback(async (type: ReactionType) => {
    if (summary.user_reaction === type) {
      // Si ya tiene esta reacción, eliminarla
      await removeReaction();
    } else {
      // Si no tiene esta reacción o tiene otra, agregarla
      await addReaction(type);
    }
  }, [summary.user_reaction, addReaction, removeReaction]);

  // Cargar reacciones al montar el componente
  useEffect(() => {
    if (commentId) {
      loadReactions();
    }
  }, [commentId, loadReactions]);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!commentId) return;

    const channel = supabase
      .channel(`comment_reactions_${commentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_reactions',
          filter: `comment_id=eq.${commentId}`
        },
        () => {
          loadReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [commentId, loadReactions]);

  return {
    reactions,
    loading,
    summary,
    addReaction,
    removeReaction,
    toggleReaction,
    refetch: loadReactions
  };
}
