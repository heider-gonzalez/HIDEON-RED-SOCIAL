import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const SERVICE_ROLE_KEY =
  Deno.env.get('SERVICE_ROLE_KEY') ??
  Deno.env.get('H_SERVICE_ROLE_KEY') ??
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  ''

Deno.serve(async (req: Request) => {
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
    if (authError || !authData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing SERVICE_ROLE_KEY (set as Edge Function secret)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, SERVICE_ROLE_KEY)
    const userId = authData.user.id

    const { data: notifications, error } = await adminClient
      .from('notifications')
      .select('id, sender_id, message, created_at')
      .eq('receiver_id', userId)
      .eq('type', 'message')
      .eq('read', false)
      .order('created_at', { ascending: false })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rows = (notifications || []) as any[]
    const senderIds = Array.from(new Set(rows.map((n) => n?.sender_id).filter(Boolean))) as string[]

    const profilesById: Record<string, { username: string | null; avatar_url: string | null }> = {}
    if (senderIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', senderIds)

      ;(profiles || []).forEach((p: any) => {
        if (!p?.id) return
        profilesById[String(p.id)] = {
          username: p.username ?? null,
          avatar_url: p.avatar_url ?? null,
        }
      })
    }

    const grouped: Record<string, any> = {}
    for (const n of rows) {
      const sid = String(n?.sender_id || '')
      if (!sid) continue

      if (!grouped[sid]) {
        const profile = profilesById[sid]
        grouped[sid] = {
          channel_id: sid,
          channel_name: profile?.username ?? `Usuario ${sid.slice(0, 8)}`,
          sender_username: profile?.username ?? `Usuario ${sid.slice(0, 8)}`,
          sender_avatar: profile?.avatar_url ?? null,
          message_content: n?.message ?? null,
          unread_count: 1,
          last_message_at: n?.created_at ?? null,
        }
      } else {
        grouped[sid].unread_count += 1
        if (n?.created_at && (!grouped[sid].last_message_at || n.created_at > grouped[sid].last_message_at)) {
          grouped[sid].last_message_at = n.created_at
          grouped[sid].message_content = n?.message ?? grouped[sid].message_content
        }
      }
    }

    const result = Object.values(grouped)

    return new Response(JSON.stringify({ unreadMessages: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
