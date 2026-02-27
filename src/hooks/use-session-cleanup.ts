import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRealtimeManager } from './use-realtime-manager';
import { notificationCache, messageCache, profileCache, cacheUtils } from './use-super-cache';

export const useSessionCleanup = () => {
  const { user } = useAuth();
  const { cleanup: cleanupRealtime } = useRealtimeManager();
  const isCleaningUp = useRef(false);

  // Comprehensive cleanup function with debounce
  const cleanupSession = useCallback(() => {
    if (isCleaningUp.current) {
      console.log('🔄 Cleanup already in progress, skipping...');
      return;
    }

    isCleaningUp.current = true;
    console.log('🧹 Starting comprehensive session cleanup...');
    
    try {
      // 1. Cleanup realtime subscriptions
      cleanupRealtime();
      
      // 2. Clear all caches
      notificationCache.clear();
      console.log('✅ Notification cache cleared');
      
      messageCache.clear();
      console.log('✅ Message cache cleared');
      
      profileCache.clear();
      console.log('✅ Profile cache cleared');
      
      // 3. Clear localStorage caches (more targeted)
      if (typeof window !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.includes('notifications-cache') ||
            key.includes('messages-cache') ||
            key.includes('profiles-cache') ||
            key.includes('super-cache') ||
            key.includes('conversations-instant') ||
            key.includes('notifications-instant')
          )) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        console.log(`✅ Cleared ${keysToRemove.length} localStorage cache entries`);
      }
      
      // 4. Clear any pending timeouts/intervals (safer approach)
      const originalSetTimeout = window.setTimeout;
      const originalClearTimeout = window.clearTimeout;
      const originalSetInterval = window.setInterval;
      const originalClearInterval = window.clearInterval;
      
      // Restore original methods after cleanup
      window.setTimeout = originalSetTimeout;
      window.clearTimeout = originalClearTimeout;
      window.setInterval = originalSetInterval;
      window.clearInterval = originalClearInterval;
      
      console.log('✅ Timer methods restored');
      
    } catch (error) {
      console.warn('⚠️ Error during cleanup:', error);
    } finally {
      isCleaningUp.current = false;
    }
    
    console.log('✅ Session cleanup completed');
  }, [cleanupRealtime]);

  // Listen for storage events from other tabs (with protection)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'session-cleanup' && !isCleaningUp.current) {
        console.log('🔄 Received cleanup signal from another tab');
        // Use setTimeout to break potential recursion
        setTimeout(() => {
          cleanupSession();
        }, 100);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [cleanupSession, isCleaningUp]);

  // Auto-cleanup on user logout
  useEffect(() => {
    if (!user) {
      console.log('👤 User logged out, triggering cleanup');
      cleanupSession();
    }
  }, [user, cleanupSession]);

  // Cleanup on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!user) {
        console.log('📄 Page unloading without user, triggering cleanup');
        cleanupSession();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !user) {
        console.log('👁️ Page hidden without user, triggering cleanup');
        cleanupSession();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [user, cleanupSession]);

  // Manual cleanup trigger
  const triggerCleanup = useCallback(() => {
    console.log('🔧 Manual cleanup triggered');
    cleanupSession();
  }, [cleanupSession]);

  return {
    triggerCleanup,
    isCleaned: !user
  };
};
