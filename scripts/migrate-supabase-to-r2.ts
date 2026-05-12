import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

dotenv.config({ path: '.env', override: true });

type Mode = {
  dryRun: boolean;
  limit?: number;
};

type TableFieldSpec =
  | { table: string; idColumn: string; field: string; kind: 'text' }
  | { table: string; idColumn: string; field: string; kind: 'text_array' };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const R2_PUBLIC_URL = process.env.VITE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL;

const R2_ENDPOINT =
  process.env.CLOUDFLARE_R2_API_URL ||
  (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

const SUPABASE_STORAGE_PREFIX_RE = /^https?:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//i;

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function parseArgs(argv: string[]): Mode {
  const dryRun = argv.includes('--dry-run');
  const limitArgIdx = argv.findIndex((a) => a === '--limit');
  const limit = limitArgIdx >= 0 ? Number(argv[limitArgIdx + 1]) : undefined;
  return { dryRun, limit: Number.isFinite(limit) ? limit : undefined };
}

function isSupabaseStorageUrl(u: string): boolean {
  return SUPABASE_STORAGE_PREFIX_RE.test(String(u || ''));
}

function buildR2PublicUrl(key: string): string {
  const base = String(R2_PUBLIC_URL || '').replace(/\/+$/, '');
  if (!base) return key;
  return `${base}/${String(key).replace(/^\/+/, '')}`;
}

function guessContentTypeFromPath(path: string): string {
  const p = String(path || '').toLowerCase();
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.webp')) return 'image/webp';
  if (p.endsWith('.gif')) return 'image/gif';
  if (p.endsWith('.svg')) return 'image/svg+xml';
  if (p.endsWith('.mp4')) return 'video/mp4';
  if (p.endsWith('.webm')) return 'video/webm';
  if (p.endsWith('.mov')) return 'video/quicktime';
  if (p.endsWith('.mp3')) return 'audio/mpeg';
  if (p.endsWith('.wav')) return 'audio/wav';
  if (p.endsWith('.ogg')) return 'audio/ogg';
  if (p.endsWith('.m4a')) return 'audio/mp4';
  return 'application/octet-stream';
}

function extractSupabaseBucketAndPath(publicUrl: string): { bucket: string; path: string } | null {
  const cleaned = String(publicUrl || '').trim();
  if (!isSupabaseStorageUrl(cleaned)) return null;
  const rest = cleaned.replace(SUPABASE_STORAGE_PREFIX_RE, '');
  const parts = rest.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const bucket = parts[0];
  const path = parts.slice(1).join('/');
  return { bucket, path };
}

async function headR2Object(r2: S3Client, key: string): Promise<boolean> {
  try {
    await r2.send(
      new HeadObjectCommand({
        Bucket: required('CLOUDFLARE_R2_BUCKET_NAME', R2_BUCKET),
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

async function downloadFromSupabasePublicUrl(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Download failed (${resp.status}) ${url}`);
  }
  const ab = await resp.arrayBuffer();
  const ct = resp.headers.get('content-type') || guessContentTypeFromPath(new URL(url).pathname);
  return { bytes: new Uint8Array(ab), contentType: ct };
}

async function uploadToR2(r2: S3Client, key: string, bytes: Uint8Array, contentType: string): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket: required('CLOUDFLARE_R2_BUCKET_NAME', R2_BUCKET),
      Key: key,
      Body: bytes,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
}

function makeR2KeyFromSupabaseUrl(supabaseUrl: string): string {
  const parsed = extractSupabaseBucketAndPath(supabaseUrl);
  if (!parsed) throw new Error(`Not a supabase storage url: ${supabaseUrl}`);
  // Keep bucket name as prefix so collisions are avoided and we keep a stable mapping.
  return `${parsed.bucket}/${parsed.path}`;
}

async function migrateSingleUrl(params: {
  r2: S3Client;
  url: string;
  mode: Mode;
}): Promise<string | null> {
  const { r2, url, mode } = params;
  const u = String(url || '').trim();
  if (!u) return null;
  if (!isSupabaseStorageUrl(u)) return null;

  const key = makeR2KeyFromSupabaseUrl(u);
  const publicUrl = buildR2PublicUrl(key);

  if (mode.dryRun) {
    return publicUrl;
  }

  const exists = await headR2Object(r2, key);
  if (!exists) {
    const { bytes, contentType } = await downloadFromSupabasePublicUrl(u);
    await uploadToR2(r2, key, bytes, contentType);
  }

  return publicUrl;
}

async function main() {
  const mode = parseArgs(process.argv.slice(2));

  required('VITE_SUPABASE_URL (or SUPABASE_URL)', SUPABASE_URL);
  required('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);
  required('CLOUDFLARE_R2_BUCKET_NAME', R2_BUCKET);
  required('CLOUDFLARE_R2_ACCESS_KEY_ID', R2_ACCESS_KEY_ID);
  required('CLOUDFLARE_R2_SECRET_ACCESS_KEY', R2_SECRET_ACCESS_KEY);
  required('CLOUDFLARE_R2_ACCOUNT_ID or CLOUDFLARE_R2_API_URL', R2_ENDPOINT);
  required('VITE_R2_PUBLIC_URL (or CLOUDFLARE_R2_PUBLIC_URL)', R2_PUBLIC_URL);

  const supabase = createClient(required('SUPABASE_URL', SUPABASE_URL), required('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const r2 = new S3Client({
    region: 'auto',
    endpoint: required('CLOUDFLARE_R2_API_URL or CLOUDFLARE_R2_ACCOUNT_ID', R2_ENDPOINT),
    credentials: {
      accessKeyId: required('CLOUDFLARE_R2_ACCESS_KEY_ID', R2_ACCESS_KEY_ID),
      secretAccessKey: required('CLOUDFLARE_R2_SECRET_ACCESS_KEY', R2_SECRET_ACCESS_KEY),
    },
  });

  const targets: TableFieldSpec[] = [
    { table: 'posts', idColumn: 'id', field: 'media_url', kind: 'text' },
    { table: 'posts', idColumn: 'id', field: 'audio_url', kind: 'text' },
    { table: 'posts', idColumn: 'id', field: 'media_urls', kind: 'text_array' },

    { table: 'profiles', idColumn: 'id', field: 'avatar_url', kind: 'text' },
    { table: 'profiles', idColumn: 'id', field: 'cover_url', kind: 'text' },

    { table: 'profile_cv', idColumn: 'id', field: 'file_url', kind: 'text' },

    // Optional common tables
    { table: 'companies', idColumn: 'id', field: 'cover_url', kind: 'text' },
    { table: 'companies', idColumn: 'id', field: 'logo_url', kind: 'text' },
    { table: 'groups', idColumn: 'id', field: 'cover_url', kind: 'text' },
    { table: 'groups', idColumn: 'id', field: 'avatar_url', kind: 'text' },
  ];

  let totalFound = 0;
  let totalMigrated = 0;
  let totalUpdated = 0;

  for (const t of targets) {
    console.log(`\n[scan] ${t.table}.${t.field}`);

    // Fetch rows in pages and filter in JS (supports arrays and avoids column/SQL differences across envs)
    const pageSize = 1000;
    let from = 0;

    while (true) {
      let query = supabase.from(t.table).select(`${t.idColumn}, ${t.field}`).range(from, from + pageSize - 1);
      const { data, error } = await query;
      if (error) {
        console.warn(`[skip] ${t.table}.${t.field} -> ${error.message}`);
        break;
      }
      const rows = (data || []) as any[];
      if (rows.length === 0) break;

      for (const row of rows) {
        if (mode.limit && totalMigrated >= mode.limit) {
          console.log(`\n[limit] Reached --limit ${mode.limit}`);
          console.log({ totalFound, totalMigrated, totalUpdated });
          return;
        }

        const id = row[t.idColumn];

        if (t.kind === 'text') {
          const value = String(row[t.field] || '').trim();
          if (!value || !isSupabaseStorageUrl(value)) continue;

          totalFound++;
          const newUrl = await migrateSingleUrl({ r2, url: value, mode });
          if (!newUrl) continue;
          totalMigrated++;

          if (!mode.dryRun) {
            const { error: updateError } = await supabase.from(t.table).update({ [t.field]: newUrl } as any).eq(t.idColumn, id);
            if (updateError) {
              console.error(`[db] update failed ${t.table}.${t.field} id=${id}: ${updateError.message}`);
            } else {
              totalUpdated++;
            }
          }

          console.log(`[ok] ${t.table}.${t.field} id=${id}`);
        } else {
          const arr = (row[t.field] || []) as string[];
          if (!Array.isArray(arr) || arr.length === 0) continue;

          const supaItems = arr.filter((u) => isSupabaseStorageUrl(String(u || '')));
          if (supaItems.length === 0) continue;

          totalFound += supaItems.length;

          const next: string[] = [];
          let changed = false;

          for (const item of arr) {
            const s = String(item || '').trim();
            if (!s || !isSupabaseStorageUrl(s)) {
              next.push(item);
              continue;
            }

            const newUrl = await migrateSingleUrl({ r2, url: s, mode });
            if (newUrl) {
              next.push(newUrl);
              totalMigrated++;
              changed = true;
            } else {
              next.push(item);
            }
          }

          if (changed && !mode.dryRun) {
            const { error: updateError } = await supabase.from(t.table).update({ [t.field]: next } as any).eq(t.idColumn, id);
            if (updateError) {
              console.error(`[db] update failed ${t.table}.${t.field} id=${id}: ${updateError.message}`);
            } else {
              totalUpdated++;
            }
          }

          if (changed) {
            console.log(`[ok] ${t.table}.${t.field} id=${id} (updated array)`);
          }
        }
      }

      from += pageSize;
      if (rows.length < pageSize) break;
    }
  }

  console.log('\nDone');
  console.log({ totalFound, totalMigrated, totalUpdated, dryRun: mode.dryRun });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
