import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface SupabaseCache {
  get<T>(key: string): T | null;
  set<T>(key: string, data: T, ttl?: number): void;
  clear(key?: string): void;
  isExpired(key: string): boolean;
  cleanup(): void;
}

// Default TTL values (in milliseconds)
const CACHE_TTL = {
  POSTS: 5 * 60 * 1000, // 5 minutes
  PROFILE: 10 * 60 * 1000, // 10 minutes
  COMMENTS: 2 * 60 * 1000, // 2 minutes
  DEFAULT: 5 * 60 * 1000, // 5 minutes
};

export function useSupabaseCache(): SupabaseCache {
  const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());

  const isExpired = useCallback((key: string): boolean => {
    const entry = cacheRef.current.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > entry.ttl;
  }, []);

  const get = useCallback(<T>(key: string): T | null => {
    const entry = cacheRef.current.get(key);
    if (!entry || isExpired(key)) {
      cacheRef.current.delete(key);
      return null;
    }
    return entry.data as T;
  }, [isExpired]);

  const set = useCallback(<T>(key: string, data: T, ttl: number = CACHE_TTL.DEFAULT): void => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }, []);

  const clear = useCallback((key?: string): void => {
    if (key) {
      cacheRef.current.delete(key);
    } else {
      cacheRef.current.clear();
    }
  }, []);

  const cleanup = useCallback((): void => {
    const now = Date.now();
    for (const [key, entry] of cacheRef.current.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        cacheRef.current.delete(key);
      }
    }
  }, []);

  // Auto cleanup expired entries every minute
  useEffect(() => {
    const interval = setInterval(cleanup, 60 * 1000);
    return () => clearInterval(interval);
  }, [cleanup]);

  return {
    get,
    set,
    clear,
    isExpired,
    cleanup
  };
}

// Optimized Supabase query wrapper with caching
export function useSupabaseQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: number = CACHE_TTL.DEFAULT,
  dependencies: any[] = []
) {
  const cache = useSupabaseCache();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = useCallback(async () => {
    // Check cache first
    const cachedData = cache.get<T>(key);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await queryFn();
      
      // Cache the result
      cache.set(key, result, ttl);
      setData(result);
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error(`Supabase query error for ${key}:`, err);
      setError(errorMessage);
      setLoading(false);
    }
  }, [key, queryFn, ttl, cache]);

  useEffect(() => {
    executeQuery();
  }, dependencies);

  return {
    data,
    loading,
    error,
    refetch: executeQuery
  };
}

// Optimized posts query with pagination and caching
export function useSupabasePosts(page = 1, limit = 10) {
  return useSupabaseQuery(
    `posts_page_${page}_limit_${limit}`,
    async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:profiles!inner(
            id,
            username,
            avatar_url,
            career,
            institution
          )
        `)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, limit);

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
    CACHE_TTL.POSTS,
    [page, limit]
  );
}
