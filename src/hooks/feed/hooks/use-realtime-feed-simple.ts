import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Global state to prevent multiple subscriptions
let globalSubscriptionsActive = false;
let subscriptionCount = 0;

export function useRealtimeFeedSimple(userId?: string) {
  const queryClient = useQueryClient();
  const isSubscribedRef = useRef(false);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {

    // Prevent multiple subscriptions from running simultaneously
    if (!userId || globalSubscriptionsActive || isSubscribedRef.current) {
      return;
    }

    globalSubscriptionsActive = true;
    isSubscribedRef.current = true;
    subscriptionCount++;

    let postsChannel: any = null;
    let reactionsChannel: any = null;
    let commentsChannel: any = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 2; // Reduced from 3 to 2
    let cancelled = false;

    const safeRemoveChannel = (channel: any) => {
      if (!channel) return;
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn('Error removing realtime channel:', e);
      }
    };

    const subscribeChannels = async () => {
      try {
        if (cancelled) return;
        // Clean up existing channels first
        safeRemoveChannel(postsChannel);
        safeRemoveChannel(reactionsChannel);
        safeRemoveChannel(commentsChannel);

        postsChannel = null;
        reactionsChannel = null;
        commentsChannel = null;

        // Stable names per user to avoid multiple instances and enable idempotent cleanup
        const channelSuffix = `_${userId.slice(-8)}`;

        // Posts channel - only listen to INSERT events to reduce load
        postsChannel = supabase
          .channel(`posts_feed${channelSuffix}`)

          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'posts'
            },
            (payload) => {
              // Debounced invalidation
              if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
              debounceTimeoutRef.current = setTimeout(() => {
                if (cancelled) return;
                queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
              }, 1000);
            }
          )

          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'posts'
            },
            (payload) => {
              if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
              debounceTimeoutRef.current = setTimeout(() => {
                if (cancelled) return;
                queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
              }, 500);
            }
          );

        // Reactions channel - throttled updates
        reactionsChannel = supabase
          .channel(`reactions_feed${channelSuffix}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'reactions'
            },
            (payload) => {
              const postId = (payload.new as any)?.post_id;
              // Throttled invalidation - only update every 2 seconds max
              if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
              debounceTimeoutRef.current = setTimeout(() => {
                if (cancelled) return;
                if (postId) {
                  queryClient.invalidateQueries({ queryKey: ["posts", postId] });
                } else {
                  queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
                }
              }, 2000);
            }
          );

        // Comments channel - throttled updates
        commentsChannel = supabase
          .channel(`comments_feed${channelSuffix}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'comments'
            },
            (payload) => {
              const postId = (payload.new as any)?.post_id;
              // Throttled invalidation - only update every 2 seconds max
              if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
              debounceTimeoutRef.current = setTimeout(() => {
                if (cancelled) return;
                if (postId) {
                  queryClient.invalidateQueries({ queryKey: ["comments", postId] });
                  queryClient.invalidateQueries({ queryKey: ["posts", postId] });
                } else {
                  queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
                }
              }, 2000);
            }
          );

        // Subscribe with error handling and longer timeouts
        const subscribeWithRetry = (channel: any, name: string): Promise<string> => {
          return new Promise((resolve) => {
            let resolved = false;

            if (!channel || typeof channel.subscribe !== "function") {
              resolved = true;
              resolve('FAILED');
              return;
            }

            channel.subscribe((status: string) => {
              if (resolved) return;

              if (status === 'SUBSCRIBED') {
                resolved = true;
                resolve('SUBSCRIBED');
              } else if (status === 'TIMED_OUT') {
                resolved = true;
                resolve('TIMEOUT');
              } else if (status === 'CHANNEL_ERROR') {
                console.error(` ${name} channel subscription failed:`, status);
                resolved = true;
                resolve('FAILED');
              }
            });

            // Longer timeout - 15 seconds
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                resolve('TIMEOUT');
              }
            }, 15000);
          });
        };

        // Subscribe to channels with staggered timing to reduce load
        const postsStatus = await subscribeWithRetry(postsChannel, 'Posts');
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay

        const reactionsStatus = await subscribeWithRetry(reactionsChannel, 'Reactions');
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay

        const commentsStatus = await subscribeWithRetry(commentsChannel, 'Comments');

        const successfulSubscriptions = [postsStatus, reactionsStatus, commentsStatus]
          .filter(status => status === 'SUBSCRIBED').length;

        if (successfulSubscriptions >= 1) { // Accept if at least 1 subscription works
          reconnectAttempts = 0; // Reset on successful connection
        } else if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (cancelled) return;
            subscribeChannels();
          }, 3000 * reconnectAttempts);
        } else {
          console.error(' Max reconnection attempts reached - using fallback polling');
          // Fallback to periodic cache invalidation
          if (!fallbackIntervalRef.current) {
            fallbackIntervalRef.current = setInterval(() => {
              if (cancelled) return;
              queryClient.invalidateQueries({ queryKey: ["posts"] });
            }, 60000); // Every minute as fallback
          }
        }

      } catch (error) {
        console.error(' Critical error setting up realtime subscriptions:', error);

        // Fallback polling on critical error
        if (!fallbackIntervalRef.current) {
          fallbackIntervalRef.current = setInterval(() => {
            if (cancelled) return;
            queryClient.invalidateQueries({ queryKey: ["posts"] });
          }, 120000); // Every 2 minutes on error
        }
      }
    };

    subscribeChannels();

    // Cleanup function
    return () => {
      cancelled = true;

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }

      safeRemoveChannel(postsChannel);
      safeRemoveChannel(reactionsChannel);
      safeRemoveChannel(commentsChannel);

      postsChannel = null;
      reactionsChannel = null;
      commentsChannel = null;

      globalSubscriptionsActive = false;
      isSubscribedRef.current = false;
      subscriptionCount--;
    };
  }, [userId, queryClient]);

  return {
    // This hook manages subscriptions in the background
  };
}