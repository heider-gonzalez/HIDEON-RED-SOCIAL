import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIdeaParticipantsCount(postIds: string[]) {
  return useQuery({
    queryKey: ['idea-participants-count', postIds],
    queryFn: async () => {
      try {
        if (postIds.length === 0) return new Map<string, number>();

        const { data, error } = await supabase
          .from('idea_participants')
          .select('post_id')
          .in('post_id', postIds);

        if (error) throw error;

        // Count participants per post
        const counts = new Map<string, number>();
        data?.forEach((participant) => {
          const currentCount = counts.get(participant.post_id) || 0;
          counts.set(participant.post_id, currentCount + 1);
        });

        return counts;
      } catch (error) {
        console.error("Error fetching idea participants count:", error);
        throw error;
      }
    },
    enabled: postIds.length > 0
  });
}
