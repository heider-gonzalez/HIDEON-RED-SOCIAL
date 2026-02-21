import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CleanupOptions {
  processedOlderThan?: number; // hours
  failedOlderThan?: number; // hours
  pendingOlderThan?: number; // hours (for stuck pending notifications)
  dryRun?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request options
    const options: CleanupOptions = await req.json().catch(() => ({}));
    const {
      processedOlderThan = 24, // 24 hours
      failedOlderThan = 168, // 7 days
      pendingOlderThan = 24, // 24 hours (stuck pending)
      dryRun = false
    } = options;

    console.log('🧹 Starting notification queue cleanup...', { processedOlderThan, failedOlderThan, pendingOlderThan, dryRun });

    const now = new Date();
    const results = {
      processed: 0,
      failed: 0,
      pending: 0,
      total: 0
    };

    // Build date thresholds
    const processedThreshold = new Date(now.getTime() - (processedOlderThan * 60 * 60 * 1000)).toISOString();
    const failedThreshold = new Date(now.getTime() - (failedOlderThan * 60 * 60 * 1000)).toISOString();
    const pendingThreshold = new Date(now.getTime() - (pendingOlderThan * 60 * 60 * 1000)).toISOString();

    // Clean up processed notifications
    if (!dryRun) {
      const { data: processedData, error: processedError } = await supabaseClient
        .from('notification_queue')
        .delete()
        .eq('status', 'processed')
        .lt('processed_at', processedThreshold)
        .select('id');

      if (processedError) {
        console.error('Error cleaning processed notifications:', processedError);
      } else {
        results.processed = processedData?.length || 0;
        console.log(`🗑️ Cleaned ${results.processed} processed notifications older than ${processedOlderThan} hours`);
      }
    } else {
      const { count: processedCount } = await supabaseClient
        .from('notification_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'processed')
        .lt('processed_at', processedThreshold);

      results.processed = processedCount || 0;
      console.log(`📊 Would clean ${results.processed} processed notifications (dry run)`);
    }

    // Clean up failed notifications (older threshold)
    if (!dryRun) {
      const { data: failedData, error: failedError } = await supabaseClient
        .from('notification_queue')
        .delete()
        .eq('status', 'failed')
        .lt('created_at', failedThreshold)
        .select('id');

      if (failedError) {
        console.error('Error cleaning failed notifications:', failedError);
      } else {
        results.failed = failedData?.length || 0;
        console.log(`🗑️ Cleaned ${results.failed} failed notifications older than ${failedOlderThan} hours`);
      }
    } else {
      const { count: failedCount } = await supabaseClient
        .from('notification_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .lt('created_at', failedThreshold);

      results.failed = failedCount || 0;
      console.log(`📊 Would clean ${results.failed} failed notifications (dry run)`);
    }

    // Clean up stuck pending notifications (older than threshold)
    if (!dryRun) {
      const { data: pendingData, error: pendingError } = await supabaseClient
        .from('notification_queue')
        .delete()
        .eq('status', 'pending')
        .lt('created_at', pendingThreshold)
        .select('id');

      if (pendingError) {
        console.error('Error cleaning stuck pending notifications:', pendingError);
      } else {
        results.pending = pendingData?.length || 0;
        console.log(`🗑️ Cleaned ${results.pending} stuck pending notifications older than ${pendingOlderThan} hours`);
      }
    } else {
      const { count: pendingCount } = await supabaseClient
        .from('notification_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('created_at', pendingThreshold);

      results.pending = pendingCount || 0;
      console.log(`📊 Would clean ${results.pending} stuck pending notifications (dry run)`);
    }

    results.total = results.processed + results.failed + results.pending;

    // Get current queue stats for monitoring
    const { count: totalCount } = await supabaseClient
      .from('notification_queue')
      .select('*', { count: 'exact', head: true });

    const { data: statusCounts } = await supabaseClient
      .from('notification_queue')
      .select('status')
      .then(({ data }) => {
        const counts = { pending: 0, processed: 0, failed: 0 };
        data?.forEach(item => {
          counts[item.status as keyof typeof counts]++;
        });
        return counts;
      });

    console.log('🧹 Cleanup completed:', results);
    console.log('📊 Current queue status:', { total: totalCount, ...statusCounts });

    return new Response(JSON.stringify({
      success: true,
      cleaned: results,
      currentStats: {
        total: totalCount,
        ...statusCounts
      },
      dryRun
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
