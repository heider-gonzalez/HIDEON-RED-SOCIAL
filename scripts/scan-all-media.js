import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wgbbaxvuuinubkgffpiq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYmJheHZ1dWludWJrZ2ZmcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTgxNzg2OCwiZXhwIjoyMDU1MzkzODY4fQ.ntKJlyWN_GZAtQydt0gGnsEH7ivBV-s-IUPy67uijlo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function scanAllMediaTables() {
  console.log('🔍 Escaneando todas las tablas para encontrar contenido multimedia...\n');
  
  try {
    // Tablas a escanear
    const tables = [
      { name: 'profiles', columns: ['avatar_url', 'banner_url', 'header_url'] },
      { name: 'users', columns: ['avatar_url', 'profile_image', 'cover_image'] },
      { name: 'companies', columns: ['logo_url', 'banner_url', 'cover_image'] },
      { name: 'projects', columns: ['thumbnail_url', 'banner_url', 'logo_url', 'cover_image'] },
      { name: 'events', columns: ['image_url', 'banner_url', 'cover_image'] },
      { name: 'groups', columns: ['avatar_url', 'banner_url', 'cover_image'] },
      { name: 'stories', columns: ['media_url', 'thumbnail_url'] },
      { name: 'messages', columns: ['media_url', 'attachment_url'] },
      { name: 'comments', columns: ['media_url', 'attachment_url'] },
      { name: 'reactions', columns: ['image_url'] }
    ];
    
    let totalR2Urls = 0;
    let totalRecords = 0;
    
    for (const table of tables) {
      console.log(`📋 Escaneando tabla: ${table.name}`);
      
      try {
        // Construir consulta dinámica
        let query = supabase.from(table.name).select('id');
        
        // Agregar columnas que contienen URLs
        for (const column of table.columns) {
          query = query.or(`${column}.ilike.%r2.dev%,${column}.ilike.%cloudflare%,${column}.ilike.%r2.%`);
        }
        
        const { data, error } = await query.limit(50);
        
        if (error) {
          console.log(`   ❌ Error: ${error.message}`);
          continue;
        }
        
        if (data && data.length > 0) {
          console.log(`   ✅ Encontrados ${data.length} registros con URLs externas`);
          totalR2Urls += data.length;
          
          // Mostrar detalles de los primeros 3 registros
          const sampleData = await supabase
            .from(table.name)
            .select(table.columns.join(', '))
            .or(`${table.columns.map(col => `${col}.ilike.%r2.dev%`).join(',')}`)
            .limit(3);
            
          if (sampleData.data) {
            sampleData.data.forEach((record, index) => {
              console.log(`      ${index + 1}. ${JSON.stringify(record)}`);
            });
          }
        } else {
          console.log(`   ✅ Sin URLs externas encontradas`);
        }
        
        totalRecords += data?.length || 0;
        
      } catch (tableError) {
        console.log(`   ❌ Error escaneando ${table.name}: ${tableError.message}`);
      }
      
      console.log('');
    }
    
    console.log(`📊 Resumen del escaneo:`);
    console.log(`   🔗 Total URLs externas: ${totalR2Urls}`);
    console.log(`   📝 Total registros afectados: ${totalRecords}`);
    
    if (totalR2Urls > 0) {
      console.log(`\n🚀 Se necesita migrar ${totalR2Urls} URLs a Supabase`);
    } else {
      console.log(`\n✅ No se encontraron URLs externas por migrar`);
    }
    
  } catch (error) {
    console.error('❌ Error en escaneo:', error.message);
  }
}

scanAllMediaTables();
