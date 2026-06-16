import { FeedHeader } from "./FeedHeader";
import { FeedPullToRefresh } from "./FeedPullToRefresh";
import { FeedMainContent } from "./FeedMainContent";
import { usePersonalizedFeed } from "@/hooks/feed/use-personalized-feed";
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { getPublicFeedPreview } from "@/lib/api";

interface FeedProps {
  userId?: string;
  groupId?: string;
  companyId?: string;
  contentType?: 'regular' | 'idea' | 'project';
}

export function Feed({ userId, groupId, companyId, contentType }: FeedProps) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();

  const {
    data: publicPreview,
    isLoading: isPublicLoading,
    isError: isPublicError,
  } = useQuery({
    queryKey: ["posts", "public-preview"],
    queryFn: () => getPublicFeedPreview(5),
    enabled: !isAuthenticated,
    staleTime: 1000 * 60, // 1 minute
  });

  const {
    posts,
    isLoading,
    refetch,
    isError,
    error,
    trackPostView,
    trackPostInteraction,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePersonalizedFeed(userId, groupId, companyId, contentType);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ 
      queryKey: ['posts'], 
      exact: false,
      refetchType: 'active'
    });
  }, [queryClient]);

  return (
    <div className="relative">
      <FeedPullToRefresh onRefresh={handleRefresh}>
        <FeedMainContent
          userId={userId}
          groupId={groupId}
          companyId={companyId}
          contentType={contentType}
          posts={posts}
          isLoading={isLoading}
          refetch={refetch}
          isError={!!isError}
          error={error}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          trackPostView={trackPostView}
          trackPostInteraction={trackPostInteraction}
          isAuthenticated={isAuthenticated}
          user={user}
          publicPreview={publicPreview}
          isPublicLoading={isPublicLoading}
          isPublicError={isPublicError}
        />
      </FeedPullToRefresh>
    </div>
  );
}
