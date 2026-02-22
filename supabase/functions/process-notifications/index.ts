import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import webpush from 'npm:web-push@3.6.7'

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface PushMessage {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: any
  actions?: Array<{
    action: string
    title: string
  }>
}

type PushAttemptResult = {
  user_id: string
  ok: boolean
  status?: number
  error?: string
}

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? ''
const SERVICE_ROLE_KEY =
  Deno.env.get('SERVICE_ROLE_KEY') ??
  Deno.env.get('H_SERVICE_ROLE_KEY') ??
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  ''

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    if (!supabaseUrl || !anonKey) {
      return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the caller is authenticated (function should be called from your app)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: authData, error: authError } = await userClient.auth.getUser()
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service-role for queue processing so we can read recipients' subscriptions regardless of RLS.
    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({
        error: 'Missing SERVICE_ROLE_KEY (set as Edge Function secret)',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, SERVICE_ROLE_KEY)

    // Get pending notifications from queue
    const { data: pendingNotifications, error: fetchError } = await adminClient
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10); // Process in batches

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch notifications' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending notifications' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let processed = 0;
    let failed = 0;

    // Process each notification
    for (const notification of pendingNotifications) {
      try {
        const result = await processNotification(adminClient, notification);
        if (result.success) {
          processed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        failed++;

        // Mark as failed
        await adminClient
          .from('notification_queue')
          .update({ status: 'failed' })
          .eq('id', notification.id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
      total: pendingNotifications.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processNotification(supabaseClient: any, notification: any): Promise<{ success: boolean }> {
  const { type, recipient_ids, payload } = notification;

  if (type !== 'message') {
    // For now, only handle message notifications
    await markAsProcessed(supabaseClient, notification.id);
    return { success: true };
  }

  // Get push subscriptions for recipients
  const { data: subscriptions } = await supabaseClient
    .from('push_subscriptions')
    .select('user_id, subscription_data')
    .in('user_id', recipient_ids);

  if (!subscriptions || subscriptions.length === 0) {
    await markAsProcessed(supabaseClient, notification.id);
    return { success: true };
  }

  // Get message author info
  const { data: authorData } = await supabaseClient
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', payload.authorId)
    .single();

  if (!authorData) {
    await markAsProcessed(supabaseClient, notification.id);
    return { success: true };
  }

  // Prepare push message
  const pushMessage: PushMessage = {
    title: `Nuevo mensaje de ${authorData.username}`,
    body: payload.content.length > 100 ? payload.content.substring(0, 100) + '...' : payload.content,
    icon: authorData.avatar_url || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: {
      type: 'message',
      senderId: payload.authorId,
      senderName: authorData.username,
      channelId: payload.channelId,
      url: `/messages?user=${payload.authorId}`
    },
    actions: [
      { action: 'view', title: 'Ver mensaje' },
      { action: 'dismiss', title: 'Descartar' }
    ]
  };

  // Send push notifications
  const sendPromises: Array<Promise<PushAttemptResult>> = subscriptions.map(async (sub: any) => {
    try {
      const subscriptionData = sub.subscription_data
      const subscription: PushSubscription = typeof subscriptionData === 'string'
        ? JSON.parse(subscriptionData)
        : subscriptionData

      // Use FCM or direct Web Push API
      const response = await sendWebPushNotification(subscription, pushMessage);
      if (response.status === 404 || response.status === 410) {
        // Subscription expired or is no longer valid. Remove it so we don't keep failing.
        await supabaseClient
          .from('push_subscriptions')
          .delete()
          .eq('user_id', sub.user_id);
      }
      return { user_id: sub.user_id, ok: response.ok, status: response.status };
    } catch (error: any) {
      console.error(`Push failed for user ${sub.user_id}:`, error);
      return {
        user_id: sub.user_id,
        ok: false,
        status: error?.statusCode ?? error?.status,
        error: error?.message ?? String(error),
      };
    }
  });

  const results = await Promise.all(sendPromises);
  const successCount = results.filter((r) => r.ok).length;

  console.log(`Push notifications sent: ${successCount}/${subscriptions.length} for notification ${notification.id}`);

  if (successCount > 0) {
    // Mark as processed
    await markAsProcessed(supabaseClient, notification.id);
  } else {
    // Keep visibility when delivery fails completely
    const safePayload = (payload && typeof payload === 'object') ? payload : {}
    await supabaseClient
      .from('notification_queue')
      .update({
        status: 'failed',
        payload: {
          ...safePayload,
          push_debug: {
            attempted: subscriptions.length,
            results,
          },
        },
      })
      .eq('id', notification.id);
  }

  return { success: successCount > 0 };
}

async function sendWebPushNotification(subscription: PushSubscription, message: PushMessage): Promise<Response> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    console.error('Missing VAPID env vars. Please set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT')
    return new Response('Missing VAPID env vars', { status: 500 })
  }

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    icon: message.icon,
    badge: message.badge,
    data: message.data,
    actions: message.actions,
  })

  try {
    const result = await webpush.sendNotification(subscription as any, payload)
    const status = (result as any)?.statusCode ?? 201
    return new Response('OK', { status })
  } catch (err: any) {
    const statusCode = err?.statusCode ?? err?.status ?? 500
    const body = err?.body ?? err?.message ?? 'Push send error'
    console.error('WebPush send failed:', { statusCode, body })
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status: statusCode })
  }
}

async function markAsProcessed(supabaseClient: any, notificationId: string) {
  await supabaseClient
    .from('notification_queue')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString()
    })
    .eq('id', notificationId);
}
