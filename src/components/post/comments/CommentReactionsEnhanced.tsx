import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { normalizeReactionType, reactionIcons, type ReactionType } from "@/components/post/reactions/ReactionIcons";
import { ReactionMenu } from "@/components/post/reactions/ReactionMenu";
import { useLongPress } from "@/components/post/reactions/hooks/use-long-press";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";

interface CommentReactionsProps {
  commentId: string;
  userReaction: ReactionType | null;
  reactionsCount: number;
  onReaction: (commentId: string, type: ReactionType) => void;
  readOnly?: boolean;
}

export function CommentReactionsEnhanced({ 
  commentId, 
  userReaction, 
  reactionsCount, 
  onReaction,
  readOnly = false
}: CommentReactionsProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [animatingReaction, setAnimatingReaction] = useState<ReactionType | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const normalizedUserReaction = userReaction ? normalizeReactionType(userReaction) : null;
  const hasReacted = normalizedUserReaction !== null;
  const reactionData = hasReacted ? reactionIcons[normalizedUserReaction] : null;

  const handleAuthRequired = useCallback(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return true;
    }
    return false;
  }, [isAuthenticated, navigate]);

  const handleReactionClick = useCallback((type: ReactionType) => {
    if (handleAuthRequired()) return;
    
    setAnimatingReaction(type);
    setTimeout(() => setAnimatingReaction(null), 600);
    onReaction(commentId, type);
  }, [handleAuthRequired, commentId, onReaction]);

  const cancelCloseReactions = useCallback(() => {
    // Clear any timeout for closing reactions
  }, []);

  const scheduleCloseReactions = useCallback(() => {
    // Schedule closing reactions after delay
  }, []);

  const { 
    showReactions, 
    activeReaction, 
    setActiveReaction, 
    setShowReactions, 
    handlePressStart, 
    handlePressEnd 
  } = useLongPress({
    onPressEnd: (reaction) => {
      if (reaction) {
        handleReactionClick(reaction);
      }
      setShowReactions(false);
    }
  });

  const handleReactionSelected = useCallback((type: ReactionType) => {
    if (handleAuthRequired()) return;

    setAnimatingReaction(type);
    setTimeout(() => setAnimatingReaction(null), 600);
    onReaction(commentId, type);
    setActiveReaction(null);
    setShowReactions(false);
  }, [handleAuthRequired, commentId, onReaction, setActiveReaction, setShowReactions]);

  if (readOnly) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>{reactionIcons.love.label}</span>
        <span>{reactionsCount}</span>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <div
        className="relative"
        onMouseEnter={() => {
          cancelCloseReactions();
          setShowReactions(true);
        }}
        onMouseLeave={() => {
          scheduleCloseReactions();
        }}
      >
        {showReactions && (
          <div
            className="absolute bottom-full left-0 mb-2 z-50"
            onMouseEnter={cancelCloseReactions}
            onMouseLeave={scheduleCloseReactions}
          >
            <ReactionMenu
              show={showReactions}
              activeReaction={activeReaction}
              setActiveReaction={setActiveReaction}
              onReactionSelected={handleReactionSelected}
              onPointerLeave={() => setActiveReaction(null)}
              compact={true} // Versión compacta para comentarios
            />
          </div>
        )}

        <Button
          ref={buttonRef}
          variant="ghost"
          size="sm"
          className={`h-auto p-0 text-xs ${hasReacted ? 'text-red-500' : 'text-muted-foreground'} hover:bg-transparent`}
          onClick={() => handleReactionClick(normalizedUserReaction || 'love')}
          onPointerDown={(e) => {
            if (e.pointerType !== 'mouse') {
              handlePressStart();
            }
          }}
          onPointerUp={(e) => {
            if (e.pointerType !== 'mouse') {
              handlePressEnd();
            }
          }}
          onPointerLeave={(e) => {
            if (e.pointerType !== 'mouse') {
              handlePressEnd();
            }
          }}
        >
          <div className={`flex items-center gap-1 ${animatingReaction === normalizedUserReaction ? reactionData?.animationClass : ''}`}>
            {hasReacted && reactionData ? (
              <span className="text-red-500">
                {reactionData.emoji}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {reactionIcons.love.emoji}
              </span>
            )}
            <span>{reactionsCount}</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
