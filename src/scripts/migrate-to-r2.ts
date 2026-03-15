
import { supabase } from "@/integrations/supabase/client";
import { uploadToSupabase } from "@/lib/storage/cloudflare-r2";

interface PostToMigrate {
  id: string;
  media_url: string;
  media_urls?: string[] | null;
  user_id: string;
}

export async function migrateExistingFiles() {
  console.log('🚀 Iniciando migración de archivos a Cloudflare R2...');
  
  try {
    // Obtener todos los posts con media_url de Supabase Storage
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, media_url, media_urls, user_id')
      .not('media_url', 'is', null)
      .like('media_url', '%supabase%');

    if (error) {
      console.error('❌ Error obteniendo posts:', error);
      throw error;
    }

    console.log(`📋 Encontrados ${posts?.length || 0} posts con archivos de Supabase Storage`);

    if (!posts || posts.length === 0) {
      console.log('✅ No hay archivos para migrar');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    // Migrar cada archivo
    for (const post of posts as PostToMigrate[]) {
      try {
        console.log(`📁 Migrando archivo del post ${post.id}...`);
        
        // Descargar el archivo desde Supabase Storage
        const response = await fetch(post.media_url);
        if (!response.ok) {
          throw new Error(`Error descargando archivo: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const fileName = post.media_url.split('/').pop() || `migrated_${post.id}`;
        const file = new File([blob], fileName, { type: blob.type });
        
        // Subir a Supabase Storage
        const newUrl = await uploadToSupabase(file, `${post.user_id}/${fileName}`, { allowFallback: false });

        let newUrls: string[] | null | undefined = post.media_urls;
        if (Array.isArray(post.media_urls) && post.media_urls.length > 0) {
          const migrated: string[] = [];
          for (const u of post.media_urls) {
            try {
              if (!u || !String(u).includes('supabase')) {
                migrated.push(u);
                continue;
              }
              const r = await fetch(u);
              if (!r.ok) {
                migrated.push(u);
                continue;
              }
              const b = await r.blob();
              const n = String(u).split('/').pop() || `migrated_${post.id}`;
              const f = new File([b], n, { type: b.type });
              const mUrl = await uploadToSupabase(f, `${post.user_id}/${n}`, { allowFallback: false });
              migrated.push(mUrl);
            } catch {
              migrated.push(u);
            }
          }
          newUrls = migrated;
        }
        
        // Actualizar la URL en la base de datos
        const { error: updateError } = await (supabase as any)
          .from('posts')
          .update({ media_url: newUrl, media_urls: newUrls })
          .eq('id', post.id);
          
        if (updateError) {
          throw new Error(`Error actualizando post: ${updateError.message}`);
        }
        
        console.log(`✅ Post ${post.id} migrado exitosamente`);
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Error migrando post ${post.id}:`, error);
        errorCount++;
      }
    }

    console.log(`🎉 Migración completada:`);
    console.log(`   ✅ Archivos migrados: ${migratedCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    
    return {
      total: posts.length,
      migrated: migratedCount,
      errors: errorCount
    };

  } catch (error) {
    console.error('💥 Error en migración:', error);
    throw error;
  }
}

// Función para verificar el estado de la migración
export async function checkMigrationStatus() {
  try {
    const { data: supabasePosts, error: supabaseError } = await supabase
      .from('posts')
      .select('id')
      .not('media_url', 'is', null)
      .like('media_url', '%supabase%');

    const { data: r2Posts, error: r2Error } = await supabase
      .from('posts')
      .select('id')
      .not('media_url', 'is', null)
      .not('media_url', 'ilike', '%supabase%');

    if (supabaseError || r2Error) {
      throw new Error('Error verificando estado de migración');
    }

    return {
      remainingInSupabase: supabasePosts?.length || 0,
      migratedToR2: r2Posts?.length || 0
    };
  } catch (error) {
    console.error('Error verificando estado:', error);
    throw error;
  }
}

// Funciones para migrar avatares y covers de perfiles a R2
export async function migrateProfileImagesToR2() {
  console.log('🚀 Iniciando migración de avatares y covers a Cloudflare R2...');

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, avatar_url, cover_url')
      .or('avatar_url.ilike.%supabase%,cover_url.ilike.%supabase%');

    if (error) {
      console.error('❌ Error obteniendo perfiles:', error);
      throw error;
    }

    console.log(`📋 Encontrados ${profiles?.length || 0} perfiles con imágenes en Supabase Storage`);

    if (!profiles || profiles.length === 0) {
      console.log('✅ No hay imágenes de perfil para migrar');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    for (const profile of profiles as any[]) {
      const fields: Array<'avatar_url' | 'cover_url'> = ['avatar_url', 'cover_url'];

      for (const field of fields) {
        try {
          const currentUrl = (profile as any)[field] as string | null;
          if (!currentUrl || !currentUrl.includes('supabase')) continue;

          console.log(`📁 Migrando ${field} del perfil ${profile.id}...`);

          const response = await fetch(currentUrl);
          if (!response.ok) {
            throw new Error(`Error descargando archivo: ${response.statusText}`);
          }

          const blob = await response.blob();
          const fileName = currentUrl.split('/').pop() || `${profile.id}_${field}`;
          const file = new File([blob], fileName, { type: blob.type });

          const newPath = `profiles/${profile.id}/${field}/${fileName}`;
          const newUrl = await uploadToSupabase(file, newPath, { allowFallback: false });

          const { error: updateError } = await (supabase as any)
            .from('profiles')
            .update({ [field]: newUrl, updated_at: new Date().toISOString() })
            .eq('id', profile.id);

          if (updateError) {
            throw new Error(`Error actualizando perfil: ${updateError.message}`);
          }

          console.log(`✅ ${field} del perfil ${profile.id} migrado`);
          migratedCount++;
        } catch (err) {
          console.error(`❌ Error migrando ${field} del perfil ${profile.id}:`, err);
          errorCount++;
        }
      }
    }

    console.log('🎉 Migración de perfiles completada:');
    console.log(`   ✅ Archivos migrados: ${migratedCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);

    return {
      migrated: migratedCount,
      errors: errorCount
    };
  } catch (error) {
    console.error('💥 Error en migración de perfiles:', error);
    throw error;
  }
}

export async function checkProfileMigrationStatus() {
  try {
    const { data: remaining, error: remainingError } = await supabase
      .from('profiles')
      .select('id')
      .or('avatar_url.ilike.%supabase%,cover_url.ilike.%supabase%');

    const { data: migrated, error: migratedError } = await supabase
      .from('profiles')
      .select('id')
      .or('avatar_url.ilike.%r2.dev%,cover_url.ilike.%r2.dev%');

    if (remainingError || migratedError) {
      throw new Error('Error verificando estado de migración de perfiles');
    }

    return {
      remainingInSupabase: remaining?.length || 0,
      migratedToR2: migrated?.length || 0
    };
  } catch (error) {
    console.error('Error verificando estado (perfiles):', error);
    throw error;
  }
}

// Función para ejecutar la migración manualmente desde la consola del navegador
(window as any).migrateToR2 = migrateExistingFiles;
(window as any).checkR2MigrationStatus = checkMigrationStatus;
(window as any).migrateProfileImagesToR2 = migrateProfileImagesToR2;
(window as any).checkProfileMigrationStatus = checkProfileMigrationStatus;
