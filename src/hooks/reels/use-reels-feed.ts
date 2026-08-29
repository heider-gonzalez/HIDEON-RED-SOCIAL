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
      const result = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (id, username, avatar_url),
          comments(count)
        `)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(limit * 2);
      
      const { data: postsData, error: supabaseError } = result;

      if (supabaseError) {
        throw supabaseError;
      }

      type PostRowWithCounts = Post & {
        comments?: Array<{ count: number }>;
      };

      const rows = (postsData ?? []) as unknown as PostRowWithCounts[];

      // Filter to only include actual video files (check by extension)
      const videoRows = rows.filter((row) => {
        const mediaUrl = row.media_url?.toLowerCase() || '';
        return mediaUrl.endsWith('.mp4') || 
               mediaUrl.endsWith('.webm') || 
               mediaUrl.endsWith('.mov') || 
               mediaUrl.endsWith('.m4v');
      });


      const finalResult = videoRows.map((row) => {
        const commentsCount = row.comments?.[0]?.count ?? 0;
        const { comments, ...rest } = row;
        return {
          ...rest,
          comments_count: commentsCount,
        };
      }).slice(0, limit); // Limit to requested amount

      return finalResult;
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 1, // Only retry once to avoid infinite loops
  });

  const trackReelView = async (postId: string, durationSeconds?: number) => {
    await personalizedFeedAlgorithm.trackInteraction(postId, "view", durationSeconds);
  };

  const trackReelInteraction = async (postId: string, type: "like" | "comment" | "share") => {
    await personalizedFeedAlgorithm.trackInteraction(postId, type);
  };

  const hasVideos = (data?.length || 0) > 0;

  return {
    videosPosts: data || [],
    isLoading,
    refetch,
    hasVideos,
    trackReelView,
    trackReelInteraction,
  };
}