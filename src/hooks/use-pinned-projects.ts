import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

let pinnedProjectsQueryDisabled = false;

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

      if (error) {
        const status = (error as any)?.status;
        const msg = String((error as any)?.message ?? "");
        if (
          status === 400 ||
          msg.toLowerCase().includes("bad request") ||
          msg.toLowerCase().includes("does not exist")
        ) {
          pinnedProjectsQueryDisabled = true;
          return [];
        }
        throw error;
      }
      return data || [];
    },
    enabled: !!userId && !pinnedProjectsQueryDisabled,
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { pinnedProjects: data || [], isLoading, error };
}
