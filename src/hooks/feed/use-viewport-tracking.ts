import { useEffect, useRef, useCallback } from 'react';
import { personalizedFeedAlgorithm } from '@/lib/feed/personalized-algorithm';

interface ViewportTrackingOptions {
  threshold?: number; // Porcentaje del post que debe estar visible (0-1)
  minDuration?: number; // Tiempo mínimo en milisegundos para contar como view
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
  const startTimeRef = useRef<number | null>(null);
  const isVisibleRef = useRef(false);
  const totalViewTimeRef = useRef(0);

  const trackView = useCallback(async () => {
    if (totalViewTimeRef.current >= minDuration) {
      try {
        await personalizedFeedAlgorithm.trackInteraction(
          postId,
          'view',
          Math.round(totalViewTimeRef.current / 1000) // Convert to seconds
        );
        totalViewTimeRef.current = 0;
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    }
  }, [postId, minDuration]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          // Post became visible
          if (!isVisibleRef.current) {
            startTimeRef.current = Date.now();
            isVisibleRef.current = true;
          }
        } else {
          // Post became hidden
          if (isVisibleRef.current && startTimeRef.current) {
            const viewTime = Date.now() - startTimeRef.current;
            totalViewTimeRef.current += viewTime;
            isVisibleRef.current = false;
            startTimeRef.current = null;
            trackView();
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
      if (isVisibleRef.current && startTimeRef.current) {
        const viewTime = Date.now() - startTimeRef.current;
        totalViewTimeRef.current += viewTime;
      }
      
      observer.unobserve(element);
      trackView();
    };
  }, [threshold, trackView]);

  // Track view when component unmounts or postId changes
  useEffect(() => {
    return () => {
      trackView();
    };
  }, [postId, trackView]);

  return {
    ref: elementRef,
    currentViewTime: totalViewTimeRef.current
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