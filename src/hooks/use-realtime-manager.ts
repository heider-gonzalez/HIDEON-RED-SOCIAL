import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

interface RealtimeSubscription {
  channel: any;
  unsubscribe: () => void;
  lastActivity: number;
}

class RealtimeManager {
  private static instance: RealtimeManager;
  private subscriptions = new Map<string, RealtimeSubscription>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isOnline = true;
  private userId: string | null = null;

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  // Initialize with user context
  initialize(userId: string) {
    this.userId = userId;
    this.startHeartbeat();
    this.cleanupInactiveSubscriptions();
  }

  // Cleanup when user logs out
  cleanup() {
    console.log('🧹 Cleaning up realtime subscriptions...');
    
    // Clear all subscriptions
    this.subscriptions.forEach((subscription, key) => {
      try {
        supabase.removeChannel(subscription.channel);
        console.log(`✅ Unsubscribed from: ${key}`);
      } catch (error) {
        console.warn(`⚠️ Error unsubscribing from ${key}:`, error);
      }
    });
    
    this.subscriptions.clear();
    
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Reset user
    this.userId = null;
    
    console.log('✅ Realtime cleanup completed');
  }

  // Subscribe to a channel with automatic cleanup
  subscribe(
    channelName: string,
    onMessage: (payload: any) => void,
    options: {
      event?: string;
      filter?: string;
      table?: string;
      schema?: string;
    } = {}
  ) {
    if (!this.userId) {
      console.warn('⚠️ Cannot subscribe without user context');
      return () => {};
    }

    const key = `${this.userId}:${channelName}`;
    
    // Remove existing subscription if any
    this.unsubscribe(channelName);

    const channel = supabase.channel(channelName);

    // Set up subscription based on options
    if (options.table && options.schema) {
      // Database changes subscription
      channel.on('postgres_changes' as any, {
        event: options.event || '*',
        schema: options.schema,
        table: options.table,
        filter: options.filter
      }, onMessage);
    } else {
      // Broadcast subscription
      channel.on('broadcast' as any, { event: options.event || '*' }, onMessage);
    }

    // Subscribe and store reference
    const subscription = channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to: ${channelName}`);
        this.subscriptions.set(key, {
          channel,
          unsubscribe: () => supabase.removeChannel(channel),
          lastActivity: Date.now()
        });
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Error subscribing to: ${channelName}`);
      }
    });

    // Return unsubscribe function
    return () => this.unsubscribe(channelName);
  }

  // Unsubscribe from a specific channel
  private unsubscribe(channelName: string) {
    const key = `${this.userId}:${channelName}`;
    const subscription = this.subscriptions.get(key);
    
    if (subscription) {
      try {
        supabase.removeChannel(subscription.channel);
        this.subscriptions.delete(key);
        console.log(`✅ Unsubscribed from: ${channelName}`);
      } catch (error) {
        console.warn(`⚠️ Error unsubscribing from ${channelName}:`, error);
      }
    }
  }

  // Start heartbeat to detect inactive subscriptions
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.cleanupInactiveSubscriptions();
      this.checkConnectionStatus();
    }, 30000); // Check every 30 seconds
  }

  // Cleanup subscriptions inactive for more than 5 minutes
  private cleanupInactiveSubscriptions() {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    this.subscriptions.forEach((subscription, key) => {
      if (now - subscription.lastActivity > inactiveThreshold) {
        console.log(`🧹 Cleaning up inactive subscription: ${key}`);
        try {
          supabase.removeChannel(subscription.channel);
          this.subscriptions.delete(key);
        } catch (error) {
          console.warn(`⚠️ Error cleaning up ${key}:`, error);
        }
      }
    });
  }

  // Check connection status
  private checkConnectionStatus() {
    const wasOnline = this.isOnline;
    this.isOnline = navigator.onLine;
    
    if (!this.isOnline && wasOnline) {
      console.log('📴 Connection lost, pausing subscriptions...');
      // Optionally pause subscriptions when offline
    } else if (this.isOnline && !wasOnline) {
      console.log('📶 Connection restored, resuming subscriptions...');
      // Optionally resume subscriptions when online
    }
  }

  // Get subscription status
  getSubscriptionStatus() {
    return {
      total: this.subscriptions.size,
      active: Array.from(this.subscriptions.entries()).map(([key, sub]) => ({
        key,
        lastActivity: sub.lastActivity,
        age: Date.now() - sub.lastActivity
      })),
      isOnline: this.isOnline,
      userId: this.userId
    };
  }
}

// Hook for using the realtime manager
export const useRealtimeManager = () => {
  const { user } = useAuth();
  const managerRef = useRef<RealtimeManager>();

  useEffect(() => {
    // Get or create manager instance
    const manager = RealtimeManager.getInstance();
    managerRef.current = manager;

    if (user?.id) {
      // Initialize with user context
      manager.initialize(user.id);
    } else {
      // Cleanup when user logs out
      manager.cleanup();
    }

    // Cleanup on page unload
    const handleBeforeUnload = () => {
      manager.cleanup();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup visibility change (user switching tabs)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ Page hidden, pausing some operations...');
      } else {
        console.log('👁️ Page visible, resuming operations...');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      manager.cleanup();
    };
  }, [user?.id]);

  // Subscribe method
  const subscribe = useCallback((
    channelName: string,
    onMessage: (payload: any) => void,
    options?: any
  ) => {
    const manager = managerRef.current;
    if (!manager) {
      console.warn('⚠️ Realtime manager not initialized');
      return () => {};
    }
    
    return manager.subscribe(channelName, onMessage, options);
  }, []);

  // Get status method
  const getStatus = useCallback(() => {
    const manager = managerRef.current;
    return manager ? manager.getSubscriptionStatus() : null;
  }, []);

  return {
    subscribe,
    getStatus,
    cleanup: () => {
      const manager = managerRef.current;
      if (manager) {
        manager.cleanup();
      }
    }
  };
};

// Export singleton instance
export const realtimeManager = RealtimeManager.getInstance();
