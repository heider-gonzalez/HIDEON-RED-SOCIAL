import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { getPosts, getHiddenPosts } from "@/lib/api";
import { transformPoll } from "../utils/transform-poll";
import { supabase } from "@/integrations/supabase/client";
import type { Post, Idea } from "@/types/post";

export function useFeedData(userId?: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const showNew = searchParams.get("new") === "true";
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  // Get hidden posts only (hidden_users table removed)
  useEffect(() => {
    const getHiddenData = async () => {
      try {
        const hiddenPostsIds = await getHiddenPosts();
        setHiddenPostIds(hiddenPostsIds);
      } catch (error) {
        console.error("Error fetching hidden data:", error);
      }
    };
    
    getHiddenData();
  }, []);

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ["posts", userId],
    queryFn: () => getPosts(userId),
    select: (data: any[]) => {
      let transformedPosts = data.map(post => {
        const postWithTypes: Post = {
          id: post.id,
          content: post.content,
          author_id: post.author_id,
          user_id: post.user_id,
          created_at: post.created_at,
          updated_at: post.updated_at,
          media_url: post.media_url,
          media_type: post.media_type,
          reactions: post.reactions || [],
          reactions_count: post.reactions_count || 0,
          comments_count: post.comments_count || 0,
          shares_count: post.shares_count || 0,
          userHasReacted: post.userHasReacted || false,
          poll: transformPoll(post.poll),
          idea: post.idea as Idea | undefined,
          visibility: post.visibility as "public" | "friends" | "private" | "incognito",
          user_reaction: post.user_reaction,
          is_pinned: post.is_pinned || false,
          shared_post: post.shared_post as Post | undefined,
          shared_post_id: post.shared_post_id as string | undefined,
          shared_from: post.shared_from as string | undefined,
          profiles: post.profiles ? {
            id: post.profiles.id || post.user_id || '',
            username: post.profiles.username || '',
            avatar_url: post.profiles.avatar_url || ''
          } : undefined
        };

        return postWithTypes;
      });

      transformedPosts = transformedPosts
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (showNew) {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        transformedPosts = transformedPosts
          .filter(post => {
            const postDate = new Date(post.created_at);
            return postDate > twentyFourHoursAgo;
          });
      }

      return transformedPosts;
    },
    staleTime: 30 * 1000,        // 30 segundos stale
    gcTime: 5 * 60 * 1000,       // 5 minutos garbage collection
    refetchInterval: false,       // No auto-refetch
    refetchOnWindowFocus: false, // Optimización para latencia
    retry: 2,
  });

  useEffect(() => {
    if (showNew) {
      refetch().then(() => {
        setSearchParams({});
      });
    }
  }, [showNew, refetch, setSearchParams]);

  const visiblePosts = showHidden 
    ? posts 
    : posts.filter(post => !hiddenPostIds.includes(post.id));
  
  const hiddenPosts = posts.filter(post => hiddenPostIds.includes(post.id));

  const toggleHiddenPosts = () => setShowHidden(!showHidden);

  return {
    visiblePosts,
    hiddenPosts,
    showHidden,
    toggleHiddenPosts,
    isLoading
  };
}
