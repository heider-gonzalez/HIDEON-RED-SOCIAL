import { useState, useEffect, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { personalizedFeedAlgorithm } from "@/lib/feed/personalized-algorithm";
import { getPostsPage } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import type { Post } from "@/types/post";

function mergePreservingAllPosts(raw: Post[], prioritized: Post[]) {
  const byId = new Map<string, Post>();
  raw.forEach((p) => {
    if (p?.id) byId.set(String(p.id), p);
  });

  const ordered: Post[] = [];
  const seen = new Set<string>();
  prioritized.forEach((p) => {
    const id = String((p as any)?.id || "");
    if (!id || seen.has(id)) return;
    const canonical = byId.get(id) || p;
    ordered.push(canonical);
    seen.add(id);
  });

  raw.forEach((p) => {
    const id = String((p as any)?.id || "");
    if (!id || seen.has(id)) return;
    ordered.push(p);
    seen.add(id);
  });

  return ordered;
}

export function usePersonalizedFeed(
  userId?: string,
  groupId?: string,
  companyId?: string,
  contentType?: 'regular' | 'idea' | 'project'
) {
  const [isPersonalized, setIsPersonalized] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const PAGE_SIZE = 20;

  const {
    data,
    isLoading: postsLoading,
    isError: postsIsError,
    error: postsError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["posts", userId, groupId, companyId, contentType, "infinite"],
    queryFn: ({ pageParam }) =>
      getPostsPage({
        userId,
        groupId,
        companyId,
        contentType,
        limit: PAGE_SIZE,
        cursor: (pageParam as string | undefined) ?? null,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage?.nextCursor,
    enabled: true,
    staleTime: 1000 * 60 * 10, // 10 minutos para mejor rendimiento
    gcTime: 1000 * 60 * 30, // 30 minutos para mantener cache más tiempo
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false, // Evitar refetch al cambiar de ventana
  });

  const rawPosts = useMemo(() => {
    const flat = (data?.pages || []).flatMap((p) => p?.posts || []) as Post[];
    // Ensure stable ordering
    return flat.sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [data]);

  const { 
    data: personalizedPosts = [], 
    isLoading: algorithLoading 
  } = useQuery({
    queryKey: ["personalized-feed", currentUserId, rawPosts.length],
    queryFn: async () => {
      if (!currentUserId || rawPosts.length === 0) return rawPosts;
      
      try {
        const prioritized = await personalizedFeedAlgorithm.generatePersonalizedFeed(
          rawPosts as Post[], 
          currentUserId
        );

        if (!Array.isArray(prioritized)) {
          return rawPosts;
        }

        // Personalization must not reduce content; only re-order
        return mergePreservingAllPosts(rawPosts, prioritized as Post[]);
      } catch (error) {
        console.error('Error generating personalized feed:', error);
        return rawPosts.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    },
    enabled: !!currentUserId && rawPosts.length > 0 && isPersonalized,
  });

  const feedPosts = useMemo(() => {
    if (!isPersonalized) {
      return rawPosts.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    if (algorithLoading) {
      return rawPosts;
    }
    // Evitar cambios bruscos manteniendo el orden original si la personalización falla
    if (!personalizedPosts || personalizedPosts.length === 0) {
      return rawPosts;
    }
    return personalizedPosts;
  }, [isPersonalized, rawPosts, personalizedPosts, algorithLoading]);

  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);

  useEffect(() => {
    const getHiddenData = async () => {
      if (!currentUserId) return;
      
      try {
        const { data: hiddenPosts } = await supabase
          .from('hidden_posts')
          .select('post_id')
          .eq('user_id', currentUserId);

        const rows = (hiddenPosts as Array<{ post_id: string }> | null) ?? null;
        setHiddenPostIds(rows?.map((h) => h.post_id) || []);
      } catch (error) {
        console.error("Error fetching hidden data:", error);
      }
    };
    
    getHiddenData();
  }, [currentUserId]);

  const visiblePosts = feedPosts.filter((post: any) => 
    !hiddenPostIds.includes(post.id)
  );

  const trackPostView = async (postId: string, durationSeconds?: number) => {
    if (currentUserId) {
      await personalizedFeedAlgorithm.trackInteraction(
        postId, 
        'view', 
        durationSeconds
      );
    }
  };

  const trackPostInteraction = async (
    postId: string, 
    type: 'like' | 'comment' | 'share'
  ) => {
    if (currentUserId) {
      await personalizedFeedAlgorithm.trackInteraction(postId, type);
    }
  };

  return {
    posts: visiblePosts,
    isLoading: postsLoading,
    isError: postsIsError,
    error: postsError,
    isPersonalized,
    setIsPersonalized,
    refetch,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    trackPostView,
    trackPostInteraction,
    rawPostsCount: rawPosts.length,
    personalizedPostsCount: personalizedPosts.length,
    hiddenPostsCount: hiddenPostIds.length
  };
}

// Stub analytics hook (engagement_rewards_log table removed)
export function useFeedAnalytics() {
  return {
    avgViewTime: 0,
    interactionsToday: 0,
    personalizedAccuracy: 0
  };
}
