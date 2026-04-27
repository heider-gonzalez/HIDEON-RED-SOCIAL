import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Global state to prevent multiple interaction subscriptions
let interactionSubscriptionsActive = false;

let globalInteractionsFailureCount = 0;
let globalInteractionsBlockedUntilMs = 0;
let globalInteractionsNextDelayMs = 2000;

export function useRealtimeInteractions(userId?: string) {
  const queryClient = useQueryClient();
  const channelsRef = useRef<any[]>([]);
  const isSubscribedRef = useRef(false);
  const throttleTimeoutRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Prevent multiple subscriptions and ensure we have a userId
    if (!userId || interactionSubscriptionsActive || isSubscribedRef.current) {
      return;
    }

    const now = Date.now();
    if (globalInteractionsBlockedUntilMs > now) {
      return;
    }

    interactionSubscriptionsActive = true;
    isSubscribedRef.current = true;

    // Clean up existing subscriptions
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    const scheduleRetry = () => {
      globalInteractionsFailureCount++;
      if (globalInteractionsFailureCount < 3) {
        const delay = Math.min(30_000, 1500 * Math.pow(2, globalInteractionsFailureCount - 1));
        retryTimeoutRef.current = setTimeout(() => {
          interactionSubscriptionsActive = false;
          isSubscribedRef.current = false;
        }, delay);
        return;
      }

      const delay = Math.min(5 * 60_000, Math.max(2000, globalInteractionsNextDelayMs));
      globalInteractionsBlockedUntilMs = Date.now() + delay;
      globalInteractionsNextDelayMs = Math.min(5 * 60_000, delay * 2);
    };

    try {
      // Create reactions channel with throttling
      const reactionsChannel = supabase
        .channel(`reactions_interactions_${userId.slice(-8)}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reactions'
          },
          (payload) => {
            if (import.meta.env.DEV) {
              console.debug(' Reaction change detected:', payload.new);
            }

            // Throttle updates to prevent excessive invalidations - increased for better performance
            clearTimeout(throttleTimeoutRef.current);
            throttleTimeoutRef.current = setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
            }, 5000); // 5 second throttle for better performance
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            scheduleRetry();
          }
          if (status === 'SUBSCRIBED') {
            globalInteractionsFailureCount = 0;
            globalInteractionsBlockedUntilMs = 0;
            globalInteractionsNextDelayMs = 2000;
          }
        });

      // Create comments channel with throttling
      const commentsChannel = supabase
        .channel(`comments_interactions_${userId.slice(-8)}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'comments'
          },
          (payload) => {
            if (import.meta.env.DEV) {
              console.debug(' Comment change detected:', payload.new);
            }

            if (payload.new && typeof payload.new === 'object' && 'post_id' in payload.new) {
              // Throttle updates and target specific post comments - increased for better performance
              clearTimeout(throttleTimeoutRef.current);
              throttleTimeoutRef.current = setTimeout(() => {
                queryClient.invalidateQueries({ 
                  queryKey: ["comments", (payload.new as any).post_id] 
                });
                queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
              }, 5000); // 5 second throttle for better performance
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            scheduleRetry();
          }
          if (status === 'SUBSCRIBED') {
            globalInteractionsFailureCount = 0;
            globalInteractionsBlockedUntilMs = 0;
            globalInteractionsNextDelayMs = 2000;
          }
        });

      channelsRef.current = [reactionsChannel, commentsChannel];

    } catch (error) {
      scheduleRetry();
    }

    // Cleanup on unmount
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      channelsRef.current.forEach(channel => {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('Error removing channel:', error);
        }
      });
      channelsRef.current = [];
      interactionSubscriptionsActive = false;
      isSubscribedRef.current = false;
    };
  }, [userId, queryClient]);

  return {
    // This hook manages interaction subscriptions in the background
  };
}