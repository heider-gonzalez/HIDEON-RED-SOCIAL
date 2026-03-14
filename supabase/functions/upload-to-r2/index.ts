import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.948.0?dts'
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3.948.0?dts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: corsHeaders 
    })
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

    const contentType = req.headers.get('content-type') || ''
    let inputFileName = ''
    let inputContentType = ''

    if (contentType.includes('application/json')) {
      const body = (await req.json().catch(() => ({}))) as any
      inputFileName = String(body?.fileName || '')
      inputContentType = String(body?.contentType || '')
    } else {
      const formData = await req.formData()
      const fileName = formData.get('fileName') as string
      const file = formData.get('file') as File | null
      inputFileName = String(fileName || '')
      inputContentType = String(file?.type || '')
    }

    if (!inputFileName || !inputContentType) {
      return new Response(JSON.stringify({ error: 'Missing fileName or contentType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const R2_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID')
    const R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')
    const R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')
    const R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')
    const publicBaseUrl = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL') ?? ''

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !publicBaseUrl) {
      return new Response(JSON.stringify({ error: 'R2 credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const sanitizedName = inputFileName.replace(/^\/+/, '')
    const key = `users/${authData.user.id}/${Date.now()}-${sanitizedName}`

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    })

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: inputContentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 })
    const publicUrl = `${publicBaseUrl.replace(/\/$/, '')}/${key}`

    return new Response(JSON.stringify({ signedUrl, publicUrl, key }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})