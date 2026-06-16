import { FeedSkeleton } from "./FeedSkeleton";
import { EmptyFeed } from "./EmptyFeed";
import { PublicFeedWall } from "./PublicFeedWall";
import type { Post } from "@/types/post";
import { FeedContent } from "./FeedContent";
import { VirtualizedFeedContent } from "./VirtualizedFeedContent";
import { FacebookPostCreator } from "./FacebookPostCreator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

interface FeedMainContentProps {
  userId?: string;
  groupId?: string;
  companyId?: string;
  contentType?: 'regular' | 'idea' | 'project';
  posts: Post[];
  isLoading: boolean;
  isError?: boolean;
  error?: unknown;
  refetch?: () => void;
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
  isError,
  error,
  refetch,
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

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const t = window.setTimeout(() => setTimedOut(true), 10000);
    return () => window.clearTimeout(t);
  }, [isLoading]);

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

  if ((isError || timedOut) && posts.length === 0) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <div className="text-sm text-muted-foreground">No se pudo cargar el feed.</div>
        <div className="mt-4">
          <Button
            onClick={() => {
              setTimedOut(false);
              refetch?.();
            }}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading && posts.length === 0) {
    return <FeedSkeleton />;
  }

  if (posts.length === 0 && !isLoading) {
    return (
      <>
        <FacebookPostCreator />
        <EmptyFeed />
      </>
    );
  }

  return (
    <div data-feed-container className="relative">
      <FacebookPostCreator />
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
