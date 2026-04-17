import { supabase } from "@/integrations/supabase/client";

interface PostToRevert {
  id: string;
  media_url: string | null;
  media_urls: string[] | null;
  user_id: string;
}

interface ProfileToRevert {
  id: string;
  avatar_url: string | null;
  cover_url: string | null;
}

/**
 * Función de ROLLBACK para revertir URLs de R2 a Supabase Storage
 * NO borra archivos de R2, solo actualiza las URLs en la base de datos
 */
export async function revertPostsToSupabase() {
  console.log('🔄 Iniciando ROLLBACK de posts a Supabase Storage...');
  
  try {
    // Obtener todos los posts con URLs de R2
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, media_url, media_urls, user_id')
      .or('media_url.ilike.%r2.dev%,media_urls.cs.{array}.ilike.%r2.dev%');

    if (error) {
      console.error('❌ Error obteniendo posts para revertir:', error);
      throw error;
    }

    console.log(`📋 Encontrados ${posts?.length || 0} posts con URLs de R2`);

    if (!posts || posts.length === 0) {
      console.log('✅ No hay posts para revertir');
      return { reverted: 0, errors: 0 };
    }

    let revertedCount = 0;
    let errorCount = 0;

    for (const post of posts as PostToRevert[]) {
      try {
        console.log(`🔄 Revirtiendo post ${post.id}...`);
        
        let newMediaUrl = post.media_url;
        let newMediaUrls = post.media_urls;

        // Convertir R2 URLs a Supabase URLs
        if (post.media_url && post.media_url.includes('r2.dev')) {
          const fileName = post.media_url.split('/').pop();
          const userId = post.user_id;
          newMediaUrl = `https://carlosgonzalezing.supabase.co/storage/v1/object/public/posts/${userId}/${fileName}`;
        }

        // Convertir array de media_urls
        if (Array.isArray(post.media_urls)) {
          newMediaUrls = post.media_urls.map(url => {
            if (url.includes('r2.dev')) {
              const fileName = url.split('/').pop();
              const userId = post.user_id;
              return `https://carlosgonzalezing.supabase.co/storage/v1/object/public/posts/${userId}/${fileName}`;
            }
            return url;
          });
        }

        // Actualizar la URL en la base de datos
        const { error: updateError } = await (supabase as any)
          .from('posts')
          .update({ 
            media_url: newMediaUrl, 
            media_urls: newMediaUrls,
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id);
          
        if (updateError) {
          throw new Error(`Error actualizando post: ${updateError.message}`);
        }
        
        console.log(`✅ Post ${post.id} revertido a Supabase`);
        revertedCount++;
        
      } catch (error) {
        console.error(`❌ Error revirtiendo post ${post.id}:`, error);
        errorCount++;
      }
    }

    console.log('🎉 ROLLBACK de posts completado:');
    console.log(`   ✅ Posts revertidos: ${revertedCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    
    return {
      total: posts.length,
      reverted: revertedCount,
      errors: errorCount
    };

  } catch (error) {
    console.error('💥 Error en ROLLBACK de posts:', error);
    throw error;
  }
}

/**
 * Función de ROLLBACK para perfiles
 */
export async function revertProfilesToSupabase() {
  console.log('🔄 Iniciando ROLLBACK de perfiles a Supabase Storage...');

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, avatar_url, cover_url')
      .or('avatar_url.ilike.%r2.dev%,cover_url.ilike.%r2.dev%');

    if (error) {
      console.error('❌ Error obteniendo perfiles para revertir:', error);
      throw error;
    }

    console.log(`📋 Encontrados ${profiles?.length || 0} perfiles con URLs de R2`);

    if (!profiles || profiles.length === 0) {
      console.log('✅ No hay perfiles para revertir');
      return { reverted: 0, errors: 0 };
    }

    let revertedCount = 0;
    let errorCount = 0;

    for (const profile of profiles as ProfileToRevert[]) {
      const fields: Array<'avatar_url' | 'cover_url'> = ['avatar_url', 'cover_url'];

      for (const field of fields) {
        try {
          const currentUrl = (profile as any)[field] as string | null;
          if (!currentUrl || !currentUrl.includes('r2.dev')) continue;

          console.log(`🔄 Revirtiendo ${field} del perfil ${profile.id}...`);

          const fileName = currentUrl.split('/').pop();
          const newUrl = `https://carlosgonzalezing.supabase.co/storage/v1/object/public/${field}s/${profile.id}/${fileName}`;

          const { error: updateError } = await (supabase as any)
            .from('profiles')
            .update({ 
              [field]: newUrl, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', profile.id);

          if (updateError) {
            throw new Error(`Error actualizando perfil: ${updateError.message}`);
          }

          console.log(`✅ ${field} del perfil ${profile.id} revertido`);
          revertedCount++;
        } catch (err) {
          console.error(`❌ Error revirtiendo ${field} del perfil ${profile.id}:`, err);
          errorCount++;
        }
      }
    }

    console.log('🎉 ROLLBACK de perfiles completado:');
    console.log(`   ✅ Campos revertidos: ${revertedCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);

    return {
      reverted: revertedCount,
      errors: errorCount
    };
  } catch (error) {
    console.error('💥 Error en ROLLBACK de perfiles:', error);
    throw error;
  }
}

/**
 * Función principal de ROLLBACK completo
 */
export async function revertAllToSupabase() {
  console.log('🚀 Iniciando ROLLBACK COMPLETO a Supabase Storage...');
  
  try {
    const postsResult = await revertPostsToSupabase();
    const profilesResult = await revertProfilesToSupabase();
    
    const totalReverted = postsResult.reverted + profilesResult.reverted;
    const totalErrors = postsResult.errors + profilesResult.errors;
    
    console.log('\n🎊 ROLLBACK COMPLETO finalizado:');
    console.log(`   📊 Posts revertidos: ${postsResult.reverted}/${postsResult.total}`);
    console.log(`   👤 Perfiles revertidos: ${profilesResult.reverted}`);
    console.log(`   ✅ Total campos revertidos: ${totalReverted}`);
    console.log(`   ❌ Total errores: ${totalErrors}`);
    
    if (totalErrors === 0) {
      console.log('\n✅ Todos los archivos han sido revertidos a Supabase Storage exitosamente');
    } else {
      console.log(`\n⚠️  ROLLBACK completado con ${totalErrors} errores`);
    }
    
    return {
      posts: postsResult,
      profiles: profilesResult,
      totalReverted,
      totalErrors
    };
    
  } catch (error) {
    console.error('💥 Error en ROLLBACK completo:', error);
    throw error;
  }
}

/**
 * Verificar estado actual del ROLLBACK
 */
export async function checkRevertStatus() {
  try {
    const { data: supabasePosts, error: supabaseError } = await supabase
      .from('posts')
      .select('id')
      .like('media_url', '%supabase%');

    const { data: r2Posts, error: r2Error } = await supabase
      .from('posts')
      .select('id')
      .like('media_url', '%r2.dev%');

    const { data: supabaseProfiles, error: supabaseProfilesError } = await supabase
      .from('profiles')
      .select('id')
      .or('avatar_url.ilike.%supabase%,cover_url.ilike.%supabase%');

    const { data: r2Profiles, error: r2ProfilesError } = await supabase
      .from('profiles')
      .select('id')
      .or('avatar_url.ilike.%r2.dev%,cover_url.ilike.%r2.dev%');

    if (supabaseError || r2Error || supabaseProfilesError || r2ProfilesError) {
      throw new Error('Error verificando estado de ROLLBACK');
    }

    return {
      posts: {
        inSupabase: supabasePosts?.length || 0,
        inR2: r2Posts?.length || 0
      },
      profiles: {
        inSupabase: supabaseProfiles?.length || 0,
        inR2: r2Profiles?.length || 0
      }
    };
  } catch (error) {
    console.error('Error verificando estado de ROLLBACK:', error);
    throw error;
  }
}

// Funciones globales para ejecución manual
(window as any).revertPostsToSupabase = revertPostsToSupabase;
(window as any).revertProfilesToSupabase = revertProfilesToSupabase;
(window as any).revertAllToSupabase = revertAllToSupabase;
(window as any).checkRevertStatus = checkRevertStatus;
