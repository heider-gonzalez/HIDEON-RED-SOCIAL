import { supabase } from "@/integrations/supabase/client";
import { uploadToSupabase } from "@/lib/storage/cloudflare-r2";

interface BatchMigrationConfig {
  batchSize: number;
  maxConsecutiveErrors: number;
  delayBetweenBatches: number; // ms
}

interface MigrationResult {
  total: number;
  migrated: number;
  errors: number;
  consecutiveErrors: number;
  stoppedEarly: boolean;
}

/**
 * Migración completa en lotes con control de errores
 */
export async function migrateAllInBatches(config: BatchMigrationConfig = {
  batchSize: 10,
  maxConsecutiveErrors: 3,
  delayBetweenBatches: 1000
}) {
  console.log('=== INICIANDO MIGRACIÓN COMPLETA EN LOTES ===');
  console.log('Config:', config);
  
  const results = {
    profiles: await migrateProfilesInBatches(config),
    posts: await migratePostsInBatches(config),
    projectShowcases: await migrateProjectShowcasesInBatches(config)
  };
  
  console.log('\n=== RESUMEN COMPLETO DE MIGRACIÓN ===');
  console.log('Perfiles:', results.profiles);
  console.log('Posts:', results.posts);
  console.log('Project Showcases:', results.projectShowcases);
  console.log('Mensajes: OMITIDO (tabla no tiene media_url)');
  
  const totalMigrated = results.profiles.migrated + results.posts.migrated + results.projectShowcases.migrated;
  const totalErrors = results.profiles.errors + results.posts.errors + results.projectShowcases.errors;
  
  console.log(`\nTOTAL: ${totalMigrated} migrados, ${totalErrors} errores`);
  
  return results;
}

/**
 * Migrar perfiles en lotes
 */
async function migrateProfilesInBatches(config: BatchMigrationConfig): Promise<MigrationResult> {
  console.log('\n=== MIGRANDO PERFILES ===');
  
  let offset = 0;
  let consecutiveErrors = 0;
  let totalMigrated = 0;
  let totalErrors = 0;
  let stoppedEarly = false;
  
  while (true) {
    try {
      // Obtener lote de perfiles
      const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id, avatar_url, cover_url')
        .or('avatar_url.ilike.%supabase%,cover_url.ilike.%supabase%')
        .range(offset, offset + config.batchSize - 1);

      if (fetchError) {
        console.error(`Error fetching profiles batch ${offset}:`, fetchError);
        consecutiveErrors++;
        totalErrors++;
        
        if (consecutiveErrors >= config.maxConsecutiveErrors) {
          console.log('Deteniendo migración por demasiados errores consecutivos');
          stoppedEarly = true;
          break;
        }
        
        offset += config.batchSize;
        continue;
      }

      if (!profiles || profiles.length === 0) {
        console.log('No hay más perfiles para migrar');
        break;
      }

      console.log(`Procesando lote de ${profiles.length} perfiles (offset: ${offset})`);

      // Procesar cada perfil en el lote
      for (const profile of profiles as any[]) {
        try {
          const fields: Array<'avatar_url' | 'cover_url'> = ['avatar_url', 'cover_url'];
          let profileMigrated = false;

          for (const field of fields) {
            const currentUrl = (profile as any)[field] as string | null;
            if (!currentUrl || !currentUrl.includes('supabase')) continue;

            console.log(`Migrando ${field} del perfil ${profile.id}...`);

            // Descargar archivo
            const response = await fetch(currentUrl);
            if (!response.ok) {
              throw new Error(`Error descargando ${field}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const fileName = currentUrl.split('/').pop() || `${profile.id}_${field}`;
            const file = new File([blob], fileName, { type: blob.type });

            // Subir a R2
            const newPath = `profiles/${profile.id}/${field}/${fileName}`;
            const newUrl = await uploadToSupabase(file, newPath, { allowFallback: false });

            // Actualizar en base de datos
            const { error: updateError } = await (supabase as any)
              .from('profiles')
              .update({ 
                [field]: newUrl, 
                updated_at: new Date().toISOString() 
              })
              .eq('id', profile.id);

            if (updateError) {
              throw new Error(`Error actualizando ${field}: ${updateError.message}`);
            }

            console.log(`  ${field} migrado: ${currentUrl.substring(0, 50)}... -> ${newUrl.substring(0, 50)}...`);
            profileMigrated = true;
          }

          if (profileMigrated) {
            totalMigrated++;
            consecutiveErrors = 0; // Reset consecutive errors on success
          }

        } catch (error) {
          console.error(`Error migrando perfil ${profile.id}:`, error);
          totalErrors++;
          consecutiveErrors++;
          
          if (consecutiveErrors >= config.maxConsecutiveErrors) {
            console.log('Deteniendo migración por demasiados errores consecutivos');
            stoppedEarly = true;
            break;
          }
        }
      }

      if (stoppedEarly) break;

      offset += config.batchSize;
      
      // Delay entre lotes
      if (config.delayBetweenBatches > 0) {
        console.log(`Esperando ${config.delayBetweenBatches}ms antes del siguiente lote...`);
        await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches));
      }

    } catch (error) {
      console.error(`Error en lote de perfiles ${offset}:`, error);
      totalErrors++;
      consecutiveErrors++;
      
      if (consecutiveErrors >= config.maxConsecutiveErrors) {
        console.log('Deteniendo migración por demasiados errores consecutivos');
        stoppedEarly = true;
        break;
      }
      
      offset += config.batchSize;
    }
  }

  return {
    total: offset,
    migrated: totalMigrated,
    errors: totalErrors,
    consecutiveErrors,
    stoppedEarly
  };
}

/**
 * Migrar posts en lotes
 */
async function migratePostsInBatches(config: BatchMigrationConfig): Promise<MigrationResult> {
  console.log('\n=== MIGRANDO POSTS ===');
  
  let offset = 0;
  let consecutiveErrors = 0;
  let totalMigrated = 0;
  let totalErrors = 0;
  let stoppedEarly = false;
  
  while (true) {
    try {
      // Obtener lote de posts - DOS QUERIES SEPARADAS para evitar error PGRST100
      const [mediaUrlResult, mediaUrlsResult] = await Promise.all([
        supabase
          .from('posts')
          .select('id, media_url, media_urls, user_id')
          .like('media_url', '%supabase%')
          .range(offset, offset + config.batchSize - 1),
        supabase
          .from('posts')
          .select('id, media_url, media_urls, user_id')
          .filter('media_urls', 'cs', '{"http"}') // Buscar arrays que contengan URLs
          .range(offset, offset + config.batchSize - 1)
      ]);

      // Combinar resultados y deduplicar por ID
      const allPosts = new Map();
      
      if (!mediaUrlResult.error && mediaUrlResult.data) {
        (mediaUrlResult.data as any[]).forEach(post => {
          allPosts.set(post.id, post);
        });
      }
      
      if (!mediaUrlsResult.error && mediaUrlsResult.data) {
        (mediaUrlsResult.data as any[]).forEach(post => {
          // Solo agregar si no existe y tiene media_urls con supabase
          if (!allPosts.has(post.id) && post.media_urls) {
            const hasSupabaseUrls = post.media_urls.some((url: string) => url.includes('supabase'));
            if (hasSupabaseUrls) {
              allPosts.set(post.id, post);
            }
          }
        });
      }

      const posts = Array.from(allPosts.values());
      const fetchError = mediaUrlResult.error || mediaUrlsResult.error;

      if (fetchError) {
        console.error(`Error fetching posts batch ${offset}:`, fetchError);
        consecutiveErrors++;
        totalErrors++;
        
        if (consecutiveErrors >= config.maxConsecutiveErrors) {
          console.log('Deteniendo migración por demasiados errores consecutivos');
          stoppedEarly = true;
          break;
        }
        
        offset += config.batchSize;
        continue;
      }

      if (!posts || posts.length === 0) {
        console.log('No hay más posts para migrar');
        break;
      }

      console.log(`Procesando lote de ${posts.length} posts (offset: ${offset})`);

      // Procesar cada post en el lote
      for (const post of posts as any[]) {
        try {
          let postMigrated = false;
          let newMediaUrl = post.media_url;
          let newMediaUrls = post.media_urls;

          // Migrar media_url principal
          if (post.media_url && post.media_url.includes('supabase')) {
            console.log(`Migrando media_url del post ${post.id}...`);

            const response = await fetch(post.media_url);
            if (!response.ok) {
              throw new Error(`Error descargando media_url: ${response.statusText}`);
            }

            const blob = await response.blob();
            const fileName = post.media_url.split('/').pop() || `migrated_${post.id}`;
            const file = new File([blob], fileName, { type: blob.type });

            newMediaUrl = await uploadToSupabase(file, `posts/${post.user_id}/${fileName}`, { allowFallback: false });
            postMigrated = true;
          }

          // Migrar array de media_urls
          if (Array.isArray(post.media_urls) && post.media_urls.length > 0) {
            const migrated: string[] = [];
            
            for (const url of post.media_urls) {
              if (!url || !url.includes('supabase')) {
                migrated.push(url);
                continue;
              }

              console.log(`Migrando media_url del post ${post.id} (array)...`);

              const response = await fetch(url);
              if (!response.ok) {
                console.warn(`No se pudo descargar ${url}, manteniendo original`);
                migrated.push(url);
                continue;
              }

              const blob = await response.blob();
              const fileName = url.split('/').pop() || `migrated_${post.id}_${Date.now()}`;
              const file = new File([blob], fileName, { type: blob.type });

              const newUrl = await uploadToSupabase(file, `posts/${post.user_id}/${fileName}`, { allowFallback: false });
              migrated.push(newUrl);
              postMigrated = true;
            }
            
            newMediaUrls = migrated;
          }

          // Actualizar en base de datos si algo cambió
          if (postMigrated) {
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

            console.log(`  Post ${post.id} migrado exitosamente`);
            totalMigrated++;
            consecutiveErrors = 0;
          }

        } catch (error) {
          console.error(`Error migrando post ${post.id}:`, error);
          totalErrors++;
          consecutiveErrors++;
          
          if (consecutiveErrors >= config.maxConsecutiveErrors) {
            console.log('Deteniendo migración por demasiados errores consecutivos');
            stoppedEarly = true;
            break;
          }
        }
      }

      if (stoppedEarly) break;

      offset += config.batchSize;
      
      // Delay entre lotes
      if (config.delayBetweenBatches > 0) {
        console.log(`Esperando ${config.delayBetweenBatches}ms antes del siguiente lote...`);
        await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches));
      }

    } catch (error) {
      console.error(`Error en lote de posts ${offset}:`, error);
      totalErrors++;
      consecutiveErrors++;
      
      if (consecutiveErrors >= config.maxConsecutiveErrors) {
        console.log('Deteniendo migración por demasiados errores consecutivos');
        stoppedEarly = true;
        break;
      }
      
      offset += config.batchSize;
    }
  }

  return {
    total: offset,
    migrated: totalMigrated,
    errors: totalErrors,
    consecutiveErrors,
    stoppedEarly
  };
}

/**
 * Migrar mensajes en lotes
 */
async function migrateMessagesInBatches(config: BatchMigrationConfig): Promise<MigrationResult> {
  console.log('\n=== MIGRANDO MENSAJES ===');
  
  let offset = 0;
  let consecutiveErrors = 0;
  let totalMigrated = 0;
  let totalErrors = 0;
  let stoppedEarly = false;
  
  while (true) {
    try {
      // NOTA: Basado en el schema, la tabla es 'mensajes' y el campo es 'id_autor'
      // Primero verificamos si existe la columna media_url en la tabla mensajes
      const { data: tableInfo, error: tableError } = await supabase
        .from('mensajes')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.log('La tabla mensajes no existe o no es accesible, omitiendo migración de mensajes');
        console.log('Error:', tableError);
        break;
      }
      
      // Intentar obtener mensajes con media_url (si la columna existe)
      let messages: any[] = [];
      let fetchError: any = null;
      
      try {
        const { data, error } = await supabase
          .from('mensajes')
          .select('id, media_url, id_autor')
          .like('media_url', '%supabase%')
          .range(offset, offset + config.batchSize - 1);
        
        messages = data || [];
        fetchError = error;
      } catch (err) {
        console.log('La columna media_url no existe en la tabla mensajes');
        fetchError = err;
      }

      if (fetchError) {
        console.error(`Error fetching messages batch ${offset}:`, fetchError);
        consecutiveErrors++;
        totalErrors++;
        
        if (consecutiveErrors >= config.maxConsecutiveErrors) {
          console.log('Deteniendo migración por demasiados errores consecutivos');
          stoppedEarly = true;
          break;
        }
        
        offset += config.batchSize;
        continue;
      }

      if (!messages || messages.length === 0) {
        console.log('No hay más mensajes para migrar');
        break;
      }

      console.log(`Procesando lote de ${messages.length} mensajes (offset: ${offset})`);

      // Procesar cada mensaje en el lote
      for (const message of messages as any[]) {
        try {
          if (!message.media_url || !message.media_url.includes('supabase')) continue;

          console.log(`Migrando media_url del mensaje ${message.id}...`);

          // Descargar archivo
          const response = await fetch(message.media_url);
          if (!response.ok) {
            throw new Error(`Error descargando media_url: ${response.statusText}`);
          }

          const blob = await response.blob();
          const fileName = message.media_url.split('/').pop() || `migrated_${message.id}`;
          const file = new File([blob], fileName, { type: blob.type });

          // Subir a R2 - usar id_autor en lugar de sender_id
          const newUrl = await uploadToSupabase(file, `messages/${message.id_autor}/${fileName}`, { allowFallback: false });

          // Actualizar en base de datos - usar tabla mensajes
          const { error: updateError } = await (supabase as any)
            .from('mensajes')
            .update({ 
              media_url: newUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', message.id);

          if (updateError) {
            throw new Error(`Error actualizando mensaje: ${updateError.message}`);
          }

          console.log(`  Mensaje ${message.id} migrado exitosamente`);
          totalMigrated++;
          consecutiveErrors = 0;

        } catch (error) {
          console.error(`Error migrando mensaje ${message.id}:`, error);
          totalErrors++;
          consecutiveErrors++;
          
          if (consecutiveErrors >= config.maxConsecutiveErrors) {
            console.log('Deteniendo migración por demasiados errores consecutivos');
            stoppedEarly = true;
            break;
          }
        }
      }

      if (stoppedEarly) break;

      offset += config.batchSize;
      
      // Delay entre lotes
      if (config.delayBetweenBatches > 0) {
        console.log(`Esperando ${config.delayBetweenBatches}ms antes del siguiente lote...`);
        await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches));
      }

    } catch (error) {
      console.error(`Error en lote de mensajes ${offset}:`, error);
      totalErrors++;
      consecutiveErrors++;
      
      if (consecutiveErrors >= config.maxConsecutiveErrors) {
        console.log('Deteniendo migración por demasiados errores consecutivos');
        stoppedEarly = true;
        break;
      }
      
      offset += config.batchSize;
    }
  }

  return {
    total: offset,
    migrated: totalMigrated,
    errors: totalErrors,
    consecutiveErrors,
    stoppedEarly
  };
}

/**
 * Migrar project showcases en lotes
 */
async function migrateProjectShowcasesInBatches(config: BatchMigrationConfig): Promise<MigrationResult> {
  console.log('\n=== MIGRANDO PROJECT SHOWCASES ===');
  
  let offset = 0;
  let consecutiveErrors = 0;
  let totalMigrated = 0;
  let totalErrors = 0;
  let stoppedEarly = false;
  
  while (true) {
    try {
      // Obtener lote de project showcases con URLs de imágenes
      const { data: showcases, error: fetchError } = await supabase
        .from('project_showcases')
        .select('id, images_urls, github_url, demo_url, project_url')
        .like('images_urls', '%supabase%')
        .range(offset, offset + config.batchSize - 1);

      if (fetchError) {
        console.error(`Error fetching project showcases batch ${offset}:`, fetchError);
        consecutiveErrors++;
        totalErrors++;
        
        if (consecutiveErrors >= config.maxConsecutiveErrors) {
          console.log('Deteniendo migración por demasiados errores consecutivos');
          stoppedEarly = true;
          break;
        }
        
        offset += config.batchSize;
        continue;
      }

      if (!showcases || showcases.length === 0) {
        console.log('No hay más project showcases para migrar');
        break;
      }

      console.log(`Procesando lote de ${showcases.length} project showcases (offset: ${offset})`);

      // Procesar cada showcase en el lote
      for (const showcase of showcases as any[]) {
        try {
          let showcaseMigrated = false;
          let newImagesUrls: string[] = [];

          // Migrar array de imágenes
          if (showcase.images_urls && Array.isArray(showcase.images_urls)) {
            for (const imageUrl of showcase.images_urls) {
              if (!imageUrl || !imageUrl.includes('supabase')) {
                newImagesUrls.push(imageUrl);
                continue;
              }

              console.log(`Migrando imagen del showcase ${showcase.id}...`);

              try {
                const response = await fetch(imageUrl);
                if (!response.ok) {
                  console.warn(`No se pudo descargar ${imageUrl}, manteniendo original`);
                  newImagesUrls.push(imageUrl);
                  continue;
                }

                const blob = await response.blob();
                const fileName = imageUrl.split('/').pop() || `showcase_${showcase.id}_${Date.now()}`;
                const file = new File([blob], fileName, { type: blob.type });

                const newUrl = await uploadToSupabase(file, `project-showcases/${showcase.id}/${fileName}`, { allowFallback: false });
                newImagesUrls.push(newUrl);
                showcaseMigrated = true;
              } catch (error) {
                console.warn(`Error migrando imagen ${imageUrl}:`, error);
                newImagesUrls.push(imageUrl);
              }
            }
          }

          // Actualizar en base de datos si algo cambió
          if (showcaseMigrated) {
            const { error: updateError } = await (supabase as any)
              .from('project_showcases')
              .update({ 
                images_urls: newImagesUrls,
                updated_at: new Date().toISOString()
              })
              .eq('id', showcase.id);

            if (updateError) {
              throw new Error(`Error actualizando project showcase: ${updateError.message}`);
            }

            console.log(`  Project showcase ${showcase.id} migrado exitosamente`);
            totalMigrated++;
            consecutiveErrors = 0;
          }

        } catch (error) {
          console.error(`Error migrando project showcase ${showcase.id}:`, error);
          totalErrors++;
          consecutiveErrors++;
          
          if (consecutiveErrors >= config.maxConsecutiveErrors) {
            console.log('Deteniendo migración por demasiados errores consecutivos');
            stoppedEarly = true;
            break;
          }
        }
      }

      if (stoppedEarly) break;

      offset += config.batchSize;
      
      // Delay entre lotes
      if (config.delayBetweenBatches > 0) {
        console.log(`Esperando ${config.delayBetweenBatches}ms antes del siguiente lote...`);
        await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches));
      }

    } catch (error) {
      console.error(`Error en lote de project showcases ${offset}:`, error);
      totalErrors++;
      consecutiveErrors++;
      
      if (consecutiveErrors >= config.maxConsecutiveErrors) {
        console.log('Deteniendo migración por demasiados errores consecutivos');
        stoppedEarly = true;
        break;
      }
      
      offset += config.batchSize;
    }
  }

  return {
    total: offset,
    migrated: totalMigrated,
    errors: totalErrors,
    consecutiveErrors,
    stoppedEarly
  };
}

/**
 * Migrar solo posts (saltar perfiles y mensajes)
 */
export async function migratePostsOnly(config: BatchMigrationConfig = {
  batchSize: 10,
  maxConsecutiveErrors: 3,
  delayBetweenBatches: 1000
}) {
  console.log('=== INICIANDO MIGRACIÓN POSTS (SIN PERFILES) ===');
  console.log('Config:', config);
  
  const result = await migratePostsInBatches(config);
  
  console.log('\n=== RESUMEN MIGRACIÓN POSTS ===');
  console.log('Posts:', result);
  console.log('Mensajes: OMITIDO (tabla no tiene media_url)');
  console.log('Project Showcases: OMITIDO (solo en migración completa)');
  
  console.log(`\nTOTAL: ${result.migrated} migrados, ${result.errors} errores`);
  
  return result;
}

// Función global para ejecución manual
(window as any).migrateAllInBatches = migrateAllInBatches;
(window as any).migratePostsOnly = migratePostsOnly;
