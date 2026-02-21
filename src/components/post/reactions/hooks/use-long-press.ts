
import { useState, useRef, useCallback, useEffect } from "react";
import { type ReactionType } from "../ReactionIcons";

interface UseLongPressProps {
  longPressThreshold?: number;
  onPressEnd?: (reaction: ReactionType | null) => void;
}

export function useLongPress({
  longPressThreshold = 500,
  onPressEnd
}: UseLongPressProps = {}) {
  const [showReactions, setShowReactions] = useState(false);
  const [activeReaction, setActiveReaction] = useState<ReactionType | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearPressTimer = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  // Start a timer and show reactions only if user keeps pressing
  const handlePressStart = useCallback(() => {
    clearPressTimer();
    longPressTriggeredRef.current = false;

    pressTimer.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setShowReactions(true);
    }, longPressThreshold);
  }, [clearPressTimer, longPressThreshold]);

  const handlePressEnd = useCallback(() => {
    clearPressTimer();
    
    // If there's an active reaction and the reactions menu is visible,
    // trigger the callback when the user lifts their finger/pointer
    if (activeReaction && showReactions && onPressEnd) {
      onPressEnd(activeReaction);
    }
  }, [activeReaction, showReactions, onPressEnd]);

  // Clean up timer if component unmounts while timer is active
  useEffect(() => {
    return () => {
      clearPressTimer();
    };
  }, [clearPressTimer]);

  return {
    showReactions,
    activeReaction,
    setActiveReaction,
    setShowReactions,
    handlePressStart,
    handlePressEnd,
    longPressTriggeredRef
  };
}
