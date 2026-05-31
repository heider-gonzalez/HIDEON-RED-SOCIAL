import { Post as PostComponent } from "@/components/Post";
import { useViewportTracking, usePostInteractionTracking } from "@/hooks/feed/use-viewport-tracking";
import type { Post } from "@/types/post";

interface PostCardWithTrackingProps {
  post: Post;
  isInFeed?: boolean;
  trackPostView?: (postId: string, duration?: number) => void;
  trackPostInteraction?: (postId: string, type: 'like' | 'comment' | 'share') => void;
}

export function PostCardWithTracking({ 
  post, 
  isInFeed = false,
  trackPostView,
  trackPostInteraction
}: PostCardWithTrackingProps) {
  
  // Hook para tracking de viewport
  const { ref } = useViewportTracking(post.id, {
    threshold: 0.6, // 60% del post debe estar visible
    minDuration: 2000, // Mínimo 2 segundos para contar como view
  });

  // Hook para tracking de interacciones
  const { 
    trackLike, 
    trackComment, 
    trackShare 
  } = usePostInteractionTracking(post.id);

  // Wrapper functions que combinan el tracking local con el del feed
  const handleLike = () => {
    trackLike();
    trackPostInteraction?.(post.id, 'like');
  };

  const handleComment = () => {
    trackComment();
    trackPostInteraction?.(post.id, 'comment');
  };

  const handleShare = () => {
    trackShare();
    trackPostInteraction?.(post.id, 'share');
  };

  // Fade-in animación para posts nuevos
  const fadeIn = (post as any)._fadeIn;
  return (
    <div
      ref={ref}
      className={`post-tracking-wrapper transition-opacity duration-700 ${fadeIn ? 'opacity-0 animate-fadein' : 'opacity-100'}`}
      style={fadeIn ? { animation: 'fadein 0.7s forwards' } : {}}
    >
      <PostComponent post={post} />
    </div>
  );
}