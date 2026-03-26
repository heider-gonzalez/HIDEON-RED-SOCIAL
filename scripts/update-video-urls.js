import { createClient } from '@supabase/supabase-js';

// Configuración
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_ROLE_KEY son requeridos');
  console.log('📝 Crea un archivo .env basado en .env.example');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para actualizar URLs de videos en la base de datos
async function updateVideoUrls() {
  console.log('🔄 Actualizando URLs de videos en la base de datos...');
  
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
    
    console.log(`📝 Encontrados ${posts.length} posts para actualizar`);
    
    // 2. Procesar cada post
    let updated = 0;
    let errors = 0;
    
    for (const post of posts) {
      try {
        let mediaUrl = post.media_url;
        let mediaUrls = post.media_urls;
        
        // Convertir media_url si contiene URL de R2
        if (mediaUrl && mediaUrl.includes('r2.dev')) {
          const fileName = mediaUrl.split('/').pop();
          const supabaseUrl = `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/media/${fileName}`;
          mediaUrl = supabaseUrl;
          console.log(`🔄 Actualizando media_url: ${fileName}`);
        }
        
        // Convertir media_urls si contiene URLs de R2
        if (mediaUrls && Array.isArray(mediaUrls)) {
          mediaUrls = mediaUrls.map(url => {
            if (url.includes('r2.dev')) {
              const fileName = url.split('/').pop();
              const supabaseUrl = `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/media/${fileName}`;
              console.log(`🔄 Actualizando URL en media_urls: ${fileName}`);
              return supabaseUrl;
            }
            return url;
          });
        }
        
        // Actualizar en la base de datos
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
        
      } catch (error) {
        console.error(`❌ Error actualizando post ${post.id}:`, error);
        errors++;
      }
    }
    
    console.log(`🎉 Actualización completada:`);
    console.log(`   ✅ Actualizados: ${updated}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📊 Total: ${posts.length}`);
    
    // 3. Verificar URLs actualizadas
    console.log('\n🔍 Verificando URLs actualizadas...');
    const { data: verifyPosts } = await supabase
      .from('posts')
      .select('media_url, media_urls')
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
    console.error('❌ Error en actualización:', error);
  }
}

// Ejecutar actualización
updateVideoUrls();
