import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Credenciales proporcionadas
const supabaseUrl = 'https://wgbbaxvuuinubkgffpiq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYmJheHZ1dWludWJrZ2ZmcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTgxNzg2OCwiZXhwIjoyMDU1MzkzODY4fQ.ntKJlyWN_GZAtQydt0gGnsEH7ivBV-s-IUPy67uijlo';
const r2AccountId = '137569df68ffc80cc0977391324e77fc';
const r2AccessKeyId = '7b281f30e5ddae13b1e572b74b3ea652';
const r2SecretAccessKey = 'e4c5249a16eaf9d23495afb556cb73b48a47c76e7d0cddc4016d33c207cbba74';

async function migrateVideosFromR2ToSupabase() {
  console.log('🚀 Iniciando migración de videos R2 → Supabase...\n');
  
  try {
    // Clientes
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
    
    // 1. Obtener lista de objetos en R2
    console.log('📋 Listando videos en R2...');
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'media/',
      MaxKeys: 1000
    });
    
    const r2Response = await r2Client.send(listCommand);
    const videos = r2Response.Contents?.filter(obj => 
      obj.Key && (obj.Key.endsWith('.mp4') || obj.Key.endsWith('.mov') || obj.Key.endsWith('.webm'))
    ) || [];
    
    console.log(`📹 Encontrados ${videos.length} videos en R2\n`);
    
    if (videos.length === 0) {
      console.log('❌ No se encontraron videos para migrar');
      return;
    }
    
    // 2. Migrar cada video
    let migrated = 0;
    let errors = 0;
    
    for (const video of videos) {
      try {
        console.log(`⬇️ Descargando: ${video.Key}`);
        
        // Descargar de R2
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: video.Key
        });
        
        const r2Response = await r2Client.send(getCommand);
        const videoBuffer = await r2Response.Body?.transformToByteArray();
        
        if (!videoBuffer) {
          throw new Error('No se pudo descargar el video');
        }
        
        // Extraer filename del path
        const fileName = video.Key.split('/').pop();
        
        console.log(`⬆️ Subiendo a Supabase: ${fileName}`);
        
        // Subir a Supabase
        const { error } = await supabase.storage
          .from('media')
          .upload(fileName, videoBuffer, {
            contentType: 'video/mp4',
            upsert: true
          });
          
        if (error) {
          throw new Error(`Error subiendo a Supabase: ${error.message}`);
        }
        
        console.log(`✅ Migrado: ${fileName}\n`);
        migrated++;
        
        // Pequeña pausa para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Error migrando ${video.Key}:`, error.message);
        errors++;
      }
    }
    
    console.log(`🎉 Migración completada:`);
    console.log(`   ✅ Migrados: ${migrated}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📊 Total: ${videos.length}`);
    
    if (migrated > 0) {
      console.log('\n🔄 Ahora ejecuta: npm run update-urls');
      console.log('📝 Para actualizar las URLs en la base de datos');
    }
    
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
  }
}

// Ejecutar migración
migrateVideosFromR2ToSupabase();
