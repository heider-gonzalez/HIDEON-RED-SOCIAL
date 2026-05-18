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

const PROJECT_IDS = [
  '811c72d0-6708-493c-b7c6-3446e2bcfc67',
  'a7c6333f-4b56-485e-a6a6-a67e083cb036',
  'f1ed6d06-035a-4f17-80e8-fd96fadabfbb'
];

async function inspectProjectUrls() {
  console.log('🔍 Intentando acceso directo con cliente Supabase...\n');

  for (const projectId of PROJECT_IDS) {
    console.log(`📋 Proyecto ID: ${projectId}`);
    console.log('='.repeat(60));

    try {
      const { data: project, error } = await supabase
        .from('posts')
        .select('id, content, media_url, media_urls, post_type, project_status')
        .eq('id', projectId)
        .single();

      if (error) {
        console.log(`❌ Error: ${error.message}\n`);
        continue;
      }

      if (!project) {
        console.log('⚠️  Proyecto no encontrado\n');
        continue;
      }

      console.log(`📌 post_type: ${project.post_type || 'NULL'}`);
      console.log(`📝 content: ${project.content?.substring(0, 100) || 'NULL'}...`);
      console.log(`🖼️  media_url: ${project.media_url || 'NULL'}`);
      console.log(`🎬 media_urls: ${JSON.stringify(project.media_urls || [])}`);
      console.log(`📊 project_status: ${project.project_status || 'NULL'}`);
      
      // Verificar si hay datos en project_showcases
      const { data: showcase, error: showcaseError } = await supabase
        .from('project_showcases')
        .select('id, images_urls, github_url, demo_url, project_url')
        .eq('post_id', projectId)
        .maybeSingle();
      
      if (showcaseError) {
        console.log(`⚠️  Error al buscar showcase: ${showcaseError.message}`);
      } else if (showcase) {
        console.log(`🎨 showcase.images_urls: ${JSON.stringify(showcase.images_urls || [])}`);
        console.log(`🔗 showcase.demo_url: ${showcase.demo_url || 'NULL'}`);
        console.log(`🔗 showcase.github_url: ${showcase.github_url || 'NULL'}`);
        console.log(`🔗 showcase.project_url: ${showcase.project_url || 'NULL'}`);
      } else {
        console.log(`⚠️  No hay showcase asociado`);
      }
      
      console.log();
      
    } catch (error) {
      console.log(`❌ Error en petición: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  }
}

inspectProjectUrls().catch(console.error);
