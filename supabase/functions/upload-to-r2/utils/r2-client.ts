import { S3Client } from "https://deno.land/x/s3_lite_client@0.7.0/mod.ts";
import { getEnv } from './types';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

export interface UploadResult {
  signedUrl: string;
  publicUrl: string;
  key: string;
}

export function createR2Client(config: R2Config): S3Client {
  const cleanEndPoint = `${config.accountId}.r2.cloudflarestorage.com`;

  return new S3Client({
    endPoint: cleanEndPoint,
    region: "auto",
    accessKey: config.accessKeyId,
    secretKey: config.secretAccessKey,
    bucket: config.bucketName,
    useSSL: true,
  });
}

export function getR2Config(): R2Config {
  const env = getEnv();
  const { 
    CLOUDFLARE_R2_ACCOUNT_ID: accountId,
    CLOUDFLARE_R2_ACCESS_KEY_ID: accessKeyId,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: secretAccessKey,
    CLOUDFLARE_R2_BUCKET_NAME: bucketName,
    CLOUDFLARE_R2_PUBLIC_URL: publicUrl
  } = env;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    throw new Error('R2 credentials not configured');
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl
  };
}

export function generateFileKey(userId: string, fileName: string): string {
  const sanitizedName = fileName.replace(/^\/+/, '');
  const timestamp = Date.now();
  return `users/${userId}/${timestamp}-${sanitizedName}`;
}

export async function generatePresignedUrl(
  client: S3Client,
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const signedUrl = await client.getPresignedUrl("PUT", key, {
      expirySeconds: expiresIn,
    });

    console.log('Generated presigned URL for key:', key);
    console.log('Signed URL:', signedUrl);

    return signedUrl;
  } catch (error: any) {
    console.error('Error generating presigned URL:', error);
    throw new Error(`Failed to generate presigned URL: ${error.message || 'Unknown error'}`);
  }
}

export function buildPublicUrl(publicBaseUrl: string, key: string): string {
  return `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
}
