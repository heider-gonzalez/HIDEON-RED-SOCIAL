import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Global state to prevent multiple subscriptions
let globalSubscriptionsActive = false;
let subscriptionCount = 0;

export function useRealtimeFeedSimple(userId?: string) {
  const queryClient = useQueryClient();
  const isSubscribedRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const debug = import.meta.env.DEV;

  useEffect(() => {
    // Prevent multiple subscriptions from running simultaneously
    if (!userId || globalSubscriptionsActive || isSubscribedRef.current) {
      if (debug) console.log(' Skipping realtime setup - already active or no userId');
      return;
    }

    if (debug) console.log(' Setting up optimized realtime subscriptions...');
    globalSubscriptionsActive = true;
    isSubscribedRef.current = true;
    subscriptionCount++;

    let postsChannel: any;
    let reactionsChannel: any;
    let commentsChannel: any;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 2; // Reduced from 3 to 2

    const subscribeChannels = async () => {
      try {
        // Clean up existing channels first
        if (postsChannel) supabase.removeChannel(postsChannel);
        if (reactionsChannel) supabase.removeChannel(reactionsChannel);
        if (commentsChannel) supabase.removeChannel(commentsChannel);

        // Create channels with unique names to avoid conflicts
        const channelSuffix = `_${userId?.slice(-8)}_${Date.now()}`;
        
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
              if (debug) console.log(' New post detected:', payload.new?.id);
              // Debounced invalidation
              clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = setTimeout(() => {
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
              if (debug) console.log(' Post deleted:', payload.old?.id);
              clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = setTimeout(() => {
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
              if (debug) console.log(' Reaction change detected:', payload.new);
              const postId = (payload.new as any)?.post_id;
              // Throttled invalidation - only update every 2 seconds max
              clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = setTimeout(() => {
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
              if (debug) console.log(' Comment change detected:', payload.new);
              const postId = (payload.new as any)?.post_id;
              // Throttled invalidation - only update every 2 seconds max
              clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = setTimeout(() => {
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
            
            channel.subscribe((status: string) => {
              if (resolved) return;
              
              if (debug) console.log(` ${name} subscription status:`, status);
              
              if (status === 'SUBSCRIBED') {
                resolved = true;
                resolve('SUBSCRIBED');
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.error(` ${name} channel subscription failed:`, status);
                resolved = true;
                resolve('FAILED');
              }
            });
            
            // Longer timeout - 15 seconds
            setTimeout(() => {
              if (!resolved) {
                if (debug) console.warn(` ${name} subscription timeout after 15s`);
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

        if (debug) console.log(' Final subscription results:', { postsStatus, reactionsStatus, commentsStatus });
        
        const successfulSubscriptions = [postsStatus, reactionsStatus, commentsStatus]
          .filter(status => status === 'SUBSCRIBED').length;
        
        if (successfulSubscriptions >= 1) { // Accept if at least 1 subscription works
          if (debug) console.log(` ${successfulSubscriptions}/3 realtime subscriptions active`);
          reconnectAttempts = 0; // Reset on successful connection
        } else if (reconnectAttempts < maxReconnectAttempts) {
          console.warn(` All realtime subscriptions failed, retrying in ${3000 * (reconnectAttempts + 1)}ms...`);
          reconnectAttempts++;
          setTimeout(() => subscribeChannels(), 3000 * reconnectAttempts);
        } else {
          console.error(' Max reconnection attempts reached - using fallback polling');
          // Fallback to periodic cache invalidation
          const fallbackInterval = setInterval(() => {
            if (debug) console.log(' Fallback: Refreshing data...');
            queryClient.invalidateQueries({ queryKey: ["posts"] });
          }, 60000); // Every minute as fallback
          
          // Store interval for cleanup
          retryTimeoutRef.current = fallbackInterval as any;
        }

      } catch (error) {
        console.error(' Critical error setting up realtime subscriptions:', error);
        
        // Fallback polling on critical error
        const errorFallbackInterval = setInterval(() => {
          queryClient.invalidateQueries({ queryKey: ["posts"] });
        }, 120000); // Every 2 minutes on error
        
        retryTimeoutRef.current = errorFallbackInterval as any;
      }
    };

    subscribeChannels();

    // Cleanup function
    return () => {
      if (debug) console.log(' Cleaning up realtime subscriptions...');
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        clearInterval(retryTimeoutRef.current as any);
      }
      
      if (postsChannel) supabase.removeChannel(postsChannel);
      if (reactionsChannel) supabase.removeChannel(reactionsChannel);
      if (commentsChannel) supabase.removeChannel(commentsChannel);
      
      globalSubscriptionsActive = false;
      isSubscribedRef.current = false;
      subscriptionCount--;
      
      if (debug) console.log(` Active subscription count: ${subscriptionCount}`);
    };
  }, [userId, queryClient]);

  return {
    // This hook manages subscriptions in the background
  };
}