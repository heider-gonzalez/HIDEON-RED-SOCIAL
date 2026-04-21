import { UnifiedPostCard } from "@/components/UnifiedPostCard";
import { PeopleYouMayKnow } from "@/components/friends/PeopleYouMayKnow";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Post } from "@/types/post";
import { memo, useMemo } from "react";
import { FeedReelsSection } from "./FeedReelsSection";

interface FeedContentProps {
  posts: Post[];
  trackPostView?: (postId: string, duration?: number) => void;
  trackPostInteraction?: (postId: string, type: 'like' | 'comment' | 'share') => void;
}

export const FeedContent = memo(function FeedContent({ 
  posts,
  trackPostView,
  trackPostInteraction
}: FeedContentProps) {
  const isMobile = useIsMobile();
  
  // Solo mostrar posts reales de la base de datos
  const allPosts = posts;

  const feedNodes = useMemo(() => {
    const nodes: JSX.Element[] = [];
    let insertedPeople = false;
    let insertedReels = false;

    // Distribute posts with recommendations
    for (let i = 0; i < allPosts.length; i++) {
      const post = allPosts[i];

      nodes.push(
        <div key={post.id} className="w-full">
          <UnifiedPostCard
            post={post}
            isInFeed={true}
            trackPostView={trackPostView}
            trackPostInteraction={trackPostInteraction}
          />
        </div>
      );

      if (!insertedReels && (isMobile ? i === 2 : i === 1)) {
        insertedReels = true;
        nodes.push(
          <div key="feed-reels" className="w-full">
            <FeedReelsSection />
          </div>
        );
      }

      // Add People You May Know after 5 posts on desktop, after 6 on mobile
      if (!insertedPeople && (isMobile ? i === 6 : i === 4)) {
        insertedPeople = true;
        nodes.push(
          <div key="people-you-may-know" className="w-full px-0 md:px-4">
            <PeopleYouMayKnow />
          </div>
        );
      }
    }

    return nodes;
  }, [allPosts, isMobile, trackPostInteraction, trackPostView]);

  return (
    <div className="space-y-8 w-full max-w-[680px] mx-auto">
      {feedNodes}
    </div>
  );
});
