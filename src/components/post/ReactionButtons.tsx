import React from "react";
import { HoverReactionButton } from "./reactions/HoverReactionButton";
import { ReactionSummary } from "./reactions/ReactionSummary";
import { ReactionType } from "@/types/database/social.types";
import type { Post } from "@/types/post";
import { Button } from "@/components/ui/button";
import { usePostReactions } from "@/hooks/posts/use-post-reactions";
import { normalizeReactionType } from "./reactions/ReactionIcons";

interface ReactionButtonsProps {
  post: Post;
  onReaction?: (type: string) => void;
}

export function ReactionButtons({ post, onReaction }: ReactionButtonsProps) {
  const { userReaction, onReaction: handleReaction } = usePostReactions(post.id);
  const debug = import.meta.env.DEV;
  if (!post) {
    return null;
  }

  // Debug: Log raw reactions data
  if (debug) {
    console.log('🔍 ReactionButtons Debug - Raw post data:', {
      postId: post.id,
      postType: post.post_type,
      reactions: post.reactions,
      reactionsLength: Array.isArray(post.reactions) ? post.reactions.length : 0,
      reactionsType: typeof post.reactions
    });
  }

  // Simplificar el procesamiento de reacciones
  const reactionsByType: Record<string, number> = {};

  if (Array.isArray(post.reactions)) {
    if (debug) console.log('🔍 Processing array reactions:', post.reactions);
    post.reactions.forEach((reaction: any) => {
      const type = (reaction?.reaction_type || reaction?.type) as ReactionType | undefined;
      if (debug) console.log('🔍 Processing reaction:', { reaction, type });
      if (type) {
        const normalizedType = normalizeReactionType(type);
        reactionsByType[normalizedType] = (reactionsByType[normalizedType] || 0) + 1;
      }
    });
  } else if (post.reactions && typeof post.reactions === 'object') {
    if (debug) console.log('🔍 Processing object reactions:', post.reactions);
    const byType = (post.reactions as any).by_type;
    if (byType && typeof byType === 'object') {
      Object.entries(byType).forEach(([type, count]) => {
        const normalizedType = normalizeReactionType(type);
        reactionsByType[normalizedType] = (reactionsByType[normalizedType] || 0) + (Number(count) || 0);
      });
    }
  }

  const hasReactions = Object.values(reactionsByType).reduce((sum, count) => sum + count, 0) > 0;

  // Debug: Log processed reactions
  if (debug) {
    console.log('🔍 ReactionButtons Debug - Processed reactions:', {
      postId: post.id,
      reactionsByType,
      hasReactions,
      totalReactions: Object.values(reactionsByType).reduce((sum, count) => sum + count, 0)
    });
  }

  return (
    <div className="flex items-center justify-start">
      {hasReactions && (
        <Button variant="ghost" size="sm" className="h-auto p-0 hover:underline">
          <ReactionSummary reactions={reactionsByType} postId={post.id} />
        </Button>
      )}
      <HoverReactionButton
        postId={post.id}
        userReaction={userReaction}
        onReactionClick={(type) => {
          handleReaction(post.id, type);
          onReaction?.(type);
        }}
        postType={post.post_type}
      />
    </div>
  );
}
