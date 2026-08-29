import { logger } from './logger';

// Environment variables - only non-sensitive ones for client-side
const R2_PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_DOMAIN;
const R2_ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID;

// Types for the request and response
interface GenerateSignedUrlRequest {
  fileKey: string;
  contentType: string;
  userId: string;
}

export interface SignedUrlResponse {
  signedUrl: string;
  publicUrl: string;
  fileKey: string;
}

/**
 * Client-side upload function using backend API
 * Sensitive credentials (R2_SECRET_ACCESS_KEY, R2_ACCESS_KEY_ID, R2_BUCKET_NAME)
 * should be handled server-side, not exposed to the client
 */
export async function uploadFileToR2(file: File, authToken: string): Promise<{ fileUrl: string; fileKey: string }> {
  try {
    logger.info('Starting file upload to R2', 'upload', { 
      fileName: file.name, 
      fileSize: file.size,
      contentType: file.type 
    });

    // 1. Get signed URL from backend API (sensitive credentials handled server-side)
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        fileKey: file.name,
        contentType: file.type
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      logger.error('Failed to get signed URL from backend', 'upload', { 
        status: response.status,
        error 
      });
      throw new Error(error.message || 'Failed to get signed URL');
    }

    const { signedUrl, publicUrl, fileKey } = await response.json();

    logger.info('Received signed URL from backend', 'upload', { fileKey });

    // 2. Upload the file directly to R2 using the signed URL
    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      logger.error('Upload to R2 failed', 'upload', { 
        status: uploadResponse.status,
        fileKey 
      });
      throw new Error('Upload failed');
    }

    logger.info('File uploaded successfully to R2', 'upload', { 
      fileUrl: publicUrl,
      fileKey 
    });

    // 3. Return the public URL and file key for future reference
    return { fileUrl: publicUrl, fileKey };
  } catch (error) {
    logger.error('Upload error:', 'upload', { error });
    throw error;
  }
}

/**
 * Helper function to construct public URL from file key
 * Used for displaying previously uploaded files
 */
export function getPublicUrl(fileKey: string): string {
  if (!R2_PUBLIC_DOMAIN || !R2_ACCOUNT_ID) {
    logger.warn('R2 configuration missing for public URL generation', 'upload');
    return '';
  }
  return `https://${R2_PUBLIC_DOMAIN}/${fileKey}`;
}