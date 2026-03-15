import { createClient, type Client } from 'https://esm.sh/@supabase/supabase-js@2'
import { createCorsResponse, createErrorResponse } from './utils/cors'
import { validateUploadRequest, sanitizeFileName } from './utils/validation'
import { getR2Config, generateFileKey, generatePresignedUrl, buildPublicUrl } from './utils/r2-client'
import { getEnv, validateEnv } from './utils/types'

/// <reference types="./utils/deno-types.d.ts" />

Deno.serve(async (req: Request) => {
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  try {
    // Validate environment
    const envValidation = validateEnv();
    if (!envValidation.isValid) {
      return createErrorResponse(
        `Missing environment variables: ${envValidation.missing.join(', ')}`,
        500
      );
    }

    const supabase = createClient(getEnv().SUPABASE_URL, getEnv().SUPABASE_ANON_KEY);

    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Missing Authorization header', 401);
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user?.id) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Parse and validate request body
    const contentType = req.headers.get('content-type') || '';
    let body: any;

    if (contentType.includes('application/json')) {
      body = await req.json().catch(() => ({}));
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      body = {
        fileName: formData.get('fileName'),
        contentType: formData.get('contentType')
      };
    } else {
      return createErrorResponse('Invalid Content-Type', 400);
    }

    const { data, errors } = validateUploadRequest(body);
    if (errors.length > 0) {
      return createErrorResponse(
        `Validation errors: ${errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    // Process upload request
    const { fileName, contentType: inputContentType } = data;
    const config = getR2Config();
    const r2Client = createR2Client(config);
    
    const sanitizedFileName = sanitizeFileName(fileName);
    const fileKey = generateFileKey(authData.user.id, sanitizedFileName);
    
    console.log('Processing upload request:', {
      userId: authData.user.id,
      fileName: sanitizedFileName,
      contentType: inputContentType,
      fileKey
    });

    // Generate presigned URL
    const signedUrl = await generatePresignedUrl(
      r2Client,
      fileKey,
      inputContentType,
      3600 // 1 hour
    );

    const publicUrl = buildPublicUrl(config.publicUrl, fileKey);

    console.log('Successfully generated upload URLs:', {
      fileKey,
      signedUrl: signedUrl.substring(0, 100) + '...', // Log truncated URL for security
      publicUrl
    });

    return createCorsResponse({
      signedUrl,
      publicUrl,
      key: fileKey,
      fileName: sanitizedFileName,
      contentType: inputContentType
    });

  } catch (error: any) {
    console.error('Upload function error:', {
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString()
    });

    return createErrorResponse(
      error?.message || 'Internal server error',
      error?.message && error.message.includes('timeout') ? 408 : 500,
      error?.stack
    );
  }
});
