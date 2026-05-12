import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProjectViewer {
  viewer_id: string;
  username: string;
  avatar_url: string | null;
  viewed_at: string;
}

export function useProjectViews(postId: string, ownerId?: string) {
  const queryClient = useQueryClient();

  // Fetch views count
  const { data: viewsCount = 0 } = useQuery({
    queryKey: ['project-views-count', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_project_views_count', { p_post_id: postId });
      
      if (error) throw error;
      return data || 0;
    },
    enabled: !!postId
  });

  // Fetch viewers list
  const { data: viewers = [] } = useQuery({
    queryKey: ['project-viewers', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_project_viewers', { p_post_id: postId, p_limit: 10 });
      
      if (error) throw error;
      return (data || []) as ProjectViewer[];
    },
    enabled: !!postId
  });

  // Record view mutation
  const recordView = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      let resolvedOwnerId = ownerId;
      if (!resolvedOwnerId) {
        const { data: postRow, error: postError } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', postId)
          .maybeSingle();
        if (postError) throw postError;
        resolvedOwnerId = (postRow as any)?.user_id || undefined;
      }

      if (resolvedOwnerId) {
        const { error: trackError } = await (supabase as any)
          .rpc('track_analytics_event', {
            p_event_type: 'project_view',
            p_entity_type: 'post',
            p_entity_id: postId,
            p_owner_id: resolvedOwnerId,
            p_is_anonymous: !user,
            p_metadata: {}
          });
        if (trackError) throw trackError;
      }

      // Only store viewer rows for logged-in users
      if (!user) return;
      
      const { error } = await supabase
        .from('project_views')
        .insert({
          post_id: postId,
          viewer_id: user.id
        });

      // We expect conflicts for repeated views due to unique index on (post_id, viewer_id).
      // Supabase can surface this as Postgres code 23505 or HTTP 409.
      if (error) {
        const pgCode = (error as any).code;
        const status = (error as any).status;
        const httpStatus = (error as any).statusCode;
        const message = String((error as any).message || '');

        const isConflict =
          pgCode === '23505' ||
          status === 409 ||
          httpStatus === 409 ||
          message.toLowerCase().includes('duplicate key') ||
          message.toLowerCase().includes('conflict');

        if (!isConflict) {
          throw error;
        }

        // Conflict = already recorded; ignore silently.
        return;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-views-count', postId] });
      queryClient.invalidateQueries({ queryKey: ['project-viewers', postId] });
    }
  });

  // Auto-record view when component mounts
  useEffect(() => {
    if (postId) {
      recordView.mutate();
    }
  }, [postId]);

  return {
    viewsCount,
    viewers,
    recordView: recordView.mutate
  };
}
