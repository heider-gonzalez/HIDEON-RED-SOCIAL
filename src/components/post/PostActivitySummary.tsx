import React from "react";
import { ReactionSummary } from "./reactions/ReactionSummary";
import { Post } from "@/types/post";

interface PostActivitySummaryProps {
  post: Post;
  reactionsByType: Record<string, number>;
  commentsCount: number;
  sharesCount: number;
  viewsCount?: number;
  onCommentsClick?: () => void;
}

export function PostActivitySummary({
  post,
  reactionsByType,
  commentsCount,
  sharesCount,
  viewsCount = 0,
  onCommentsClick,
}: PostActivitySummaryProps) {
  const totalReactions = Object.values(reactionsByType).reduce((sum, count) => sum + count, 0);
  const hasActivity = totalReactions > 0 || commentsCount > 0 || sharesCount > 0 || viewsCount > 0;

  if (!hasActivity) {
    return null;
  }

  return (
    <div className="px-4 py-2 border-t border-border/40">
      {/* LinkedIn-style counters between content and action buttons */}
      <div className="flex items-center justify-between text-sm">
        {/* Left: Reactions with emoji icons and total count */}
        {totalReactions > 0 && (
          <div className="flex items-center gap-2">
            <ReactionSummary reactions={reactionsByType} postId={post.id} />
          </div>
        )}
        
        {/* Right: Comments and shares text counters */}
        <div className="flex items-center gap-1 text-muted-foreground ml-auto">
          {commentsCount > 0 && (
            <button 
              onClick={onCommentsClick} 
              className="hover:text-foreground transition-colors hover:underline"
            >
              {commentsCount} {commentsCount === 1 ? 'comentario' : 'comentarios'}
            </button>
          )}
          {commentsCount > 0 && (sharesCount > 0 || viewsCount > 0) && (
            <span className="mx-1">·</span>
          )}
          {sharesCount > 0 && (
            <span>
              {sharesCount} {sharesCount === 1 ? 'vez compartido' : 'veces compartido'}
            </span>
          )}
          {sharesCount > 0 && viewsCount > 0 && (
            <span className="mx-1">·</span>
          )}
          {viewsCount > 0 && (
            <span>
              {viewsCount} {viewsCount === 1 ? 'reproducción' : 'reproducciones'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}