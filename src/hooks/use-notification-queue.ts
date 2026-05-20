import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QueueProcessingOptions {
  interval?: number; // milliseconds between processing attempts
  batchSize?: number; // how many notifications to process at once
  maxRetries?: number; // max retries before backing off
  backoffMultiplier?: number; // exponential backoff multiplier
}

export function useNotificationQueue(options: QueueProcessingOptions = {}) {
  const {
    interval = 30000, // 30 seconds
    batchSize = 10,
    maxRetries = 3,
    backoffMultiplier = 2
  } = options;

  const intervalRef = useRef<NodeJS.Timeout>();
  const isProcessingRef = useRef(false);
  const retryCountRef = useRef(0);
  const currentIntervalRef = useRef(interval);
  const startedRef = useRef(false);

  // Process notification queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) {
      console.log('🔔 Queue processing already in progress, skipping...');
      return;
    }

    isProcessingRef.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('🔔 No authenticated user, skipping queue processing');
        return;
      }

      const accessToken = session.access_token;
      if (!accessToken) {
        console.log('🔔 No access token, skipping queue processing');
        return;
      }

      // Build the Supabase URL dynamically
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wgbbaxvuuinubkgffpiq.supabase.co';
      const functionUrl = `${supabaseUrl}/functions/v1/process-notifications`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          // IMPORTANT: Use the user's JWT so Edge Functions can authenticate the caller.
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          batchSize,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const result = await response.json();

      // Reset retry count on success
      retryCountRef.current = 0;
      currentIntervalRef.current = interval;

      // If we processed notifications, maybe process again sooner
      if (result.processed > 0) {
        // Process again in 5 seconds if there might be more
        setTimeout(() => processQueue(), 5000);
      }

    } catch (error) {
      console.error('🔔 Error processing notification queue:', error);
      retryCountRef.current++;

      if (retryCountRef.current < maxRetries) {
        // Exponential backoff
        currentIntervalRef.current = Math.min(
          currentIntervalRef.current * backoffMultiplier,
          300000 // Max 5 minutes
        );
        console.log(`🔔 Retrying in ${currentIntervalRef.current / 1000} seconds...`);
      } else {
        console.log('🔔 Max reconnection attempts reached, giving up');
        retryCountRef.current = 0;
        currentIntervalRef.current = interval;
      }
    } finally {
      // Always reset processing flag, even on early returns
      isProcessingRef.current = false;
    }
  }, [interval, batchSize, maxRetries, backoffMultiplier]);

  // Manual trigger for processing
  const triggerProcessing = useCallback(() => {
    processQueue();
  }, [processQueue]);

  // Start automatic processing when component mounts
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    console.log('🔔 Starting notification queue processor...');

    // Process immediately on mount
    processQueue();

    // Set up periodic processing
    intervalRef.current = setInterval(() => {
      processQueue();
    }, currentIntervalRef.current);

    return () => {
      console.log('🔔 Stopping notification queue processor...');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      startedRef.current = false;
    };
  }, [processQueue]);

  // Update interval when it changes due to backoff
  useEffect(() => {
    if (intervalRef.current && currentIntervalRef.current !== interval) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        processQueue();
      }, currentIntervalRef.current);
    }
  }, [currentIntervalRef.current, processQueue]);

  return {
    triggerProcessing,
    isProcessing: isProcessingRef.current,
    currentInterval: currentIntervalRef.current,
    retryCount: retryCountRef.current
  };
}
