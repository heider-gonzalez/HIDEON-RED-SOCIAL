import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Credenciales
const supabaseUrl = 'https://wgbbaxvuuinubkgffpiq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYmJheHZ1dWludWJrZ2ZmcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTgxNzg2OCwiZXhwIjoyMDU1MzkzODY4fQ.ntKJlyWN_GZAtQydt0gGnsEH7ivBV-s-IUPy67uijlo';
const r2AccountId = '137569df68ffc80cc0977391324e77fc';
const r2AccessKeyId = '7b281f30e5ddae13b1e572b74b3ea652';
const r2SecretAccessKey = 'e4c5249a16eaf9d23495afb556cb73b48a47c76e7d0cddc4016d33c207cbba74';

async function migrateAllRemainingMedia() {
  console.log('🚀 Migrando todo el contenido multimedia restante de R2 a Supabase...\n');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    });
    
    const bucketName = 'hideon-media';
    let totalMigrated = 0;
    let totalErrors = 0;
    
    // 1. Migrar imágenes de perfil (profiles)
    console.log('📸 Migrando imágenes de perfil...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, avatar_url, cover_url, intro_audio_url')
      .or('avatar_url.ilike.%r2.dev%,cover_url.ilike.%r2.dev%,intro_audio_url.ilike.%r2.dev%');
      
    if (!profilesError && profiles) {
      for (const profile of profiles) {
        const urlsToMigrate = [
          { field: 'avatar_url', url: profile.avatar_url },
          { field: 'cover_url', url: profile.cover_url },
          { field: 'intro_audio_url', url: profile.intro_audio_url }
        ].filter(item => item.url && item.url.includes('r2.dev'));
        
        for (const { field, url } of urlsToMigrate) {
          try {
            console.log(`⬇️ Descargando ${field} de profile ${profile.id}: ${url}`);
            
            // Extraer filename
            const fileName = url.split('/').pop();
            if (!fileName) continue;
            
            // Determinar el path correcto en R2
            let r2Key = url;
            if (url.includes('profiles/')) {
              r2Key = `profiles/${fileName}`;
            } else if (url.includes('media/profiles/')) {
              r2Key = `media/profiles/${fileName}`;
            } else if (url.includes('post-audio/')) {
              r2Key = `post-audio/${fileName}`;
            }
            
            // Descargar de R2
            const getCommand = new GetObjectCommand({
              Bucket: bucketName,
              Key: r2Key
            });
            
            const r2Response = await r2Client.send(getCommand);
            const fileBuffer = await r2Response.Body?.transformToByteArray();
            
            if (!fileBuffer) {
              throw new Error('No se pudo descargar el archivo');
            }
            
            // Determinar content type
            let contentType = 'image/jpeg';
            if (fileName.toLowerCase().endsWith('.png')) contentType = 'image/png';
            else if (fileName.toLowerCase().endsWith('.gif')) contentType = 'image/gif';
            else if (fileName.toLowerCase().endsWith('.webp')) contentType = 'image/webp';
            else if (fileName.toLowerCase().endsWith('.svg')) contentType = 'image/svg+xml';
            else if (fileName.toLowerCase().endsWith('.mp3')) contentType = 'audio/mpeg';
            else if (fileName.toLowerCase().endsWith('.wav')) contentType = 'audio/wav';
            else if (fileName.toLowerCase().endsWith('.m4a')) contentType = 'audio/mp4';
            
            // Subir a Supabase
            const { error } = await supabase.storage
              .from('media')
              .upload(fileName, fileBuffer, {
                contentType: contentType,
                upsert: true
              });
              
            if (error) {
              throw new Error(`Error subiendo a Supabase: ${error.message}`);
            }
            
            // Actualizar URL en la base de datos
            const supabaseUrl = `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/media/${fileName}`;
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ [field]: supabaseUrl })
              .eq('id', profile.id);
              
            if (updateError) {
              throw new Error(`Error actualizando base de datos: ${updateError.message}`);
            }
            
            console.log(`✅ Migrado ${field}: ${fileName}`);
            totalMigrated++;
            
          } catch (error) {
            console.error(`❌ Error migrando ${field}:`, error.message);
            totalErrors++;
          }
        }
      }
    }
    
    // 2. Migrar audios de posts
    console.log('\n🎵 Migrando audios de posts...');
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, audio_url')
      .ilike('audio_url', '%r2.dev%');
      
    if (!postsError && posts) {
      for (const post of posts) {
        try {
          console.log(`⬇️ Descargando audio de post ${post.id}: ${post.audio_url}`);
          
          const fileName = post.audio_url.split('/').pop();
          if (!fileName) continue;
          
          const r2Key = `post-audio/${fileName}`;
          
          // Descargar de R2
          const getCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: r2Key
          });
          
          const r2Response = await r2Client.send(getCommand);
          const audioBuffer = await r2Response.Body?.transformToByteArray();
          
          if (!audioBuffer) {
            throw new Error('No se pudo descargar el audio');
          }
          
          // Subir a Supabase
          const { error } = await supabase.storage
            .from('media')
            .upload(fileName, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true
            });
            
          if (error) {
            throw new Error(`Error subiendo a Supabase: ${error.message}`);
          }
          
          // Actualizar URL en la base de datos
          const supabaseUrl = `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/media/${fileName}`;
          const { error: updateError } = await supabase
            .from('posts')
            .update({ audio_url: supabaseUrl })
            .eq('id', post.id);
            
          if (updateError) {
            throw new Error(`Error actualizando base de datos: ${updateError.message}`);
          }
          
          console.log(`✅ Migrado audio: ${fileName}`);
          totalMigrated++;
          
        } catch (error) {
          console.error(`❌ Error migrando audio de post ${post.id}:`, error.message);
          totalErrors++;
        }
      }
    }
    
    // 3. Verificar si hay más archivos en R2 que no se han migrado
    console.log('\n🔍 Verificando archivos restantes en R2...');
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1000
    });
    
    const r2Response = await r2Client.send(listCommand);
    const allFiles = r2Response.Contents || [];
    
    console.log(`📊 Total archivos en R2: ${allFiles.length}`);
    
    // Filtrar archivos que ya sabemos que están en posts/media (ya migrados)
    const alreadyMigrated = allFiles.filter(obj => 
      obj.Key && (
        obj.Key.startsWith('media/') && 
        (obj.Key.endsWith('.mp4') || obj.Key.endsWith('.mov') || obj.Key.endsWith('.webm') ||
         obj.Key.endsWith('.jpg') || obj.Key.endsWith('.jpeg') || obj.Key.endsWith('.png') ||
         obj.Key.endsWith('.gif') || obj.Key.endsWith('.webp') || obj.Key.endsWith('.svg'))
      )
    );
    
    const remainingFiles = allFiles.filter(obj => 
      obj.Key && (
        obj.Key.includes('profiles/') || 
        obj.Key.includes('post-audio/') ||
        (!obj.Key.startsWith('media/') && 
         (obj.Key.endsWith('.mp4') || obj.Key.endsWith('.mov') || obj.Key.endsWith('.webm') ||
          obj.Key.endsWith('.jpg') || obj.Key.endsWith('.jpeg') || obj.Key.endsWith('.png') ||
          obj.Key.endsWith('.gif') || obj.Key.endsWith('.webp') || obj.Key.endsWith('.svg') ||
          obj.Key.endsWith('.mp3') || obj.Key.endsWith('.wav') || obj.Key.endsWith('.m4a'))
        )
      )
    );
    
    console.log(`📁 Archivos ya migrados: ${alreadyMigrated.length}`);
    console.log(`📁 Archivos por verificar: ${remainingFiles.length}`);
    
    // Migrar archivos restantes
    for (const file of remainingFiles) {
      try {
        console.log(`⬇️ Migrando archivo adicional: ${file.Key}`);
        
        const fileName = file.Key.split('/').pop();
        if (!fileName) continue;
        
        // Descargar de R2
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: file.Key
        });
        
        const r2Response = await r2Client.send(getCommand);
        const fileBuffer = await r2Response.Body?.transformToByteArray();
        
        if (!fileBuffer) {
          throw new Error('No se pudo descargar el archivo');
        }
        
        // Determinar content type
        let contentType = 'application/octet-stream';
        if (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (fileName.toLowerCase().endsWith('.png')) contentType = 'image/png';
        else if (fileName.toLowerCase().endsWith('.gif')) contentType = 'image/gif';
        else if (fileName.toLowerCase().endsWith('.webp')) contentType = 'image/webp';
        else if (fileName.toLowerCase().endsWith('.svg')) contentType = 'image/svg+xml';
        else if (fileName.toLowerCase().endsWith('.mp4')) contentType = 'video/mp4';
        else if (fileName.toLowerCase().endsWith('.mov')) contentType = 'video/quicktime';
        else if (fileName.toLowerCase().endsWith('.webm')) contentType = 'video/webm';
        else if (fileName.toLowerCase().endsWith('.mp3')) contentType = 'audio/mpeg';
        else if (fileName.toLowerCase().endsWith('.wav')) contentType = 'audio/wav';
        else if (fileName.toLowerCase().endsWith('.m4a')) contentType = 'audio/mp4';
        
        // Subir a Supabase
        const { error } = await supabase.storage
          .from('media')
          .upload(fileName, fileBuffer, {
            contentType: contentType,
            upsert: true
          });
          
        if (error) {
          throw new Error(`Error subiendo a Supabase: ${error.message}`);
        }
        
        console.log(`✅ Migrado: ${fileName}`);
        totalMigrated++;
        
      } catch (error) {
        console.error(`❌ Error migrando ${file.Key}:`, error.message);
        totalErrors++;
      }
    }
    
    console.log(`\n🎉 Migración completa:`);
    console.log(`   ✅ Archivos migrados: ${totalMigrated}`);
    console.log(`   ❌ Errores: ${totalErrors}`);
    console.log(`   📊 Total procesado: ${totalMigrated + totalErrors}`);
    
    // Verificación final
    console.log('\n🔍 Verificación final...');
    const { data: finalCheck } = await supabase
      .from('profiles')
      .select('id, avatar_url, cover_url')
      .or('avatar_url.ilike.%r2.dev%,cover_url.ilike.%r2.dev%');
      
    if (finalCheck && finalCheck.length === 0) {
      console.log('✅ No quedan URLs de R2 en profiles');
    } else {
      console.log(`⚠️ Quedan ${finalCheck.length} URLs de R2 en profiles`);
    }
    
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
  }
}

migrateAllRemainingMedia();
