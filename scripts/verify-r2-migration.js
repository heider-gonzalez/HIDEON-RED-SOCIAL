// verify-r2-migration.js
// Run after migration to confirm all files exist in R2
import dotenv from 'dotenv';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Load environment variables
dotenv.config({ path: '.env', override: true });

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_API_URL || 'https://137569df68ffc80cc0977391324e77fc.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || 'f732d475284f962d821b7b4ad6ffeb0e',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '936ab27b07bd4f1cfd19155bdcdc9fce0326a8b3de6b1294875e2dae51f3b569',
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'hideon-media';

async function listAll(prefix = '') {
  const files = [];
  let continuationToken = null;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const resp = await r2.send(cmd);
    files.push(...(resp.Contents || []));
    continuationToken = resp.NextContinuationToken;
  } while (continuationToken);
  return files;
}

async function main() {
  const media = await listAll('media/');
  const audio = await listAll('post-audio/');
  const profiles = await listAll('profiles/');
  console.log(`📊 R2 counts:`);
  console.log(`  media: ${media.length}`);
  console.log(`  post-audio: ${audio.length}`);
  console.log(`  profiles: ${profiles.length}`);
  console.log('\nSample keys:');
  console.log(media.slice(0, 5).map(f => f.Key));
  console.log(audio.slice(0, 5).map(f => f.Key));
  console.log(profiles.slice(0, 5).map(f => f.Key));
}

main();
