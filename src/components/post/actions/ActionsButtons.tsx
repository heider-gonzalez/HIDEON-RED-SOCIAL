import React, { useState, useRef, useCallback, useEffect } from "react";
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
  const reactionsRootRef = useRef<HTMLDivElement | null>(null);
  const closeReactionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const pointerMovedRef = useRef(false);
  const DRAG_THRESHOLD_PX = 10;
  const lastWheelAtRef = useRef(0);
  const hoverOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const WHEEL_GUARD_MS = 220;
  const HOVER_OPEN_DELAY_MS = 160;

  const handleAuthRequired = useCallback(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return true;
    }
    return false;
  }, [isAuthenticated, navigate]);
  
  const handleReactionClick = useCallback((type: ReactionType) => {
    if (handleAuthRequired()) return;
    if (onReaction) {
      onReaction(postId, type);
    } else if (handleReaction) {
      handleReaction(type);
    }
  }, [handleAuthRequired, onReaction, postId, handleReaction]);

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
    if (pointerMovedRef.current) return;
    if (Date.now() - lastWheelAtRef.current < WHEEL_GUARD_MS) return;
    const reactionType = userReaction || 'love';
    handleReactionClick(reactionType);
    setAnimatingReaction(reactionType);
    setTimeout(() => setAnimatingReaction(null), 600);
  }, [userReaction, handleReactionClick]);

  const handleReactionSelected = useCallback((type: ReactionType) => {
    setAnimatingReaction(type);
    setTimeout(() => setAnimatingReaction(null), 600);
    handleReactionClick(type);
    setShowReactions(false);
  }, [setShowReactions, handleReactionClick]);

  const cancelCloseReactions = useCallback(() => {
    if (closeReactionsTimeoutRef.current) {
      clearTimeout(closeReactionsTimeoutRef.current);
      closeReactionsTimeoutRef.current = null;
    }
  }, []);

  const cancelHoverOpen = useCallback(() => {
    if (hoverOpenTimeoutRef.current) {
      clearTimeout(hoverOpenTimeoutRef.current);
      hoverOpenTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelHoverOpen();
      cancelCloseReactions();
    };
  }, [cancelCloseReactions, cancelHoverOpen]);

  useEffect(() => {
    if (!showReactions) return;

    const onPointerDown = (e: PointerEvent) => {
      const root = reactionsRootRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (root.contains(target)) return;
      setShowReactions(false);
      setActiveReaction(null);
    };

    document.addEventListener('pointerdown', onPointerDown, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, { capture: true } as any);
    };
  }, [showReactions, setActiveReaction, setShowReactions]);

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
        <div
          ref={reactionsRootRef}
          className="relative flex-1"
          onWheelCapture={() => {
            lastWheelAtRef.current = Date.now();
          }}
          onMouseEnter={() => {
            if (Date.now() - lastWheelAtRef.current < WHEEL_GUARD_MS) return;
            cancelCloseReactions();
            cancelHoverOpen();
            hoverOpenTimeoutRef.current = setTimeout(() => {
              setShowReactions(true);
            }, HOVER_OPEN_DELAY_MS);
          }}
          onMouseLeave={() => {
            cancelHoverOpen();
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
              pointerDownRef.current = { x: e.clientX, y: e.clientY };
              pointerMovedRef.current = false;
              if (e.pointerType !== 'mouse') {
                handlePressStart();
              }
            }}
            onPointerMove={(e) => {
              const start = pointerDownRef.current;
              if (!start) return;
              const dx = e.clientX - start.x;
              const dy = e.clientY - start.y;
              if (!pointerMovedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
                pointerMovedRef.current = true;
                setShowReactions(false);
                setActiveReaction(null);
              }
            }}
            onPointerUp={(e) => {
              pointerDownRef.current = null;
              if (pointerMovedRef.current) {
                pointerMovedRef.current = false;
                return;
              }
              if (Date.now() - lastWheelAtRef.current < WHEEL_GUARD_MS) return;
              if (e.pointerType !== 'mouse') {
                handlePressEnd();
              }
            }}
            onPointerLeave={(e) => {
              pointerDownRef.current = null;
              if (pointerMovedRef.current) {
                pointerMovedRef.current = false;
                return;
              }
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
