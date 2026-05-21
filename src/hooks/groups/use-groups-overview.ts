import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

type GroupsOverviewOptions = {
  publicLimit: number;
};

export function useGroupsOverview(options: GroupsOverviewOptions) {
  const { publicLimit } = options;
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery<{ groups: any[]; myGroupIds: string[] }>({
    queryKey: ["groups-overview", userId, publicLimit],
    enabled: true,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const [publicGroups, userGroups] = await Promise.all([
          (supabase as any).rpc("get_public_groups", { limit_count: publicLimit }),
          userId
            ? (supabase as any).rpc("get_user_groups", { user_id_param: userId })
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
      } catch (error) {
        console.error("Error fetching groups overview:", error);
        throw error;
      }
    },
  });
}
