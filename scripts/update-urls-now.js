import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wgbbaxvuuinubkgffpiq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYmJheHZ1dWludWJrZ2ZmcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTgxNzg2OCwiZXhwIjoyMDU1MzkzODY4fQ.ntKJlyWN_GZAtQydt0gGnsEH7ivBV-s-IUPy67uijlo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateVideoUrls() {
  console.log('🔄 Actualizando URLs de videos en la base de datos...\n');
  
  try {
    // 1. Obtener posts con media_url
    console.log('📋 Buscando posts con media_url...');
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, media_url, media_urls')
      .or('media_url.not.is.null,media_urls.not.is.null');
      
    if (postsError) {
      throw new Error(`Error obteniendo posts: ${postsError.message}`);
    }
    
    console.log(`📝 Encontrados ${posts.length} posts para actualizar\n`);
    
    // 2. Procesar cada post
    let updated = 0;
    let errors = 0;
    
    for (const post of posts) {
      try {
        let mediaUrl = post.media_url;
        let mediaUrls = post.media_urls;
        let hasChanges = false;
        
        // Convertir media_url si contiene URL de R2
        if (mediaUrl && mediaUrl.includes('r2.dev')) {
          const fileName = mediaUrl.split('/').pop();
          const supabaseUrl = `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/media/${fileName}`;
          mediaUrl = supabaseUrl;
          hasChanges = true;
          console.log(`🔄 Actualizando media_url: ${fileName}`);
        }
        
        // Convertir media_urls si contiene URLs de R2
        if (mediaUrls && Array.isArray(mediaUrls)) {
          const originalUrls = [...mediaUrls];
          mediaUrls = mediaUrls.map(url => {
            if (url.includes('r2.dev')) {
              const fileName = url.split('/').pop();
              const supabaseUrl = `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/media/${fileName}`;
              console.log(`🔄 Actualizando URL en media_urls: ${fileName}`);
              return supabaseUrl;
            }
            return url;
          });
          
          if (JSON.stringify(originalUrls) !== JSON.stringify(mediaUrls)) {
            hasChanges = true;
          }
        }
        
        // Actualizar en la base de datos solo si hay cambios
        if (hasChanges) {
          const { error: updateError } = await supabase
            .from('posts')
            .update({
              media_url: mediaUrl,
              media_urls: mediaUrls
            })
            .eq('id', post.id);
            
          if (updateError) {
            throw new Error(`Error actualizando post ${post.id}: ${updateError.message}`);
          }
          
          updated++;
          console.log(`✅ Actualizado post ${post.id}`);
        }
        
      } catch (error) {
        console.error(`❌ Error actualizando post ${post.id}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n🎉 Actualización completada:`);
    console.log(`   ✅ Actualizados: ${updated}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📊 Total revisados: ${posts.length}`);
    
    // 3. Verificar URLs actualizadas
    console.log('\n🔍 Verificando URLs actualizadas...');
    const { data: verifyPosts } = await supabase
      .from('posts')
      .select('media_url, media_urls')
      .not('media_url', 'is', null)
      .limit(5);
      
    if (verifyPosts) {
      console.log('📝 Ejemplo de URLs actualizadas:');
      verifyPosts.forEach((post, index) => {
        console.log(`   ${index + 1}. media_url: ${post.media_url}`);
        if (post.media_urls) {
          post.media_urls.forEach((url, urlIndex) => {
            console.log(`      media_urls[${urlIndex}]: ${url}`);
          });
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error en actualización:', error.message);
  }
}

// Ejecutar actualización
updateVideoUrls();
