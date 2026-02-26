import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePinnedProjects(userId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["pinned-projects", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await (supabase as any)
        .from("user_pinned_projects")
        .select("id, user_id, post_id, position, created_at")
        .eq("user_id", userId)
        .order("position");
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  return { pinnedProjects: data || [], isLoading, error };
}
