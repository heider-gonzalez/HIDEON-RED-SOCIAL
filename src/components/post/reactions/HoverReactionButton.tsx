import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ReactionType } from "@/types/database/social.types";
import { reactionIcons } from "./ReactionIcons";
import { ReactionMenu } from "./ReactionMenu";
import { useLongPress } from "./hooks/use-long-press";
import { useIsMobile } from "@/hooks/use-mobile";

interface HoverReactionButtonProps {
  postId: string;
  userReaction: ReactionType | null;
  onReactionClick: (type: ReactionType) => void;
  postType?: string;
  isSubmitting?: boolean;
  reactionCount?: number;
}

export function HoverReactionButton({
  postId: _postId,
  userReaction,
  onReactionClick,
  postType: _postType,
  isSubmitting = false,
  reactionCount = 0
}: HoverReactionButtonProps) {
  const [animatingReaction, setAnimatingReaction] = useState<ReactionType | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeReactionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useIsMobile();

  // Long press hook para mostrar menú de reacciones
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
        onReactionClick(reaction);
      }
      setShowReactions(false);
    }
  });

  // Determinar qué reacción mostrar basado en la reacción del usuario
  const primaryReactionType: ReactionType = userReaction || "love";
  const reactionData = reactionIcons[primaryReactionType];
   
  // Click en el botón principal
  const handleButtonClick = useCallback(() => {
    if (isMobile) {
      const nextType: ReactionType = userReaction || 'love';
      setAnimatingReaction(nextType);
      setTimeout(() => setAnimatingReaction(null), 600);
      onReactionClick(nextType);
      return;
    }

    if (userReaction) {
      setAnimatingReaction(primaryReactionType);
      setTimeout(() => setAnimatingReaction(null), 600);
      onReactionClick(primaryReactionType);
    } else {
      setShowReactions(true);
    }
  }, [isMobile, onReactionClick, primaryReactionType, setShowReactions, userReaction]);

  // Determinar si el usuario ha reaccionado
  const hasReacted = userReaction !== null;
   
  // Obtener el ícono de la reacción
  const CurrentIcon = reactionData.icon;
  const currentColor = hasReacted ? reactionData.color : '';
  const currentEmoji = hasReacted ? reactionData.emoji : null;
  const activeClasses = hasReacted ? `${currentColor} bg-muted/50 border border-border` : 'hover:bg-muted/50 border border-transparent';

  const handleReactionSelected = useCallback((type: ReactionType) => {
    setAnimatingReaction(type);
    setTimeout(() => setAnimatingReaction(null), 600);
    onReactionClick(type);
    setShowReactions(false);
  }, [onReactionClick, setShowReactions]);

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
    }, 260);
  }, [cancelCloseReactions, setActiveReaction, setShowReactions]);

  useEffect(() => {
    if (!showReactions) return;

    const onPointerDown = (e: PointerEvent) => {
      const root = wrapperRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (!target) return;

      if (!root.contains(target)) {
        setShowReactions(false);
        setActiveReaction(null);
      }
    };

    document.addEventListener('pointerdown', onPointerDown, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, { capture: true } as any);
    };
  }, [showReactions, setActiveReaction, setShowReactions]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => {
        if (!isMobile) {
          cancelCloseReactions();
        }
      }}
      onMouseLeave={() => {
        if (!isMobile) {
          scheduleCloseReactions();
        }
      }}
    >
      {/* Menú de reacciones flotante */}
      {showReactions && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50"
          onMouseEnter={() => {
            if (!isMobile) {
              cancelCloseReactions();
            }
          }}
          onMouseLeave={() => {
            if (!isMobile) {
              scheduleCloseReactions();
            }
          }}
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
        className={`flex items-center px-3 py-2 transition-all duration-200 ${activeClasses} ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
        onClick={handleButtonClick}
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
        disabled={isSubmitting}
      >
        {currentEmoji ? (
          <span
            className={`mr-2 text-xl transition-transform duration-200 ${
              hasReacted ? `scale-110 ${reactionData.animationClass}` : ''
            } ${animatingReaction === primaryReactionType ? reactionData.animationClass : ''}`}
          >
            {currentEmoji}
          </span>
        ) : (
          <CurrentIcon
            className={`h-5 w-5 mr-2 transition-transform duration-200 ${
              hasReacted ? `${currentColor} fill-current scale-110 ${reactionData.animationClass}` : ''
            } ${animatingReaction === primaryReactionType ? reactionData.animationClass : ''}`}
            strokeWidth={1.5}
          />
        )}
        <span className={`text-sm font-medium ${hasReacted ? currentColor : ''}`}>
          {hasReacted ? reactionData.label : "Reaccionar"}
        </span>
        {reactionCount > 0 && (
          <span className={`text-sm ml-2 ${hasReacted ? currentColor : 'text-muted-foreground'}`}>
            {reactionCount}
          </span>
        )}
      </Button>
    </div>
  );
}