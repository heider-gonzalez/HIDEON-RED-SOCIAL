
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ChannelInfo {
  channel: RealtimeChannel;
  subscriptionPromise: Promise<string> | null;
  refCount: number;
  isSubscribed: boolean;
}

export function useSubscriptionManager() {
  const channelsRef = useRef<Map<string, ChannelInfo>>(new Map());
  const activeSubscriptions = useRef<Set<string>>(new Set());

  const getOrCreateChannel = useCallback((channelName: string, setupCallback: (channel: RealtimeChannel) => void) => {
    // Check if channel already exists and is working
    const existingChannelInfo = channelsRef.current.get(channelName);
    
    if (existingChannelInfo && existingChannelInfo.isSubscribed) {
      // Increment reference count
      existingChannelInfo.refCount++;
      // Silently reuse channel
      return existingChannelInfo.subscriptionPromise;
    }

    // If channel exists but failed, remove it first
    if (existingChannelInfo && !existingChannelInfo.isSubscribed) {
      try {
        supabase.removeChannel(existingChannelInfo.channel);
      } catch (error) {
        // Silent cleanup
      }
      channelsRef.current.delete(channelName);
      activeSubscriptions.current.delete(channelName);
    }

    // Create new channel with unique identifier to avoid duplicates
    const uniqueChannelName = `${channelName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newChannel = supabase.channel(uniqueChannelName);
    
    // Set up the channel with the provided callback
    setupCallback(newChannel);
    
    // Create subscription promise with better error handling - increased timeout for better reliability
    const subscriptionPromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const channelInfo = channelsRef.current.get(channelName);
        if (channelInfo) {
          channelInfo.isSubscribed = false;
        }
        reject(new Error(`Subscription timeout for ${channelName}`));
      }, 15000);

      newChannel.subscribe((status) => {        
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          activeSubscriptions.current.add(channelName);
          const channelInfo = channelsRef.current.get(channelName);
          if (channelInfo) {
            channelInfo.isSubscribed = true;
          }
          resolve(status);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          const channelInfo = channelsRef.current.get(channelName);
          if (channelInfo) {
            channelInfo.isSubscribed = false;
          }
          resolve('FAILED');
        } else if (status === 'CLOSED') {
          clearTimeout(timeout);
          activeSubscriptions.current.delete(channelName);
          const channelInfo = channelsRef.current.get(channelName);
          if (channelInfo) {
            channelInfo.isSubscribed = false;
          }
        }
      });
    });

    // Store channel info
    const channelInfo: ChannelInfo = {
      channel: newChannel,
      subscriptionPromise,
      refCount: 1,
      isSubscribed: false
    };
    
    channelsRef.current.set(channelName, channelInfo);
    
    return subscriptionPromise;
  }, []);

  const removeChannel = useCallback((channelName: string) => {
    const channelInfo = channelsRef.current.get(channelName);
    
    if (channelInfo) {
      // Decrement reference count
      channelInfo.refCount--;
      // Silent reference counting
      
      // Only remove if no other components are using this channel
      if (channelInfo.refCount <= 0) {
        try {
          supabase.removeChannel(channelInfo.channel);
        } catch (error) {
          // Silent cleanup
        }
        channelsRef.current.delete(channelName);
        activeSubscriptions.current.delete(channelName);
      }
    }
  }, []);

  const removeAllChannels = useCallback(() => {
    channelsRef.current.forEach((channelInfo) => {
      try {
        supabase.removeChannel(channelInfo.channel);
      } catch (error) {
        // Silent cleanup
      }
    });
    channelsRef.current.clear();
    activeSubscriptions.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      removeAllChannels();
    };
  }, [removeAllChannels]);

  return {
    getOrCreateChannel,
    removeChannel,
    removeAllChannels
  };
}
