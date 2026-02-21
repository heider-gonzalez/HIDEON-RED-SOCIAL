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

  // Process notification queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) {
      console.log('🔔 Queue processing already in progress, skipping...');
      return;
    }

    isProcessingRef.current = true;

    try {
      console.log('🔔 Processing notification queue...');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('🔔 No authenticated user, skipping queue processing');
        return;
      }

      // Call the process-notifications Edge Function
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/process-notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchSize,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🔔 Queue processing result:', result);

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
        console.log('🔔 Max retries reached, resetting...');
        retryCountRef.current = 0;
        currentIntervalRef.current = interval;
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [interval, batchSize, maxRetries, backoffMultiplier]);

  // Manual trigger for processing
  const triggerProcessing = useCallback(() => {
    processQueue();
  }, [processQueue]);

  // Start automatic processing when component mounts
  useEffect(() => {
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
