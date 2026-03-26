import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wgbbaxvuuinubkgffpiq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYmJheHZ1dWludWJrZ2ZmcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTgxNzg2OCwiZXhwIjoyMDU1MzkzODY4fQ.ntKJlyWN_GZAtQydt0gGnsEH7ivBV-s-IUPy67uijlo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkR2Images() {
  console.log('🔍 Buscando imágenes que aún apuntan a R2...\n');
  
  try {
    // Buscar posts con URLs de R2
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, media_url, media_urls, media_type')
      .or('media_url.ilike.%r2.dev%,media_urls.cs.{%r2.dev%}');
      
    if (error) {
      throw new Error(`Error: ${error.message}`);
    }
    
    console.log(`📊 Posts con URLs de R2: ${posts.length}\n`);
    
    if (posts.length === 0) {
      console.log('✅ No hay imágenes de R2 por actualizar');
      return;
    }
    
    posts.forEach((post, index) => {
      console.log(`${index + 1}. Post ID: ${post.id}`);
      console.log(`   media_url: ${post.media_url}`);
      console.log(`   media_type: ${post.media_type}`);
      if (post.media_urls) {
        post.media_urls.forEach((url, i) => {
          if (url.includes('r2.dev')) {
            console.log(`   media_urls[${i}]: ${url}`);
          }
        });
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkR2Images();
