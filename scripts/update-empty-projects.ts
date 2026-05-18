import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL y API key requeridos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// URLs de prueba que sabemos que funcionan en R2
const R2_BASE_URL = 'https://pub-11aaf71a35c74d7da48843fdfc2c1e44.r2.dev';

// Archivos de prueba existentes en R2 (ajustar según archivos reales disponibles)
const TEST_MEDIA_URLS = [
  `${R2_BASE_URL}/test-video.mp4`,
  `${R2_BASE_URL}/test-image.png`,
  `${R2_BASE_URL}/demo-video.mp4`,
  `${R2_BASE_URL}/placeholder-image.jpg`
];

// Mapeo de proyectos a URLs de prueba
const PROJECT_UPDATES = [
  {
    id: '811c72d0-6708-493c-b7c6-3446e2bcfc67',
    media_url: `${R2_BASE_URL}/proyectos/vixual-movie-demo.mp4`,
    media_urls: [`${R2_BASE_URL}/proyectos/vixual-movie-thumb.jpg`]
  },
  {
    id: 'a7c6333f-4b56-485e-a6a6-a67e083cb036',
    media_url: `${R2_BASE_URL}/proyectos/h-chat-demo.mp4`,
    media_urls: [`${R2_BASE_URL}/proyectos/h-chat-thumb.jpg`]
  },
  {
    id: 'f1ed6d06-035a-4f17-80e8-fd96fadabfbb',
    media_url: `${R2_BASE_URL}/proyectos/f1ed-project-demo.mp4`,
    media_urls: [`${R2_BASE_URL}/proyectos/f1ed-project-thumb.jpg`]
  }
];

async function updateEmptyProjects() {
  console.log('🔄 Actualizando proyectos con URLs de prueba en R2...\n');

  for (const projectUpdate of PROJECT_UPDATES) {
    console.log(`📋 Actualizando proyecto ID: ${projectUpdate.id}`);
    console.log('='.repeat(60));

    try {
      // Verificar estado actual
      const { data: currentProject, error: fetchError } = await supabase
        .from('posts')
        .select('id, media_url, media_urls')
        .eq('id', projectUpdate.id)
        .single();

      if (fetchError) {
        console.error(`❌ Error al obtener proyecto: ${fetchError.message}\n`);
        continue;
      }

      console.log(`Estado actual:`);
      console.log(`  media_url: ${currentProject.media_url || 'NULL'}`);
      console.log(`  media_urls: ${JSON.stringify(currentProject.media_urls || [])}`);

      // Actualizar con nuevas URLs
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          media_url: projectUpdate.media_url,
          media_urls: projectUpdate.media_urls
        })
        .eq('id', projectUpdate.id);

      if (updateError) {
        console.error(`❌ Error al actualizar: ${updateError.message}\n`);
        continue;
      }

      console.log(`✅ Actualizado exitosamente:`);
      console.log(`  media_url: ${projectUpdate.media_url}`);
      console.log(`  media_urls: ${JSON.stringify(projectUpdate.media_urls)}\n`);

      // Verificar que se actualizó correctamente
      const { data: updatedProject, error: verifyError } = await supabase
        .from('posts')
        .select('media_url, media_urls')
        .eq('id', projectUpdate.id)
        .single();

      if (!verifyError && updatedProject) {
        console.log(`✅ Verificación exitosa:`);
        console.log(`  media_url: ${updatedProject.media_url}`);
        console.log(`  media_urls: ${JSON.stringify(updatedProject.media_urls)}\n`);
      }

    } catch (error) {
      console.error(`❌ Error inesperado: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  }

  console.log('='.repeat(60));
  console.log('✅ Proceso de actualización completado');
}

updateEmptyProjects().catch(console.error);
