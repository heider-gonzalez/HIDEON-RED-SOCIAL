// update-db-urls-to-r2.js
// After migrating files to R2, update all media_url/media_urls in DB to point to R2 public URL
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env', override: true });

// Fallback: hardcoded values (temporary solution)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wgbbaxvuuinubkgffpiq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYmJheHZ1dWludWJrZ2ZmcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTgxNzg2OCwiZXhwIjoyMDU1MzkzODY4fQ.aM-1OHoe5C08YoyS9Lw5NvUlCPJB5zYP6h4klpTuk';

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

const R2_PUBLIC_URL = process.env.VITE_R2_PUBLIC_URL || 'https://pub-11aaf71a35c74d7da48843fdfc2c1e44.r2.dev';

function toR2Url(url) {
  if (!url || !url.includes('supabase')) return url;
  return url.replace(/.*\/storage\/v1\/object\/public\/([^\/]+)\/(.+)/, `${R2_PUBLIC_URL}/$1/$2`);
}

async function updatePosts() {
  const { data: posts, error } = await supabase.from('posts').select('id, media_url, media_urls, audio_url').or('media_url.not.is.null,media_urls.not.is.null,audio_url.not.is.null');
  if (error) throw error;

  for (const post of posts) {
    const updates = {};
    if (post.media_url && post.media_url.includes('supabase')) {
      updates.media_url = toR2Url(post.media_url);
    }
    if (post.media_urls && Array.isArray(post.media_urls)) {
      updates.media_urls = post.media_urls.map(url => toR2Url(url));
    }
    if (post.audio_url && post.audio_url.includes('supabase')) {
      updates.audio_url = toR2Url(post.audio_url);
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from('posts').update(updates).eq('id', post.id);
      console.log(`✅ Updated post ${post.id}`);
    }
  }
}

async function updateProfiles() {
  const { data: profiles, error } = await supabase.from('profiles').select('id, avatar_url, cover_url, intro_audio_url').or('avatar_url.not.is.null,cover_url.not.is.null,intro_audio_url.not.is.null');
  if (error) throw error;

  for (const profile of profiles) {
    const updates = {};
    ['avatar_url', 'cover_url', 'intro_audio_url'].forEach(field => {
      if (profile[field] && profile[field].includes('supabase')) {
        updates[field] = toR2Url(profile[field]);
      }
    });
    if (Object.keys(updates).length > 0) {
      await supabase.from('profiles').update(updates).eq('id', profile.id);
      console.log(`✅ Updated profile ${profile.id}`);
    }
  }
}

async function main() {
  try {
    await updatePosts();
    await updateProfiles();
    console.log('🎉 DB URLs updated to R2!');
  } catch (err) {
    console.error('❌ Update failed:', err);
  }
}

main();
