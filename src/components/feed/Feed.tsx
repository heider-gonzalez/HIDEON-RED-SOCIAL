import { FeedHeader } from "./FeedHeader";
import { FeedPullToRefresh } from "./FeedPullToRefresh";
import { FeedMainContent } from "./FeedMainContent";
import { usePersonalizedFeed } from "@/hooks/feed/use-personalized-feed";
import { useRealtimeFeedSimple } from "@/hooks/feed/hooks/use-realtime-feed-simple";
import { useCallback, useRef, useState } from "react";
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

  const [newPostsCount, setNewPostsCount] = useState(0);
  const loaderRef = useRef<HTMLDivElement>(null);

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
    trackPostView,
    trackPostInteraction,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = usePersonalizedFeed(userId, groupId, companyId, contentType);

  // Real-time updates for authenticated users
  useRealtimeFeedSimple(user?.id || '');

  const handleRefresh = useCallback(async () => {
    setNewPostsCount(0);
    await queryClient.invalidateQueries({ queryKey: ['posts'] });
  }, [queryClient]);

  const handleViewNewPosts = useCallback(() => {
    setNewPostsCount(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="relative">
      <FeedHeader 
        newPostsCount={newPostsCount}
        onRefresh={handleViewNewPosts}
      />
      
      <FeedPullToRefresh onRefresh={handleRefresh}>
        <FeedMainContent
          userId={userId}
          groupId={groupId}
          companyId={companyId}
          contentType={contentType}
          posts={posts}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          trackPostView={trackPostView}
          trackPostInteraction={trackPostInteraction}
          isAuthenticated={isAuthenticated}
          user={user}
          publicPreview={publicPreview}
          isPublicLoading={isPublicLoading}
          isPublicError={isPublicError}
        />
      </FeedPullToRefresh>
      
      <div ref={loaderRef} />
    </div>
  );
}
