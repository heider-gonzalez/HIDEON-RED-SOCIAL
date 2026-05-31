import React from "react";
import { Post as PostComponent } from "@/components/Post";
import type { Post } from "@/types/post";
import { PostCardWithTracking } from "@/components/feed/PostCardWithTracking";

interface UnifiedPostCardProps {
  post: Post;
  isInFeed?: boolean;
  trackPostView?: (postId: string, duration?: number) => void;
  trackPostInteraction?: (postId: string, type: 'like' | 'comment' | 'share') => void;
}

export function UnifiedPostCard({ 
  post, 
  isInFeed = false,
  trackPostView,
  trackPostInteraction 
}: UnifiedPostCardProps) {
  
  // Solo mostramos posts regulares (texto, foto, video, ideas)
  // Oportunidades eliminadas
  // Fade-in animación para posts nuevos
  const fadeIn = (post as any)._fadeIn;
  return (
    <div
      className={
        `mb-0 w-full transition-opacity duration-700 ${fadeIn ? 'opacity-0 animate-fadein' : 'opacity-100'}`
      }
      style={fadeIn ? { animation: 'fadein 0.7s forwards' } : {}}
    >
      {isInFeed ? (
        <PostCardWithTracking
          post={post}
          isInFeed={isInFeed}
          trackPostView={trackPostView}
          trackPostInteraction={trackPostInteraction}
        />
      ) : (
        <PostComponent post={post} />
      )}
    </div>
  );
}