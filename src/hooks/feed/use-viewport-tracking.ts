import { useEffect, useRef, useCallback } from 'react';
import { personalizedFeedAlgorithm } from '@/lib/feed/personalized-algorithm';

interface ViewportTrackingOptions {
  threshold?: number; // Porcentaje del post que debe estar visible (0-1)
  minDuration?: number; // Tiempo mínimo en milisegundos para contar como view
}

const viewedPostsSessionKey = 'hsocial:viewed_posts';

function loadViewedPostsFromSession(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(viewedPostsSessionKey);
    if (!raw) return new Set();

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((x) => String(x)));
  } catch {
    return new Set();
  }
}

function saveViewedPostsToSession(viewed: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(viewedPostsSessionKey, JSON.stringify(Array.from(viewed)));
  } catch {
    // ignore
  }
}

const viewedPostsMemory = loadViewedPostsFromSession();

function hasViewedPost(postId: string): boolean {
  if (viewedPostsMemory.has(postId)) return true;
  return false;
}

function markViewedPost(postId: string) {
  viewedPostsMemory.add(postId);
  saveViewedPostsToSession(viewedPostsMemory);
}

/**
 * Hook para trackear tiempo que el usuario pasa viendo cada post
 * Similar al sistema de TikTok para medir engagement real
 */
export function useViewportTracking(
  postId: string,
  options: ViewportTrackingOptions = {}
) {
  const { threshold = 0.5, minDuration = 1000 } = options;

  const elementRef = useRef<HTMLDivElement>(null);
  const viewTimeoutRef = useRef<number | null>(null);
  const isVisibleRef = useRef(false);
  const hasCountedRef = useRef(false);

  const trackView = useCallback(async () => {
    if (hasCountedRef.current) return;
    if (hasViewedPost(postId)) {
      hasCountedRef.current = true;
      return;
    }

    try {
      await personalizedFeedAlgorithm.trackInteraction(postId, 'view');
      markViewedPost(postId);
      hasCountedRef.current = true;
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  }, [postId]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (hasViewedPost(postId)) {
      hasCountedRef.current = true;
    }

    const clearTimer = () => {
      if (viewTimeoutRef.current) {
        window.clearTimeout(viewTimeoutRef.current);
        viewTimeoutRef.current = null;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          // Post became visible
          if (!isVisibleRef.current) {
            isVisibleRef.current = true;

            clearTimer();
            if (!hasCountedRef.current) {
              viewTimeoutRef.current = window.setTimeout(() => {
                if (isVisibleRef.current && !hasCountedRef.current) {
                  void trackView();
                }
              }, minDuration);
            }
          }
        } else {
          // Post became hidden
          if (isVisibleRef.current) {
            isVisibleRef.current = false;
            clearTimer();
          }
        }
      },
      { 
        threshold,
        rootMargin: '-10px' // Small margin to ensure post is truly visible
      }
    );

    observer.observe(element);

    // Cleanup function - track final view time
    return () => {
      isVisibleRef.current = false;
      clearTimer();
      observer.disconnect();
    };
  }, [threshold, trackView, postId, minDuration]);

  // Track view when component unmounts or postId changes
  useEffect(() => {
    return () => {
      if (viewTimeoutRef.current) {
        window.clearTimeout(viewTimeoutRef.current);
        viewTimeoutRef.current = null;
      }
    };
  }, [postId, trackView]);

  return {
    ref: elementRef,
    currentViewTime: 0
  };
}

/**
 * Hook más simple para trackear interacciones básicas
 */
export function usePostInteractionTracking(postId: string) {
  const trackLike = useCallback(async () => {
    await personalizedFeedAlgorithm.trackInteraction(postId, 'like');
  }, [postId]);

  const trackComment = useCallback(async () => {
    await personalizedFeedAlgorithm.trackInteraction(postId, 'comment');
  }, [postId]);

  const trackShare = useCallback(async () => {
    await personalizedFeedAlgorithm.trackInteraction(postId, 'share');
  }, [postId]);

  return {
    trackLike,
    trackComment,
    trackShare
  };
}

/**
 * Hook para medir tiempo de sesión total
 */
export function useSessionTracking() {
  const sessionStartRef = useRef<number>(Date.now());
  const lastActiveRef = useRef<number>(Date.now());

  const updateActivity = useCallback(() => {
    lastActiveRef.current = Date.now();
  }, []);

  useEffect(() => {
    // Track user activity (scroll, click, etc.)
    const events = ['scroll', 'click', 'touchstart', 'keydown'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);

  const getSessionDuration = useCallback(() => {
    return Date.now() - sessionStartRef.current;
  }, []);

  const getTimeSinceLastActivity = useCallback(() => {
    return Date.now() - lastActiveRef.current;
  }, []);

  return {
    getSessionDuration,
    getTimeSinceLastActivity,
    updateActivity
  };
}