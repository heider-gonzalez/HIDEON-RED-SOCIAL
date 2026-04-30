import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createR2Client, getR2Config } from '../upload-to-r2/utils/r2-client.ts'
import { validateEnv } from '../upload-to-r2/utils/types.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const envValidation = validateEnv()
    if (!envValidation.isValid) {
      return new Response(JSON.stringify({ error: `Missing env vars: ${envValidation.missing.join(', ')}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

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

    const body = (await req.json().catch(() => ({}))) as any
    const key = String(body?.key || '').replace(/^\/+/, '')
    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing key' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const config = getR2Config()
    const r2Client = createR2Client(config)

    const signedDeleteUrl = await r2Client.getPresignedUrl('DELETE', key, {
      expirySeconds: 60 * 10,
    })

    const delRes = await fetch(signedDeleteUrl, {
      method: 'DELETE',
    })

    if (!delRes.ok) {
      const text = await delRes.text().catch(() => '')
      return new Response(
        JSON.stringify({ error: `R2 delete failed: ${delRes.status} ${delRes.statusText}`, details: text }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(JSON.stringify({ success: true, key }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? String(error), stack: error?.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
