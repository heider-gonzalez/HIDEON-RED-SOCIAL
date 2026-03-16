// migrate-supabase-to-r2.js
// Run with: node scripts/migrate-supabase-to-r2.js
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Load environment variables
dotenv.config({ path: '.env', override: true });

// Fallback: hardcoded values (temporary solution)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wgbbaxvuuinubkgffpiq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYmJheHZ1dWludWJrZ2ZmcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTgxNzg2OCwiZXhwIjoyMDU1MzkzODY4fQ.aM-1OHoe5C08YoyS9Lw5NvUlCPJB5zYP6h4klpTuk';

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_API_URL || 'https://137569df68ffc80cc0977391324e77fc.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || 'f732d475284f962d821b7b4ad6ffeb0e',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '936ab27b07bd4f1cfd19155bdcdc9fce0326a8b3de6b1294875e2dae51f3b569',
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'hideon-media';

async function listAllFiles(bucket, prefix = '') {
  const files = [];
  let continuationToken = null;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const resp = await r2.send(cmd);
    files.push(...(resp.Contents || []));
    continuationToken = resp.NextContinuationToken;
  } while (continuationToken);
  return files;
}

async function migrateBucket(bucketName) {
  console.log(`📦 Migrating bucket: ${bucketName}`);
  const { data: files, error } = await supabase.storage.from(bucketName).list('', { limit: 10000 });
  if (error) throw error;

  for (const file of files) {
    try {
      const { data: fileData, error: downloadError } = await supabase.storage.from(bucketName).download(file.name);
      if (downloadError) throw downloadError;

      // Convert to buffer
      const buffer = await fileData.arrayBuffer();
      
      const uploadCmd = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${bucketName}/${file.name}`,
        Body: new Uint8Array(buffer),
        ContentType: file.metadata?.mimetype || 'application/octet-stream',
      });
      await r2.send(uploadCmd);
      console.log(`✅ Uploaded: ${bucketName}/${file.name}`);
    } catch (err) {
      console.error(`❌ Failed to upload ${bucketName}/${file.name}:`, err);
    }
  }
}

async function main() {
  try {
    await migrateBucket('media');
    await migrateBucket('post-audio');
    await migrateBucket('profiles');
    console.log('🎉 Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

main();
