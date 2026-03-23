// diagnose-db-urls.js
// Lista URLs de media/audio en la DB para verificar qué debe existir en R2
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env', override: true });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://wgbbaxvuuinubkgffpiq.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const R2_PUBLIC_URL = process.env.VITE_R2_PUBLIC_URL || 'https://pub-11aaf71a35c74d7da48843fdfc2c1e44.r2.dev';

function toR2Path(url) {
  if (!url || !url.includes('supabase')) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)/);
  return m ? `${m[1]}/${m[2]}` : null;
}

async function main() {
  console.log('📋 URLs en la base de datos que requieren migración a R2:\n');

  // Posts - media y audio
  const { data: posts } = await supabase.from('posts').select('id, media_url, media_urls, audio_url');
  const urls = new Set();
  for (const p of posts || []) {
    if (p.media_url) urls.add(p.media_url);
    if (p.audio_url) urls.add(p.audio_url);
    for (const u of p.media_urls || []) if (u) urls.add(u);
  }

  const byBucket = {};
  for (const url of urls) {
    const path = toR2Path(url);
    if (path) {
      const bucket = path.split('/')[0];
      if (!byBucket[bucket]) byBucket[bucket] = [];
      byBucket[bucket].push({ url, r2Path: path, r2Url: `${R2_PUBLIC_URL}/${path}` });
    }
  }

  console.log('Por bucket (paths que DEBEN existir en R2):');
  for (const [bucket, items] of Object.entries(byBucket)) {
    console.log(`\n  ${bucket}/ (${items.length} archivos)`);
    items.slice(0, 5).forEach(({ r2Path }) => console.log(`    - ${r2Path}`));
    if (items.length > 5) console.log(`    ... y ${items.length - 5} más`);
  }

  // Profiles
  const { data: profiles } = await supabase.from('profiles').select('id, avatar_url, cover_url, intro_audio_url');
  const profileUrls = new Set();
  for (const p of profiles || []) {
    if (p.avatar_url) profileUrls.add(p.avatar_url);
    if (p.cover_url) profileUrls.add(p.cover_url);
    if (p.intro_audio_url) profileUrls.add(p.intro_audio_url);
  }
  for (const url of profileUrls) {
    const path = toR2Path(url);
    if (path) {
      const bucket = path.split('/')[0];
      if (!byBucket[bucket]) byBucket[bucket] = [];
      byBucket[bucket].push({ url, r2Path: path, r2Url: `${R2_PUBLIC_URL}/${path}` });
    }
  }

  console.log('\n✅ Ejecuta: node scripts/migrate-supabase-to-r2.js');
  console.log('   Luego:   node scripts/update-db-urls-to-r2.js');
}

main().catch(console.error);
