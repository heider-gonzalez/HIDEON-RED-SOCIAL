import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UseIdeasParams = {
  searchQuery?: string;
  institutionName?: string;
  limit?: number;
};

export const ideasQueryKey = (params?: UseIdeasParams) => [
  "ideas",
  {
    searchQuery: params?.searchQuery ?? "",
    institutionName: params?.institutionName ?? "",
    limit: params?.limit ?? 20,
  },
] as const;

export function useIdeas(params?: UseIdeasParams) {
  const searchQuery = params?.searchQuery ?? "";
  const institutionName = params?.institutionName ?? "";
  const limit = params?.limit ?? 20;

  return useQuery({
    queryKey: ideasQueryKey({ searchQuery, institutionName, limit }),
    queryFn: async () => {
      try {
        let query = supabase
          .from("posts")
          .select(
            `
            id,
            user_id,
            created_at,
            content,
            post_type,
            media_url,
            idea,
            profiles!inner(username, avatar_url, institution_name)
          `
          )
          .eq("post_type", "idea")
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(Math.min(limit, 50));

        if (institutionName) {
          query = query.eq("profiles.institution_name", institutionName);
        }

        if (searchQuery) {
          const q = searchQuery.replace(/,/g, " ").trim();
          query = query.or(
            [
              `content.ilike.%${q}%`,
              `idea->>title.ilike.%${q}%`,
              `idea->>description.ilike.%${q}%`,
            ].join(",")
          );
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
      } catch (error) {
        console.error("Error fetching ideas:", error);
        throw error;
      }
    },
    staleTime: 60000, // Cache for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
  });
}
