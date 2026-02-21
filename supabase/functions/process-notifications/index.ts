import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

    // Get pending notifications from queue
    const { data: pendingNotifications, error: fetchError } = await supabaseClient
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
        const result = await processNotification(supabaseClient, notification);
        if (result.success) {
          processed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        failed++;

        // Mark as failed
        await supabaseClient
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

  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
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
  const sendPromises = subscriptions.map(async (sub: any) => {
    try {
      const subscription: PushSubscription = JSON.parse(sub.subscription_data);

      // Use FCM or direct Web Push API
      const response = await sendWebPushNotification(subscription, pushMessage);

      return response.ok;
    } catch (error) {
      console.error(`Push failed for user ${sub.user_id}:`, error);
      return false;
    }
  });

  const results = await Promise.all(sendPromises);
  const successCount = results.filter(Boolean).length;

  console.log(`Push notifications sent: ${successCount}/${subscriptions.length} for notification ${notification.id}`);

  // Mark as processed
  await markAsProcessed(supabaseClient, notification.id);

  return { success: successCount > 0 };
}

async function sendWebPushNotification(subscription: PushSubscription, message: PushMessage): Promise<Response> {
  // Use Web Push API directly or FCM
  // For simplicity, we'll use a basic implementation
  // In production, you'd use a service like FCM or your own push service

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    icon: message.icon,
    badge: message.badge,
    data: message.data,
    actions: message.actions
  });

  // This is a placeholder - you'd need to implement actual push sending
  // using VAPID keys and a push service

  // For now, just log that we would send the notification
  console.log('Would send push notification:', {
    subscription: subscription.endpoint,
    payload: JSON.parse(payload)
  });

  // Return a mock successful response
  return new Response('OK', { status: 200 });
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
