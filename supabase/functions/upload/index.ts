import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.385.0'
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3.385.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Environment variables from Supabase Edge Functions
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')
const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')
const R2_PUBLIC_DOMAIN = Deno.env.get('R2_PUBLIC_DOMAIN') || `${R2_ACCOUNT_ID}.r2.dev`
const JWT_SECRET = Deno.env.get('JWT_SECRET')

// Configure S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
})

serve(async (req) => {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify JWT token with Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response('Invalid token', { status: 401 })
    }

    // Parse request body
    const { fileKey, contentType } = await req.json()
    
    if (!fileKey || !contentType) {
      return new Response('Missing required parameters', { status: 400 })
    }

    // Create a path with user ID to organize files by user
    const sanitizedFileName = fileKey.replace(/^\/|\/$/g, '')
    const userFilePath = `users/${user.id}/${Date.now()}-${sanitizedFileName}`
    const publicUrl = `https://${R2_PUBLIC_DOMAIN}/${userFilePath}`

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: userFilePath,
      ContentType: contentType,
      Metadata: {
        'uploaded-by': user.id,
        'original-filename': fileKey,
        'upload-timestamp': new Date().toISOString()
      }
    })

    // Generate signed URL (valid for 5 minutes)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })
    
    return new Response(
      JSON.stringify({
        signedUrl,
        publicUrl,
        fileKey: userFilePath,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in upload function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})