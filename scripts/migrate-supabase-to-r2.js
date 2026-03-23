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

/**
 * Lista recursivamente todos los archivos en un bucket de Supabase.
 * Supabase list() solo devuelve un nivel; iteramos en subcarpetas.
 */
async function listAllInBucket(bucketName, prefix = '') {
  const allFiles = [];
  const { data: items, error } = await supabase.storage.from(bucketName).list(prefix, { limit: 1000 });
  if (error) throw error;
  if (!items || items.length === 0) return allFiles;

  for (const item of items) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    // Probar si es carpeta: listar con trailing slash
    const { data: subItems } = await supabase.storage.from(bucketName).list(fullPath, { limit: 1 });
    const isFolder = subItems && subItems.length > 0;

    if (isFolder) {
      const nested = await listAllInBucket(bucketName, fullPath);
      allFiles.push(...nested);
    } else {
      allFiles.push({ path: fullPath });
    }
  }
  return allFiles;
}

async function migrateBucket(bucketName) {
  console.log(`📦 Migrating bucket: ${bucketName} (recursive)...`);
  const files = await listAllInBucket(bucketName);
  console.log(`   Found ${files.length} files`);

  for (const { path } of files) {
    try {
      const { data: fileData, error: downloadError } = await supabase.storage.from(bucketName).download(path);
      if (downloadError) {
        console.error(`❌ Download failed ${bucketName}/${path}:`, downloadError.message);
        continue;
      }

      const buffer = await fileData.arrayBuffer();
      const ext = path.split('.').pop()?.toLowerCase() || '';
      const mimeMap = {
        mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
        mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp'
      };
      const contentType = mimeMap[ext] || 'application/octet-stream';

      const uploadCmd = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${bucketName}/${path}`,
        Body: new Uint8Array(buffer),
        ContentType: contentType,
      });
      await r2.send(uploadCmd);
      console.log(`✅ ${bucketName}/${path}`);
    } catch (err) {
      console.error(`❌ ${bucketName}/${path}:`, err.message);
    }
  }
}

// Buckets que usa la app (media, post-audio, profiles) + otros que pueden tener contenido de posts
const BUCKETS_TO_MIGRATE = [
  'media',       // Videos e imágenes de posts
  'post-audio',  // Audio de fondo de posts (crítico - suele faltar)
  'profiles',    // Avatares y portadas
  'avatars',     // Por si avatar_url apunta aquí
  'covers',      // Por si cover_url apunta aquí
  'post-media',  // Alternativa para media de posts
  'post-videos', // Alternativa para videos
];

async function main() {
  try {
    for (const bucket of BUCKETS_TO_MIGRATE) {
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.some(b => b.name === bucket);
        if (!exists) {
          console.log(`⏭️  Skipping ${bucket} (bucket not found in Supabase)`);
          continue;
        }
        await migrateBucket(bucket);
      } catch (err) {
        console.error(`❌ Error migrating ${bucket}:`, err.message);
      }
    }
    console.log('🎉 Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

main();
