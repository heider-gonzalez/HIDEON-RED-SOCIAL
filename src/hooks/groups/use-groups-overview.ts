import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

type GroupsOverviewOptions = {
  publicLimit: number;
};

// Retry utility with exponential backoff
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;
      const isServerError = error?.status >= 500 || error?.code?.includes('5');
      
      if (isLastAttempt || !isServerError) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

export function useGroupsOverview(options: GroupsOverviewOptions) {
  const { publicLimit } = options;
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery<{ groups: any[]; myGroupIds: string[] }>({
    queryKey: ["groups-overview", userId, publicLimit],
    enabled: true,
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      try {
        const [publicGroups, userGroups] = await Promise.all([
          fetchWithRetry(() => (supabase as any).rpc("get_public_groups", { limit_count: publicLimit })),
          userId
            ? fetchWithRetry(() => (supabase as any).rpc("get_user_groups", { user_id_param: userId }))
            : Promise.resolve({ data: [], error: null } as any),
        ]);

        if ((publicGroups as any).error) throw (publicGroups as any).error;
        if ((userGroups as any).error) throw (userGroups as any).error;

        const myRows = (((userGroups as any).data ?? []) as any[]);
        const myIds = new Set(myRows.filter((g) => g?.id).map((g) => String(g.id)));

        const merged: any[] = [...((publicGroups as any).data ?? []), ...myRows];
        const byId = new Map<string, any>();
        for (const g of merged) {
          if (!g?.id) continue;
          byId.set(String(g.id), g);
        }

        return {
          groups: Array.from(byId.values()),
          myGroupIds: Array.from(myIds.values()),
        };
      } catch (error: any) {
        console.error("Error fetching groups overview:", error);
        // Return empty array on server errors to prevent app crash
        if (error?.status >= 500 || error?.code?.includes('5') || error?.message?.includes('503')) {
          console.warn("Server error (503), returning empty groups array");
          return {
            groups: [],
            myGroupIds: [],
          };
        }
        throw error;
      }
    },
  });
}
