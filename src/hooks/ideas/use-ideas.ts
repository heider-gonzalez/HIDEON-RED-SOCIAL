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
      let query = supabase
        .from("posts")
        .select(
          `
          *,
          profiles(username, avatar_url, institution_name)
        `
        )
        .eq("post_type", "idea")
        .not("idea", "is", null)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (institutionName) {
        query = query.eq("profiles.institution_name", institutionName);
      }

      if (searchQuery) {
        query = query.or(`content.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
