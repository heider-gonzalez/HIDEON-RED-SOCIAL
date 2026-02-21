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

      // Build the Supabase URL dynamically
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wgbbaxvuuinubkgffpiq.supabase.co';
      const functionUrl = `${supabaseUrl}/functions/v1/cleanup-notifications`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('🧹 Cleanup result:', result);

      return result;
    } catch (error) {
      console.error('🧹 Error during notification cleanup:', error);

      // If it's a CORS or network error, provide helpful message
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('🧹 CORS/Network error - Edge Function may need redeployment or CORS headers update');
      }

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
