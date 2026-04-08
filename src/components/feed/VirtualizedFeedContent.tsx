import { UnifiedPostCard } from "@/components/UnifiedPostCard";
import { PeopleYouMayKnow } from "@/components/friends/PeopleYouMayKnow";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Post } from "@/types/post";
import { memo, useMemo, useRef } from "react";
import { FeedReelsSection } from "./FeedReelsSection";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualizedFeedContentProps {
  posts: Post[];
  trackPostView?: (postId: string, duration?: number) => void;
  trackPostInteraction?: (postId: string, type: 'like' | 'comment' | 'share') => void;
}

export const VirtualizedFeedContent = memo(function VirtualizedFeedContent({ 
  posts,
  trackPostView,
  trackPostInteraction
}: VirtualizedFeedContentProps) {
  const isMobile = useIsMobile();
  const parentRef = useRef<HTMLDivElement>(null);

  // Create virtualized items with special nodes
  const items = useMemo(() => {
    const items: Array<{ type: 'post'; post: Post } | { type: 'reels'; posts: Post[] } | { type: 'people' }> = [];
    let insertedPeople = false;
    let insertedReels = false;

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      items.push({ type: 'post', post });

      if (!insertedReels && (isMobile ? i === 2 : i === 1)) {
        insertedReels = true;
        items.push({ type: 'reels', posts });
      }

      if (!insertedPeople && (isMobile ? i === 6 : i === 4)) {
        insertedPeople = true;
        items.push({ type: 'people' });
      }
    }

    return items;
  }, [posts, isMobile]);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = items[index];
      if (item.type === 'post') {
        // Estimate post height based on content
        const post = item.post;
        let height = 200; // Base height
        if (post.content) height += Math.min(post.content.length * 0.5, 150);
        if (post.media_url || post.media_urls) height += 200;
        return height;
      }
      if (item.type === 'reels') return 250;
      if (item.type === 'people') return 400;
      return 200;
    },
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          
          return (
            <div
              key={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {item.type === 'post' && (
                <div className="w-full h-full">
                  <UnifiedPostCard
                    post={item.post}
                    isInFeed={true}
                    trackPostView={trackPostView}
                    trackPostInteraction={trackPostInteraction}
                  />
                </div>
              )}
              {item.type === 'reels' && (
                <div className="w-full h-full">
                  <FeedReelsSection posts={item.posts} />
                </div>
              )}
              {item.type === 'people' && (
                <div className="w-full h-full px-0 md:px-4">
                  <PeopleYouMayKnow />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
