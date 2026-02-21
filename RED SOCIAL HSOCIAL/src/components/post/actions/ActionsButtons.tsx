import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, ThumbsUp, Share2 } from "lucide-react";
import { Post } from "@/types/post";
import { ReactionType } from "@/types/database/social.types";
import { reactionIcons } from "../reactions/ReactionIcons";
import { ReactionMenu } from "../reactions/ReactionMenu";
import { useLongPress } from "../reactions/hooks/use-long-press";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";

interface ActionsButtonsProps {
  postId: string;
  userReaction: ReactionType | null;
  onComment: () => void;
  onShare?: () => void;
  compact?: boolean;
  handleReaction?: (type: ReactionType) => void;
  post?: Post;
  showJoinButton?: boolean;
  onJoinClick?: () => void;
  onReaction?: (id: string, type: ReactionType) => void;
  commentsExpanded?: boolean;
  sharesCount?: number;
}

export function ActionsButtons({
  userReaction,
  handleReaction,
  postId,
  onComment,
  onShare,
  compact = false,
  post,
  onReaction,
  commentsExpanded,
  sharesCount = 0
}: ActionsButtonsProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const closeReactionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAuthRequired = useCallback(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return true;
    }
    return false;
  }, [isAuthenticated, navigate]);
  
  const handleReactionClick = (type: ReactionType) => {
    if (handleAuthRequired()) return;
    if (onReaction) {
      onReaction(postId, type);
    } else if (handleReaction) {
      handleReaction(type);
    } else {
      // No handler provided
      return;
    }
  };

  const [animatingReaction, setAnimatingReaction] = useState<ReactionType | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
        setAnimatingReaction(reaction);
      }
      setTimeout(() => setAnimatingReaction(null), 600);
      setShowReactions(false);
    }
  });

  const handleReactionButtonClick = useCallback(() => {
    const reactionType = userReaction || 'love';
    handleReactionClick(reactionType);
    setAnimatingReaction(reactionType);
    setTimeout(() => setAnimatingReaction(null), 600);
  }, [userReaction]);

  const handleReactionSelected = useCallback((type: ReactionType) => {
    setAnimatingReaction(type);
    setTimeout(() => setAnimatingReaction(null), 600);
    handleReactionClick(type);
    setShowReactions(false);
  }, [setShowReactions]);

  const cancelCloseReactions = useCallback(() => {
    if (closeReactionsTimeoutRef.current) {
      clearTimeout(closeReactionsTimeoutRef.current);
      closeReactionsTimeoutRef.current = null;
    }
  }, []);

  const scheduleCloseReactions = useCallback(() => {
    cancelCloseReactions();
    closeReactionsTimeoutRef.current = setTimeout(() => {
      setShowReactions(false);
      setActiveReaction(null);
    }, 220);
  }, [cancelCloseReactions, setActiveReaction, setShowReactions]);

  const hasReacted = userReaction !== null;
  const reactionData = hasReacted ? reactionIcons[userReaction] : null;

  const baseActionClass = "h-11 sm:h-10 gap-2 rounded-md transition-colors";
  const inactiveClass = "text-muted-foreground hover:text-foreground hover:bg-muted/60";
  const activeClass = "text-primary hover:text-primary hover:bg-primary/10";

  return (
    <div className="px-2 sm:px-3 py-2">
      <div className="flex items-center justify-between gap-1">
        {/* Reaction button */}
        <div
          className="relative flex-1"
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
              />
            </div>
          )}

          <Button
            ref={buttonRef}
            variant="ghost"
            size="sm"
            className={`w-full ${baseActionClass} ${hasReacted ? activeClass : inactiveClass}`}
            onClick={handleReactionButtonClick} 
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
            {hasReacted && reactionData ? (
              <span className={`text-lg leading-none ${animatingReaction === userReaction ? reactionData.animationClass : ''}`}>
                {reactionData.emoji}
              </span>
            ) : (
              <ThumbsUp className="h-5 w-5" strokeWidth={hasReacted ? 2 : 1.5} />
            )}
            <span className="text-sm font-medium hidden sm:inline">
              {hasReacted && reactionData ? reactionData.label : reactionIcons.love.label}
            </span>
          </Button>
        </div>
        
        {/* Comment button */}
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 ${baseActionClass} ${inactiveClass}`}
          onClick={() => {
            if (handleAuthRequired()) return;
            onComment();
          }}
        >
          <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-sm font-medium hidden sm:inline">Comentar</span>
        </Button>
        
        {/* Repost button */}
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 ${baseActionClass} ${inactiveClass}`}
          onClick={() => {
            if (handleAuthRequired()) return;
            onShare?.();
          }}
        >
          <Share2 className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-sm font-medium hidden sm:inline">Compartir</span>
        </Button>
      </div>
    </div>
  );
}
