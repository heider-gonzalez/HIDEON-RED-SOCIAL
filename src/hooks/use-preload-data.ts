import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSuperCache, cacheUtils } from './use-super-cache';
import { fetchConversations } from '@/lib/api/messages/queries';
import { fetchNotifications } from '@/lib/notifications/fetch-notifications';
import { supabase } from '@/integrations/supabase/client';

interface PreloadOptions {
  enabled?: boolean;
  priority?: 'high' | 'medium' | 'low';
  delay?: number;
}

interface CriticalData {
  conversations?: any[];
  notifications?: any[];
  profile?: any;
  recentPosts?: any[];
  userGroups?: any[];
}

class PreloadManager {
  private static instance: PreloadManager;
  private preloadedData = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private preloadQueue: Array<{ key: string; fetcher: () => Promise<any>; priority: number }> = [];
  private isProcessing = false;

  static getInstance(): PreloadManager {
    if (!PreloadManager.instance) {
      PreloadManager.instance = new PreloadManager();
    }
    return PreloadManager.instance;
  }

  addToQueue(key: string, fetcher: () => Promise<any>, priority: number = 1) {
    this.preloadQueue.push({ key, fetcher, priority });
    this.preloadQueue.sort((a, b) => b.priority - a.priority);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.preloadQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.preloadQueue.length > 0) {
      const item = this.preloadQueue.shift()!;
      
      try {
        const data = await item.fetcher();
        this.preloadedData.set(item.key, {
          data,
          timestamp: Date.now(),
          ttl: 5 * 60 * 1000 // 5 minutes
        });
      } catch (error) {
        console.warn(`Failed to preload ${item.key}:`, error);
      }
    }
    
    this.isProcessing = false;
  }

  get(key: string): any | null {
    const item = this.preloadedData.get(key);
    if (!item) return null;
    
    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.preloadedData.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear() {
    this.preloadedData.clear();
    this.preloadQueue = [];
  }
}

export const usePreloadData = (userId: string | null, options: PreloadOptions = {}) => {
  const { enabled = true, priority = 'medium', delay = 100 } = options;
  const { preload, set } = useSuperCache();
  const queryClient = useQueryClient();
  const preloadManager = PreloadManager.getInstance();
  const hasPreloaded = useRef(false);

  const priorityMap = {
    high: 3,
    medium: 2,
    low: 1
  };

  const preloadCriticalData = useCallback(async () => {
    if (!userId || hasPreloaded.current) return;

    // High priority data (instant access)
    const highPriorityTasks = [
      {
        key: cacheUtils.conversationKey(userId),
        fetcher: () => fetchConversations(userId),
        priority: priorityMap.high
      },
      {
        key: cacheUtils.notificationKey(userId),
        fetcher: async () => {
          const data = await fetchNotifications();
          return data?.filter(n => !['friend_request', 'friend_accepted'].includes(n.type)) || [];
        },
        priority: priorityMap.high
      },
      {
        key: cacheUtils.profileKey(userId),
        fetcher: async () => {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          return data;
        },
        priority: priorityMap.high
      }
    ];

    // Medium priority data (important but not critical)
    const mediumPriorityTasks = [
      {
        key: `user-groups:${userId}`,
        fetcher: async () => {
          const { data } = await supabase
            .from('group_members')
            .select(`
              groups!inner(
                group_id,
                group_name,
                description
              )
            `)
            .eq('user_id', userId)
            .eq('status', 'active');
          return data?.map((item: any) => item.groups) || [];
        },
        priority: priorityMap.medium
      },
      {
        key: `recent-posts:${userId}`,
        fetcher: async () => {
          const { data } = await supabase
            .from('posts')
            .select(`
              id,
              content,
              created_at,
              media_url,
              type,
              profiles!inner(
                username,
                avatar_url
              )
            `)
            .order('created_at', { ascending: false })
            .limit(20);
          return data || [];
        },
        priority: priorityMap.medium
      }
    ];

    // Add to preload queue
    [...highPriorityTasks, ...mediumPriorityTasks].forEach(task => {
      preloadManager.addToQueue(task.key, task.fetcher, task.priority);
    });

    // Also use our cache system for redundancy
    await Promise.all([
      preload([{
        key: cacheUtils.conversationKey(userId),
        fetcher: () => fetchConversations(userId),
        ttl: 2 * 60 * 1000 // 2 minutes
      }]),
      preload([{
        key: cacheUtils.notificationKey(userId),
        fetcher: async () => {
          const data = await fetchNotifications();
          return data?.filter(n => !['friend_request', 'friend_accepted'].includes(n.type)) || [];
        },
        ttl: 1 * 60 * 1000 // 1 minute
      }]),
      preload([{
        key: cacheUtils.profileKey(userId),
        fetcher: async () => {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          return data;
        },
        ttl: 10 * 60 * 1000 // 10 minutes
      }])
    ]);

    hasPreloaded.current = true;
  }, [userId, preload, priorityMap]);

  useEffect(() => {
    if (!enabled || !userId) return;

    const timer = setTimeout(() => {
      preloadCriticalData();
    }, delay);

    return () => clearTimeout(timer);
  }, [userId, enabled, delay, preloadCriticalData]);

  // Method to get preloaded data instantly
  const getPreloadedData = useCallback((): CriticalData => {
    if (!userId) return {};

    return {
      conversations: preloadManager.get(cacheUtils.conversationKey(userId)),
      notifications: preloadManager.get(cacheUtils.notificationKey(userId)),
      profile: preloadManager.get(cacheUtils.profileKey(userId)),
      recentPosts: preloadManager.get(`recent-posts:${userId}`),
      userGroups: preloadManager.get(`user-groups:${userId}`)
    };
  }, [userId]);

  // Method to preload specific data on demand
  const preloadOnDemand = useCallback(async (keys: string[]) => {
    const fetchers: Record<string, () => Promise<any>> = {
      [`conversations:${userId}`]: () => fetchConversations(userId),
      [`notifications:${userId}`]: async () => {
        const data = await fetchNotifications();
        return data?.filter(n => !['friend_request', 'friend_accepted'].includes(n.type)) || [];
      },
      [`profile:${userId}`]: async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        return data;
      }
    };

    const tasks = keys
      .map(key => {
        const fetcher = fetchers[key];
        return fetcher ? { key, fetcher } : null;
      })
      .filter(Boolean) as Array<{ key: string; fetcher: () => Promise<any> }>;

    await preload(tasks.map(task => ({
      key: task.key,
      fetcher: task.fetcher,
      ttl: 2 * 60 * 1000
    })));
  }, [userId, preload]);

  return {
    getPreloadedData,
    preloadOnDemand,
    isPreloaded: hasPreloaded.current
  };
};

// Hook for instant navigation preloading
export const useNavigationPreload = () => {
  const { preload } = useSuperCache();
  const queryClient = useQueryClient();

  const preloadRoute = useCallback(async (route: string) => {
    const routeMap: Record<string, () => Promise<any>> = {
      '/messages': async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        return fetchConversations(user.id);
      },
      '/notifications': async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const data = await fetchNotifications();
        return data?.filter(n => !['friend_request', 'friend_accepted'].includes(n.type)) || [];
      },
      '/explore': async () => {
        const { data } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            created_at,
            media_url,
            type,
            profiles!inner(
              username,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false })
          .limit(20);
        return data || [];
      }
    };

    const fetcher = routeMap[route];
    if (!fetcher) return;

    try {
      await preload([{
        key: `route:${route}`,
        fetcher,
        ttl: 30 * 1000 // 30 seconds for route data
      }]);
    } catch (error) {
      console.warn(`Failed to preload route ${route}:`, error);
    }
  }, [preload]);

  return { preloadRoute };
};

// Global preload manager instance
export const preloadManager = PreloadManager.getInstance();
