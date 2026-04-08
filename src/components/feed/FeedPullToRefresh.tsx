import { useCallback, useRef, useState, useEffect } from "react";

interface FeedPullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  let parent: HTMLElement | null = el.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const overflow = style.overflow;
    const isScrollable =
      overflowY === "auto" || overflowY === "scroll" || overflow === "auto" || overflow === "scroll";
    if (isScrollable) return parent;
    parent = parent.parentElement;
  }
  return null;
}

export function FeedPullToRefresh({ onRefresh, children }: FeedPullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const pullDistanceRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  const isAtTop = useCallback(() => {
    const rootEl = document.querySelector('[data-feed-container]') as HTMLElement;
    if (!rootEl) return false;
    const scrollParent = getScrollParent(rootEl);
    if (!scrollParent) return false;
    return scrollParent.scrollTop <= 0;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isAtTop()) return;
    touchStartYRef.current = e.touches[0].clientY;
    pullDistanceRef.current = 0;
    isPullingRef.current = false;
  }, [isAtTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touchStartYRef.current === null || !isAtTop()) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartYRef.current;
    
    if (deltaY > 0) {
      e.preventDefault();
      pullDistanceRef.current = Math.min(deltaY * 0.5, 120);
      setPullDistance(pullDistanceRef.current);
      
      if (!isPullingRef.current && pullDistanceRef.current > 80) {
        isPullingRef.current = true;
      }
    }
  }, [isAtTop]);

  const handleTouchEnd = useCallback(async () => {
    if (isPullingRef.current && !isPullRefreshing) {
      setIsPullRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsPullRefreshing(false);
      }
    }
    
    setPullDistance(0);
    touchStartYRef.current = null;
    isPullingRef.current = false;
  }, [isPullingRef, isPullRefreshing, onRefresh]);

  useEffect(() => {
    const container = document.querySelector('[data-feed-container]') as HTMLElement;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart as any, { passive: false });
    container.addEventListener('touchmove', handleTouchMove as any, { passive: false });
    container.addEventListener('touchend', handleTouchEnd as any);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart as any);
      container.removeEventListener('touchmove', handleTouchMove as any);
      container.removeEventListener('touchend', handleTouchEnd as any);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <>
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm border-b border-border/30 transition-transform duration-200"
          style={{ transform: `translateY(${Math.min(pullDistance, 120)}px)` }}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isPullRefreshing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                <span>Actualizando...</span>
              </>
            ) : (
              <>
                <svg 
                  className={`h-4 w-4 transition-transform ${pullDistance > 80 ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{pullDistance > 80 ? 'Soltar para actualizar' : 'Tirar para actualizar'}</span>
              </>
            )}
          </div>
        </div>
      )}
      {children}
    </>
  );
}
