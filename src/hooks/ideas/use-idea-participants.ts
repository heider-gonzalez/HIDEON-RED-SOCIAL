import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface IdeaParticipant {
  user_id: string;
  profession: string | null;
  joined_at: string;
  username: string | null;
  avatar_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
}

export function useIdeaParticipants(postId: string, statusFilter?: 'pending' | 'approved' | 'rejected' | 'all') {
  return useQuery({
    queryKey: ['idea-participants', postId, statusFilter],
    queryFn: async (): Promise<IdeaParticipant[]> => {
      try {
        if (!postId) return [];

        let query = supabase
          .from('idea_participants')
          .select('user_id, profession, joined_at, status')
          .eq('post_id', postId);

        // Apply status filter if provided
        if (statusFilter && statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching idea participants:', error);
          return [];
        }

        const userIds = [...new Set((data || []).map((p: any) => p.user_id).filter(Boolean))];
        let profilesMap = new Map<string, { username: string | null; avatar_url: string | null }>();

        if (userIds.length > 0) {
          try {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', userIds);

            if (profilesError) {
              console.error('Error fetching participant profiles:', profilesError);
            } else {
              (profiles || []).forEach((p: any) => {
                profilesMap.set(p.id, {
                  username: p.username ?? null,
                  avatar_url: p.avatar_url ?? null,
                });
              });
            }
          } catch (profilesError) {
            console.error('Error fetching participant profiles (catch):', profilesError);
          }
        }

        return (data || []).map((p: any) => {
          const profile = profilesMap.get(p.user_id);
          return {
            user_id: p.user_id,
            profession: p.profession,
            joined_at: p.joined_at,
            username: profile?.username ?? null,
            avatar_url: profile?.avatar_url ?? null,
            status: p.status || 'pending',
          };
        });
      } catch (error) {
        console.error('Error in useIdeaParticipants:', error);
        return [];
      }
    },
    enabled: !!postId,
    retry: 1,
    staleTime: 30000,
  });
}
