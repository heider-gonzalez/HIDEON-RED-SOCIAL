import { FeedSkeleton } from "./FeedSkeleton";
import { EmptyFeed } from "./EmptyFeed";
import { PublicFeedWall } from "./PublicFeedWall";
import type { Post } from "@/types/post";
import { FeedContent } from "./FeedContent";
import { VirtualizedFeedContent } from "./VirtualizedFeedContent";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMemo } from "react";

interface FeedMainContentProps {
  userId?: string;
  groupId?: string;
  companyId?: string;
  contentType?: 'regular' | 'idea' | 'project';
  posts: Post[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  trackPostView?: (postId: string, duration?: number) => void;
  trackPostInteraction?: (postId: string, type: 'like' | 'comment' | 'share') => void;
  isAuthenticated: boolean;
  user?: any;
  publicPreview?: any;
  isPublicLoading?: boolean;
  isPublicError?: boolean;
}

export function FeedMainContent({
  userId,
  groupId,
  companyId,
  contentType,
  posts,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  trackPostView,
  trackPostInteraction,
  isAuthenticated,
  user,
  publicPreview,
  isPublicLoading,
  isPublicError,
}: FeedMainContentProps) {
  const isMobile = useIsMobile();

  // Enable virtualization for large feeds (more than 20 posts)
  const shouldVirtualize = useMemo(() => {
    return posts && posts.length > 20 && !isMobile;
  }, [posts, isMobile]);

  if (!isAuthenticated) {
    if (isPublicLoading) {
      return <FeedSkeleton />;
    }
    if (isPublicError || !publicPreview) {
      return <EmptyFeed />;
    }
    return <PublicFeedWall />;
  }

  if (isLoading && posts.length === 0) {
    return <FeedSkeleton />;
  }

  if (posts.length === 0 && !isLoading) {
    return <EmptyFeed />;
  }

  return (
    <div data-feed-container className="relative">
      {shouldVirtualize ? (
        <VirtualizedFeedContent
          posts={posts}
          trackPostView={trackPostView}
          trackPostInteraction={trackPostInteraction}
        />
      ) : (
        <FeedContent
          posts={posts}
          trackPostView={trackPostView}
          trackPostInteraction={trackPostInteraction}
        />
      )}
    </div>
  );
}
