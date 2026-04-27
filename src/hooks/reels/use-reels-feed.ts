import { useQuery } from "@tanstack/react-query";
import type { Post } from "@/types/post";
import { supabase } from "@/integrations/supabase/client";
import { personalizedFeedAlgorithm } from "@/lib/feed/personalized-algorithm";

/**
 * Hook optimizado para obtener posts de video (Reels)
 * Filtra videos de la data existente sin queries adicionales
 */
export function useReelsFeed(limit: number = 12) {
  const { data, isLoading, refetch } = useQuery<Post[]>({
    queryKey: ["reels-feed", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (id, username, avatar_url),
          comments(count)
        `)
        .eq("visibility", "public")
        .eq("media_type", "video")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      type PostRowWithCounts = Post & {
        comments?: Array<{ count: number }>;
      };

      const rows = (data ?? []) as unknown as PostRowWithCounts[];

      return rows.map((row) => {
        const commentsCount = row.comments?.[0]?.count ?? 0;
        const { comments, ...rest } = row;
        return {
          ...rest,
          comments_count: commentsCount,
        };
      });
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const trackReelView = async (postId: string, durationSeconds?: number) => {
    await personalizedFeedAlgorithm.trackInteraction(postId, "view", durationSeconds);
  };

  const trackReelInteraction = async (postId: string, type: "like" | "comment" | "share") => {
    await personalizedFeedAlgorithm.trackInteraction(postId, type);
  };

  return {
    videosPosts: data || [],
    isLoading,
    refetch,
    hasVideos: (data?.length || 0) > 0,
    trackReelView,
    trackReelInteraction,
  };
}