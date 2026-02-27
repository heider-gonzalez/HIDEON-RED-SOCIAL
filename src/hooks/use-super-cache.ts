import { useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface SuperCacheOptions {
  ttl?: number; // Default 5 minutes
  maxSize?: number; // Max items in cache
  persistToStorage?: boolean; // Persist to localStorage
  storageKey?: string;
}

class SuperCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize: number;
  private persistToStorage: boolean;
  private storageKey: string;

  constructor(options: SuperCacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.persistToStorage = options.persistToStorage || false;
    this.storageKey = options.storageKey || 'super-cache';
    
    // Load from localStorage if enabled
    if (this.persistToStorage && typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // Remove oldest item if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    this.cache.set(key, item);

    // Persist to localStorage if enabled
    if (this.persistToStorage) {
      this.saveToStorage();
    }
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item is expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check if item is expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted && this.persistToStorage) {
      this.saveToStorage();
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    if (this.persistToStorage) {
      localStorage.removeItem(this.storageKey);
    }
  }

  // Preload multiple items in parallel
  async preload<T>(items: Array<{ key: string; fetcher: () => Promise<T>; ttl?: number }>): Promise<void> {
    const promises = items.map(async ({ key, fetcher, ttl }) => {
      if (!this.has(key)) {
        try {
          const data = await fetcher();
          this.set(key, data, ttl);
        } catch (error) {
          console.warn(`Failed to preload ${key}:`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  // Get cache stats
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    this.cache.forEach(item => {
      if (now - item.timestamp > item.ttl) {
        expired++;
      } else {
        valid++;
      }
    });

    return {
      total: this.cache.size,
      valid,
      expired,
      maxSize: this.maxSize
    };
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const serialized = JSON.stringify(Array.from(this.cache.entries()));
      localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const serialized = localStorage.getItem(this.storageKey);
      if (serialized) {
        const entries = JSON.parse(serialized) as Array<[string, CacheItem<any>]>;
        this.cache = new Map(entries);
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }
}

// Global cache instances
const messageCache = new SuperCache({
  ttl: 2 * 60 * 1000, // 2 minutes for messages
  maxSize: 500,
  persistToStorage: true,
  storageKey: 'messages-cache'
});

const notificationCache = new SuperCache({
  ttl: 1 * 60 * 1000, // 1 minute for notifications
  maxSize: 200,
  persistToStorage: true,
  storageKey: 'notifications-cache'
});

const profileCache = new SuperCache({
  ttl: 10 * 60 * 1000, // 10 minutes for profiles
  maxSize: 1000,
  persistToStorage: true,
  storageKey: 'profiles-cache'
});

// Hook for using super cache
export const useSuperCache = (options: SuperCacheOptions = {}) => {
  const queryClient = useQueryClient();
  const cacheRef = useRef(new SuperCache(options));

  const get = useCallback(<T>(key: string): T | null => {
    return cacheRef.current.get<T>(key);
  }, []);

  const set = useCallback(<T>(key: string, data: T, ttl?: number): void => {
    cacheRef.current.set(key, data, ttl);
    
    // Also update React Query cache if available
    queryClient.setQueryData([key], data);
  }, [queryClient]);

  const preload = useCallback(async <T>(items: Array<{ key: string; fetcher: () => Promise<T>; ttl?: number }>) => {
    await cacheRef.current.preload(items);
  }, []);

  const invalidate = useCallback((key: string) => {
    cacheRef.current.delete(key);
    queryClient.invalidateQueries({ queryKey: [key] });
  }, [queryClient]);

  const clear = useCallback(() => {
    cacheRef.current.clear();
    queryClient.clear();
  }, [queryClient]);

  const getStats = useCallback(() => {
    return cacheRef.current.getStats();
  }, []);

  return {
    get,
    set,
    preload,
    invalidate,
    clear,
    getStats
  };
};

// Export cache instances for direct use
export { messageCache, notificationCache, profileCache };

// Utility functions for common cache operations
export const cacheUtils = {
  // Cache key generators
  messageKey: (channelId: string) => `messages:${channelId}`,
  conversationKey: (userId: string) => `conversations:${userId}`,
  notificationKey: (userId: string) => `notifications:${userId}`,
  profileKey: (userId: string) => `profile:${userId}`,
  postKey: (postId: string) => `post:${postId}`,
  
  // Batch operations
  invalidateUserCache: (userId: string) => {
    messageCache.delete(cacheUtils.conversationKey(userId));
    notificationCache.delete(cacheUtils.notificationKey(userId));
  },
  
  // Preload strategies
  preloadUserData: async (userId: string, fetchers: {
    conversations: () => Promise<any>;
    notifications: () => Promise<any>;
    profile: () => Promise<any>;
  }) => {
    await Promise.allSettled([
      messageCache.preload([{
        key: cacheUtils.conversationKey(userId),
        fetcher: fetchers.conversations,
        ttl: 2 * 60 * 1000
      }]),
      notificationCache.preload([{
        key: cacheUtils.notificationKey(userId),
        fetcher: fetchers.notifications,
        ttl: 1 * 60 * 1000
      }]),
      profileCache.preload([{
        key: cacheUtils.profileKey(userId),
        fetcher: fetchers.profile,
        ttl: 10 * 60 * 1000
      }])
    ]);
  }
};
