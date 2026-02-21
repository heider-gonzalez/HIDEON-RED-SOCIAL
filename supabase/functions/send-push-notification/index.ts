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

    // Get the message data from the request
    const { record } = await req.json()
    const { id_autor, id_canal, contenido } = record

    // Get message author info
    const { data: authorData } = await supabaseClient
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', id_autor)
      .single()

    if (!authorData) {
      return new Response(JSON.stringify({ error: 'Author not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get channel members (excluding the author)
    const { data: members } = await supabaseClient
      .from('miembros_canal')
      .select('id_usuario')
      .eq('id_canal', id_canal)
      .neq('id_usuario', id_autor)

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No recipients found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get push subscriptions for all recipients
    const recipientIds = members.map(m => m.id_usuario)
    const { data: subscriptions } = await supabaseClient
      .from('push_subscriptions')
      .select('user_id, subscription_data')
      .in('user_id', recipientIds)

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No subscriptions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Prepare push message
    const pushMessage: PushMessage = {
      title: `Nuevo mensaje de ${authorData.username}`,
      body: contenido.length > 100 ? contenido.substring(0, 100) + '...' : contenido,
      icon: authorData.avatar_url || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: {
        type: 'message',
        senderId: id_autor,
        senderName: authorData.username,
        channelId: id_canal,
        url: `/messages?user=${id_autor}`
      },
      actions: [
        { action: 'view', title: 'Ver mensaje' },
        { action: 'dismiss', title: 'Descartar' }
      ]
    }

    // Send push notifications to all subscribers
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const subscription: PushSubscription = JSON.parse(sub.subscription_data)

        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: subscription.endpoint,
            data: pushMessage,
            notification: {
              title: pushMessage.title,
              body: pushMessage.body,
              icon: pushMessage.icon,
              badge: pushMessage.badge,
              click_action: pushMessage.data.url,
              actions: pushMessage.actions
            }
          })
        })

        if (!response.ok) {
          console.error(`Push failed for user ${sub.user_id}:`, response.statusText)
        }

        return response.ok
      } catch (error) {
        console.error(`Error sending push to user ${sub.user_id}:`, error)
        return false
      }
    })

    const results = await Promise.all(sendPromises)
    const successCount = results.filter(Boolean).length

    console.log(`Push notifications sent: ${successCount}/${subscriptions.length}`)

    return new Response(JSON.stringify({
      success: true,
      sent: successCount,
      total: subscriptions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
