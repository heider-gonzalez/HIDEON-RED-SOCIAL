import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Configuración
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_ROLE_KEY son requeridos');
  console.log('📝 Crea un archivo .env basado en .env.example');
  process.exit(1);
}

const r2Config = {
  accountId: process.env.VITE_R2_ACCOUNT_ID,
  accessKeyId: process.env.VITE_R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.VITE_R2_SECRET_ACCESS_KEY,
  bucket: process.env.VITE_R2_BUCKET_NAME || 'pub-11aaf71a35c74d7da48843fdfc2c1e44',
  region: 'auto'
};

if (!r2Config.accountId || !r2Config.accessKeyId || !r2Config.secretAccessKey) {
  console.error('❌ Error: VITE_R2_ACCOUNT_ID, VITE_R2_ACCESS_KEY_ID y VITE_R2_SECRET_ACCESS_KEY son requeridos');
  console.log('📝 Configura las variables de R2 en tu .env');
  process.exit(1);
}

// Clientes
const supabase = createClient(supabaseUrl, supabaseKey);
const r2Client = new S3Client({
  region: r2Config.region,
  endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2Config.accessKeyId,
    secretAccessKey: r2Config.secretAccessKey,
  },
});

// Función para migrar videos de R2 a Supabase
async function migrateVideosFromR2ToSupabase() {
  console.log('🚀 Iniciando migración de videos R2 → Supabase...');
  
  try {
    // 1. Obtener lista de objetos en R2
    console.log('📋 Listando videos en R2...');
    const listCommand = new ListObjectsV2Command({
      Bucket: r2Config.bucket,
      Prefix: 'media/',
      MaxKeys: 1000
    });
    
    const r2Response = await r2Client.send(listCommand);
    const videos = r2Response.Contents?.filter(obj => 
      obj.Key && (obj.Key.endsWith('.mp4') || obj.Key.endsWith('.mov') || obj.Key.endsWith('.webm'))
    ) || [];
    
    console.log(`📹 Encontrados ${videos.length} videos en R2`);
    
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
          Bucket: r2Config.bucket,
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
        
        console.log(`✅ Migrado: ${fileName}`);
        migrated++;
        
        // Pequeña pausa para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error migrando ${video.Key}:`, error);
        errors++;
      }
    }
    
    console.log(`🎉 Migración completada:`);
    console.log(`   ✅ Migrados: ${migrated}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📊 Total: ${videos.length}`);
    
    if (migrated > 0) {
      console.log('\n🔄 Ahora necesitas actualizar las URLs en la base de datos');
      console.log('📝 Ejecuta el script update-video-urls.js para actualizar las URLs');
    }
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
  }
}

// Ejecutar migración
migrateVideosFromR2ToSupabase();
