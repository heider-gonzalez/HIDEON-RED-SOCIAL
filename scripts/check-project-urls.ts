import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son requeridos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjectUrls() {
  console.log('🔍 Verificando URLs de proyectos...\n');

  // Obtener todos los proyectos con URLs
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, image_url, media_urls, demo_url')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error al obtener proyectos:', error);
    return;
  }

  console.log(`📊 Total de proyectos: ${projects?.length || 0}\n`);

  const projectsWithIssues: any[] = [];
  const supabaseUrls: any[] = [];
  const r2Urls: any[] = [];

  for (const project of projects || []) {
    const urlsToCheck: string[] = [];
    
    if (project.image_url) urlsToCheck.push(project.image_url);
    if (project.demo_url) urlsToCheck.push(project.demo_url);
    if (project.media_urls && Array.isArray(project.media_urls)) {
      urlsToCheck.push(...project.media_urls);
    }

    for (const url of urlsToCheck) {
      if (!url) continue;

      // Clasificar URL
      if (url.includes('supabase.co')) {
        supabaseUrls.push({
          projectId: project.id,
          title: project.title,
          url,
          type: 'supabase'
        });
      } else if (url.includes('r2.dev') || url.includes('cloudflare')) {
        r2Urls.push({
          projectId: project.id,
          title: project.title,
          url,
          type: 'r2'
        });
      }

      // Verificar si la URL es accesible
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) {
          projectsWithIssues.push({
            projectId: project.id,
            title: project.title,
            url,
            status: response.status,
            statusText: response.statusText
          });
        }
      } catch (err) {
        projectsWithIssues.push({
          projectId: project.id,
          title: project.title,
          url,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }
  }

  console.log('📁 Proyectos con URLs de Supabase (antiguo):');
  console.log(`Total: ${supabaseUrls.length}`);
  supabaseUrls.slice(0, 10).forEach((p) => {
    console.log(`  - ${p.title} (${p.projectId}): ${p.url.substring(0, 80)}...`);
  });
  if (supabaseUrls.length > 10) {
    console.log(`  ... y ${supabaseUrls.length - 10} más`);
  }

  console.log('\n☁️  Proyectos con URLs de R2 (nuevo):');
  console.log(`Total: ${r2Urls.length}`);
  r2Urls.slice(0, 10).forEach((p) => {
    console.log(`  - ${p.title} (${p.projectId}): ${p.url.substring(0, 80)}...`);
  });
  if (r2Urls.length > 10) {
    console.log(`  ... y ${r2Urls.length - 10} más`);
  }

  console.log('\n❌ Proyectos con URLs rotas:');
  console.log(`Total: ${projectsWithIssues.length}`);
  projectsWithIssues.forEach((p) => {
    console.log(`  - ${p.title} (${p.projectId}):`);
    console.log(`    URL: ${p.url}`);
    console.log(`    Error: ${p.status ? `${p.status} ${p.statusText}` : p.error}`);
  });

  // Generar JSON para análisis
  const report = {
    totalProjects: projects?.length || 0,
    supabaseUrls: supabaseUrls.length,
    r2Urls: r2Urls.length,
    brokenUrls: projectsWithIssues.length,
    projectsWithIssues,
    supabaseUrls: supabaseUrls,
    r2Urls: r2Urls
  };

  console.log('\n📄 Reporte generado en JSON:');
  console.log(JSON.stringify(report, null, 2));
}

checkProjectUrls().catch(console.error);
