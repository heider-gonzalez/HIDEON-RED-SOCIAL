import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function getCredentials() {
  console.log('🔑 Configuración de credenciales para migración R2 → Supabase\n');
  
  const supabaseUrl = await askQuestion('🌐 URL de Supabase: ');
  const supabaseKey = await askQuestion('🔐 Service Role Key de Supabase: ');
  const r2AccountId = await askQuestion('☁️ R2 Account ID: ');
  const r2AccessKeyId = await askQuestion('🔑 R2 Access Key ID: ');
  const r2SecretAccessKey = await askQuestion('🔒 R2 Secret Access Key: ');
  
  return {
    supabaseUrl: supabaseUrl.trim(),
    supabaseKey: supabaseKey.trim(),
    r2AccountId: r2AccountId.trim(),
    r2AccessKeyId: r2AccessKeyId.trim(),
    r2SecretAccessKey: r2SecretAccessKey.trim()
  };
}

async function migrateVideosFromR2ToSupabase() {
  console.log('🚀 Iniciando migración de videos R2 → Supabase...\n');
  
  try {
    // Obtener credenciales
    const creds = await getCredentials();
    
    // Validar credenciales
    if (!creds.supabaseUrl || !creds.supabaseKey || !creds.r2AccountId || !creds.r2AccessKeyId || !creds.r2SecretAccessKey) {
      console.error('❌ Error: Todas las credenciales son requeridas');
      rl.close();
      return;
    }
    
    console.log('\n✅ Credenciales recibidas, iniciando migración...\n');
    
    // Clientes
    const supabase = createClient(creds.supabaseUrl, creds.supabaseKey);
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${creds.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: creds.r2AccessKeyId,
        secretAccessKey: creds.r2SecretAccessKey,
      },
    });
    
    const bucketName = 'pub-11aaf71a35c74d7da48843fdfc2c1e44';
    
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
      rl.close();
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
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
  } finally {
    rl.close();
  }
}

// Ejecutar migración
migrateVideosFromR2ToSupabase();
