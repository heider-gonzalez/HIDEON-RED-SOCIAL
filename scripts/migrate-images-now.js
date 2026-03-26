import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Credenciales proporcionadas
const supabaseUrl = 'https://wgbbaxvuuinubkgffpiq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYmJheHZ1dWludWJrZ2ZmcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTgxNzg2OCwiZXhwIjoyMDU1MzkzODY4fQ.ntKJlyWN_GZAtQydt0gGnsEH7ivBV-s-IUPy67uijlo';
const r2AccountId = '137569df68ffc80cc0977391324e77fc';
const r2AccessKeyId = '7b281f30e5ddae13b1e572b74b3ea652';
const r2SecretAccessKey = 'e4c5249a16eaf9d23495afb556cb73b48a47c76e7d0cddc4016d33c207cbba74';

async function migrateImagesFromR2ToSupabase() {
  console.log('🖼️ Iniciando migración de imágenes R2 → Supabase...\n');
  
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
    console.log('📋 Listando imágenes en R2...');
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'media/',
      MaxKeys: 1000
    });
    
    const r2Response = await r2Client.send(listCommand);
    const images = r2Response.Contents?.filter(obj => {
      if (!obj.Key) return false;
      const key = obj.Key.toLowerCase();
      return key.endsWith('.jpg') || key.endsWith('.jpeg') || key.endsWith('.png') || key.endsWith('.gif') || key.endsWith('.webp') || key.endsWith('.svg');
    }) || [];
    
    console.log(`🖼️ Encontradas ${images.length} imágenes en R2\n`);
    
    if (images.length === 0) {
      console.log('❌ No se encontraron imágenes para migrar');
      return;
    }
    
    // 2. Migrar cada imagen
    let migrated = 0;
    let errors = 0;
    
    for (const image of images) {
      try {
        console.log(`⬇️ Descargando: ${image.Key}`);
        
        // Descargar de R2
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: image.Key
        });
        
        const r2Response = await r2Client.send(getCommand);
        const imageBuffer = await r2Response.Body?.transformToByteArray();
        
        if (!imageBuffer) {
          throw new Error('No se pudo descargar la imagen');
        }
        
        // Extraer filename del path
        const fileName = image.Key.split('/').pop();
        
        // Determinar content type
        let contentType = 'image/jpeg';
        if (fileName.toLowerCase().endsWith('.png')) contentType = 'image/png';
        else if (fileName.toLowerCase().endsWith('.gif')) contentType = 'image/gif';
        else if (fileName.toLowerCase().endsWith('.webp')) contentType = 'image/webp';
        else if (fileName.toLowerCase().endsWith('.svg')) contentType = 'image/svg+xml';
        
        console.log(`⬆️ Subiendo a Supabase: ${fileName}`);
        
        // Subir a Supabase
        const { error } = await supabase.storage
          .from('media')
          .upload(fileName, imageBuffer, {
            contentType: contentType,
            upsert: true
          });
          
        if (error) {
          throw new Error(`Error subiendo a Supabase: ${error.message}`);
        }
        
        console.log(`✅ Migrada: ${fileName}\n`);
        migrated++;
        
        // Pequeña pausa para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error migrando ${image.Key}:`, error.message);
        errors++;
      }
    }
    
    console.log(`🎉 Migración de imágenes completada:`);
    console.log(`   ✅ Migradas: ${migrated}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📊 Total: ${images.length}`);
    
    if (migrated > 0) {
      console.log('\n🔄 Ahora ejecuta: node update-images-urls-now.js');
      console.log('📝 Para actualizar las URLs de imágenes en la base de datos');
    }
    
  } catch (error) {
    console.error('❌ Error en migración de imágenes:', error.message);
  }
}

// Ejecutar migración
migrateImagesFromR2ToSupabase();
