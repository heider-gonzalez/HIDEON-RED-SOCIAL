import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ReactionMenu } from "../reactions/ReactionMenu";
import { type ReactionType } from "../reactions/ReactionIcons";
import { useLongPress } from "../reactions/hooks/use-long-press";

interface ReactionButtonProps {
  onReaction: (type: ReactionType) => void;
  reactionCount: number;
  userReaction?: ReactionType | null;
}

export function ReactionButton({ 
  onReaction, 
  reactionCount, 
  userReaction 
}: ReactionButtonProps) {
  const [animatingReaction, setAnimatingReaction] = useState<ReactionType | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  const {
    showReactions,
    activeReaction,
    setActiveReaction,
    setShowReactions,
    handlePressStart,
    handlePressEnd,
    longPressTriggeredRef
  } = useLongPress({
    longPressThreshold: 1000,
    onPressEnd: (reaction) => {
      if (reaction) {
        handleReactionSelected(reaction);
      }
      setShowReactions(false);
    }
  });

  const handleReactionSelected = (type: ReactionType) => {
    setAnimatingReaction(type);
    setTimeout(() => setAnimatingReaction(null), 600);
    onReaction(type);
  };

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const startIdleTimer = () => {
    clearIdleTimer();
    idleTimerRef.current = window.setTimeout(() => {
      setShowReactions(false);
      setActiveReaction(null);
    }, 2500);
  };

  useEffect(() => {
    if (!showReactions) return;

    startIdleTimer();

    const handleOutsidePointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(e.target as Node)) return;
      setShowReactions(false);
      setActiveReaction(null);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
      clearIdleTimer();
    };
  }, [showReactions, setShowReactions, setActiveReaction]);

  const handleClick = () => {
    if (showReactions) {
      setShowReactions(false);
      setActiveReaction(null);
      return;
    }

    // If a long-press already opened the menu, don't apply the short-click reaction
    if (longPressTriggeredRef.current) {
      return;
    }

    if (!showReactions) {
      // Click corto: Like (mapeado a 'love' por compatibilidad)
      handleReactionSelected('love');
    }
  };

  const userHasReacted = !!userReaction;

  return (
    <div ref={rootRef} className="relative flex items-center">
      {/* Menú de reacciones flotante */}
      {showReactions && (
        <div className="absolute bottom-full left-0 mb-2 z-50">
          <ReactionMenu
            show={showReactions}
            activeReaction={activeReaction}
            setActiveReaction={setActiveReaction}
            onReactionSelected={handleReactionSelected}
            onPointerLeave={() => {
              // No cerrar de inmediato al salir; se cierra por inactividad o click fuera
              startIdleTimer();
            }}
            onPointerEnter={() => startIdleTimer()}
            onPointerMove={() => startIdleTimer()}
          />
        </div>
      )}

      <Button 
        variant="ghost" 
        size="sm" 
        className={`flex items-center gap-2 ${userHasReacted ? 'text-red-500' : ''}`}
        onClick={handleClick}
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        onPointerLeave={handlePressEnd}
      >
        <Heart 
          className={`h-6 w-6 transition-transform duration-200 ${
            userHasReacted ? 'fill-red-500 text-red-500 scale-110' : ''
          } ${animatingReaction ? 'reaction-love' : ''}`} 
        />
        <span className="text-sm">Reaccionar</span>
      </Button>
    </div>
  );
}
