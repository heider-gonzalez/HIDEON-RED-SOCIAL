import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CleanupOptions {
  processedOlderThan?: number; // hours
  failedOlderThan?: number; // hours
  pendingOlderThan?: number; // hours (for stuck pending notifications)
  dryRun?: boolean;
}

export function useNotificationCleanup() {
  const cleanupNotifications = useCallback(async (options: CleanupOptions = {}) => {
    try {
      console.log('🧹 Starting notification cleanup...', options);

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/cleanup-notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🧹 Cleanup result:', result);

      return result;
    } catch (error) {
      console.error('🧹 Error during notification cleanup:', error);
      throw error;
    }
  }, []);

  // Manual cleanup with default settings
  const cleanupOldNotifications = useCallback(async () => {
    return cleanupNotifications({
      processedOlderThan: 24, // Clean processed notifications older than 24 hours
      failedOlderThan: 168, // Clean failed notifications older than 7 days
      pendingOlderThan: 24, // Clean stuck pending notifications older than 24 hours
      dryRun: false
    });
  }, [cleanupNotifications]);

  // Dry run to see what would be cleaned
  const previewCleanup = useCallback(async () => {
    return cleanupNotifications({
      processedOlderThan: 24,
      failedOlderThan: 168,
      pendingOlderThan: 24,
      dryRun: true
    });
  }, [cleanupNotifications]);

  return {
    cleanupNotifications,
    cleanupOldNotifications,
    previewCleanup
  };
}
