import { useQuery } from "@tanstack/react-query";
import type { Post } from "@/types/post";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook optimizado para obtener posts de video (Reels)
 * Filtra videos de la data existente sin queries adicionales
 */
export function useReelsFeed(limit: number = 12) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reels-feed", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, content, created_at, media_url, media_urls, media_type, visibility, profiles:profiles(id, username, avatar_url)"
        )
        .eq("visibility", "public")
        .eq("media_type", "video")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as unknown as Post[];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  return {
    videosPosts: (data || []) as Post[],
    isLoading,
    refetch,
    hasVideos: (data?.length || 0) > 0
  };
}