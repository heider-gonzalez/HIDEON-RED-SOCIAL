import { FeedHeader } from "./FeedHeader";
import { FeedPullToRefresh } from "./FeedPullToRefresh";
import { FeedMainContent } from "./FeedMainContent";
import { usePersonalizedFeed } from "@/hooks/feed/use-personalized-feed";
import { useRealtimeFeedSimple } from "@/hooks/feed/hooks/use-realtime-feed-simple";
import { useFeedStability } from "@/hooks/feed/use-feed-stability";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [isViewingPost, setIsViewingPost] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Hook de estabilidad para prevenir cambios bruscos
  const { shouldPreventUpdates, resetStability } = useFeedStability(isViewingPost);

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
    // Si estamos viendo un post, no hacer refresh para evitar cambios bruscos
    if (shouldPreventUpdates()) {
      console.log('Feed establecido - previniendo refresh');
      return;
    }
    
    setNewPostsCount(0);
    resetStability(); // Resetear estabilidad antes del refresh
    
    // Invalidar de forma controlada para evitar cambios bruscos
    await queryClient.invalidateQueries({ 
      queryKey: ['posts'], 
      exact: false,
      refetchType: 'active'
    });
  }, [queryClient, shouldPreventUpdates, resetStability]);

  const handleViewNewPosts = useCallback(() => {
    setNewPostsCount(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Detectar cuando el usuario está viendo un post individualmente
  useEffect(() => {
    const handlePostViewStart = () => setIsViewingPost(true);
    const handlePostViewEnd = () => setIsViewingPost(false);

    // Escuchar eventos personalizados del componente Post
    window.addEventListener('post:view:start', handlePostViewStart);
    window.addEventListener('post:view:end', handlePostViewEnd);

    return () => {
      window.removeEventListener('post:view:start', handlePostViewStart);
      window.removeEventListener('post:view:end', handlePostViewEnd);
    };
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
