import { FeedSkeleton } from "./FeedSkeleton";
import { EmptyFeed } from "./EmptyFeed";
import { PublicFeedWall } from "./PublicFeedWall";
import type { Post } from "@/types/post";
import { FeedContent } from "./FeedContent";
import { usePersonalizedFeed } from "@/hooks/feed/use-personalized-feed";
import { useRealtimeFeedSimple } from "@/hooks/feed/hooks/use-realtime-feed-simple";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { getPublicFeedPreview } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  let parent: HTMLElement | null = el.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const overflow = style.overflow;
    const isScrollable =
      overflowY === "auto" || overflowY === "scroll" || overflow === "auto" || overflow === "scroll";
    if (isScrollable) return parent;
    parent = parent.parentElement;
  }
  return null;
}

interface FeedProps {
  userId?: string;
  groupId?: string;
  companyId?: string;
  contentType?: 'regular' | 'idea' | 'project';
}

export function Feed({ userId, groupId, companyId, contentType }: FeedProps) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const isMobile = useIsMobile();
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const pullDistanceRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

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
  const loaderRef = useRef<HTMLDivElement>(null);

  const isAtTop = useCallback(() => {
    const rootEl = loaderRef.current ? getScrollParent(loaderRef.current) : null;
    if (!rootEl) {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      return scrollTop <= 0;
    }
    return rootEl.scrollTop <= 0;
  }, []);

  const triggerRefresh = useCallback(() => {
    if (isPullRefreshing) return;
    setIsPullRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["posts", "public-preview"], exact: false });

    try {
      window.dispatchEvent(new Event('hsocial:home_refresh'));
    } catch {
      // ignore
    }
    window.setTimeout(() => {
      setIsPullRefreshing(false);
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }, 700);
  }, [isPullRefreshing, queryClient]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent;
      const count = (ev as any)?.detail?.count;
      setNewPostsCount(typeof count === 'number' ? count : 0);
    };

    window.addEventListener('hsocial:new_posts_count', handler as any);
    return () => window.removeEventListener('hsocial:new_posts_count', handler as any);
  }, []);

  const handleSeeNewPosts = useCallback(() => {
    try {
      window.dispatchEvent(new Event('hsocial:see_new_posts'));
    } catch {
      // ignore
    }
    triggerRefresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [triggerRefresh]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isAtTop()) return;
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
    isPullingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current) return;
    if (touchStartYRef.current == null) return;

    const y = e.touches[0]?.clientY;
    if (typeof y !== 'number') return;

    const dy = y - touchStartYRef.current;
    if (dy <= 0) {
      pullDistanceRef.current = 0;
      setPullDistance(0);
      return;
    }

    const next = Math.min(120, dy);
    pullDistanceRef.current = next;
    setPullDistance(next);
  };

  const handleTouchEnd = () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    touchStartYRef.current = null;

    const d = pullDistanceRef.current;
    if (d >= 70) {
      triggerRefresh();
      return;
    }

    pullDistanceRef.current = 0;
    setPullDistance(0);
  };

  const maybeLoadMore = useCallback(() => {
    if (!hasNextPage) return;
    if (isFetchingNextPage) return;
    fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!hasNextPage) return;

    const rootEl = loaderRef.current ? getScrollParent(loaderRef.current) : null;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) maybeLoadMore();
      },
      { root: rootEl ?? null, rootMargin: "200px" }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    const checkIfSentinelVisible = () => {
      if (!loaderRef.current) return;
      const rect = loaderRef.current.getBoundingClientRect();

      if (!rootEl) {
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        if (rect.top <= viewportHeight + 200) {
          maybeLoadMore();
        }
        return;
      }

      const rootRect = rootEl.getBoundingClientRect();
      if (rect.top <= rootRect.bottom + 200) {
        maybeLoadMore();
      }
    };

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        checkIfSentinelVisible();
      });
    };

    // If the page isn't tall enough (common on mobile), trigger immediately
    const t = window.setTimeout(checkIfSentinelVisible, 0);

    const scrollTarget: any = rootEl ?? window;
    scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.clearTimeout(t);
      scrollTarget.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
      }
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
      observer.disconnect();
    };
  }, [isAuthenticated, hasNextPage, maybeLoadMore, posts.length]);

  // Set up real-time subscriptions for feed, reactions and comments
  useRealtimeFeedSimple(isAuthenticated ? (user?.id ?? undefined) : undefined);

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
    };

    window.addEventListener('hsocial:home_refresh', handler);
    return () => window.removeEventListener('hsocial:home_refresh', handler);
  }, [queryClient]);

  if (!isAuthenticated) {
    if (isPublicLoading) {
      return <FeedSkeleton />;
    }

    if (isPublicError) {
      return <EmptyFeed />;
    }

    const previewPosts = (publicPreview?.posts || []) as Post[];
    if (previewPosts.length === 0) {
      return <EmptyFeed />;
    }

    return (
      <div
        className="feed-container mx-auto w-full max-w-[800px] px-3 sm:px-5 py-2"
        onTouchStart={isMobile ? undefined : handleTouchStart}
        onTouchMove={isMobile ? undefined : handleTouchMove}
        onTouchEnd={isMobile ? undefined : handleTouchEnd}
      >
        {(pullDistance > 0 || isPullRefreshing) && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <div className={`w-4 h-4 border-2 border-current border-t-transparent rounded-full ${isPullRefreshing ? 'animate-spin' : ''}`} />
            <span>{isPullRefreshing ? 'Actualizando…' : 'Desliza para actualizar'}</span>
          </div>
        )}

        <FeedContent
          posts={previewPosts}
          trackPostView={async () => {}}
          trackPostInteraction={async () => {}}
        />

        <div className="mt-6">
          <PublicFeedWall />
        </div>
      </div>
    );
  }

  return (
    <div
      className="feed-container mx-auto w-full max-w-[800px] px-3 sm:px-5 py-2"
      onTouchStart={isMobile ? undefined : handleTouchStart}
      onTouchMove={isMobile ? undefined : handleTouchMove}
      onTouchEnd={isMobile ? undefined : handleTouchEnd}
    >
      {(pullDistance > 0 || isPullRefreshing) && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
          <div className={`w-4 h-4 border-2 border-current border-t-transparent rounded-full ${isPullRefreshing ? 'animate-spin' : ''}`} />
          <span>{isPullRefreshing ? 'Actualizando…' : 'Desliza para actualizar'}</span>
        </div>
      )}

      {newPostsCount > 0 && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
          <Button variant="outline" className="rounded-full border-border/30" onClick={handleSeeNewPosts}>
            Ver novedades ({newPostsCount})
          </Button>
        </div>
      )}

      <FeedContent
        posts={posts as Post[]}
        trackPostView={trackPostView}
        trackPostInteraction={trackPostInteraction}
      />

      {/* Loader sentinel for IntersectionObserver */}
      <div ref={loaderRef} className="py-4 flex justify-center">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Cargando…
          </div>
        )}
        {!hasNextPage && posts.length > 0 && (
          <div className="text-sm text-muted-foreground">Ya estás al día</div>
        )}
      </div>
    </div>
  );
}