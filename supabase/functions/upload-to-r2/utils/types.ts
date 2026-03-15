/// <reference types="https://deno.land/x/s3_lite_client@0.7.0/mod.ts" />

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  CLOUDFLARE_R2_ACCOUNT_ID: string;
  CLOUDFLARE_R2_ACCESS_KEY_ID: string;
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: string;
  CLOUDFLARE_R2_BUCKET_NAME: string;
  CLOUDFLARE_R2_PUBLIC_URL: string;
}

export function getEnv(): Env {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const r2AccountId = Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID') ?? '';
  const r2AccessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID') ?? '';
  const r2SecretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY') ?? '';
  const r2BucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME') ?? '';
  const r2PublicUrl = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL') ?? '';

  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: anonKey,
    CLOUDFLARE_R2_ACCOUNT_ID: r2AccountId,
    CLOUDFLARE_R2_ACCESS_KEY_ID: r2AccessKeyId,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: r2SecretAccessKey,
    CLOUDFLARE_R2_BUCKET_NAME: r2BucketName,
    CLOUDFLARE_R2_PUBLIC_URL: r2PublicUrl
  };
}

export function validateEnv(): { isValid: boolean; missing: string[] } {
  const env = getEnv();
  const missing: string[] = [];

  if (!env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!env.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
  if (!env.CLOUDFLARE_R2_ACCOUNT_ID) missing.push('CLOUDFLARE_R2_ACCOUNT_ID');
  if (!env.CLOUDFLARE_R2_ACCESS_KEY_ID) missing.push('CLOUDFLARE_R2_ACCESS_KEY_ID');
  if (!env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) missing.push('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  if (!env.CLOUDFLARE_R2_BUCKET_NAME) missing.push('CLOUDFLARE_R2_BUCKET_NAME');
  if (!env.CLOUDFLARE_R2_PUBLIC_URL) missing.push('CLOUDFLARE_R2_PUBLIC_URL');

  return {
    isValid: missing.length === 0,
    missing
  };
}
