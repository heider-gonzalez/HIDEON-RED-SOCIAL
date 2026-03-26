import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wgbbaxvuuinubkgffpiq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYmJheHZ1dWludWJrZ2ZmcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTgxNzg2OCwiZXhwIjoyMDU1MzkzODY4fQ.ntKJlyWN_GZAtQydt0gGnsEH7ivBV-s-IUPy67uijlo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCommonTables() {
  console.log('🔍 Verificando tablas comunes para contenido multimedia...\n');
  
  const tablesToCheck = [
    'profiles',
    'users', 
    'posts',
    'comments',
    'reactions',
    'companies',
    'projects',
    'events',
    'groups',
    'messages',
    'stories',
    'notifications',
    'friends',
    'likes'
  ];
  
  let totalR2Urls = 0;
  
  for (const tableName of tablesToCheck) {
    console.log(`📋 Verificando tabla: ${tableName}`);
    
    try {
      // Intentar obtener datos de la tabla
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`   ❌ Tabla no existe o sin acceso: ${error.message}`);
        continue;
      }
      
      console.log(`   ✅ Tabla existe con ${count} registros`);
      
      // Intentar obtener una muestra para ver las columnas
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
        
      if (!sampleError && sampleData && sampleData.length > 0) {
        const columns = Object.keys(sampleData[0]);
        const urlColumns = columns.filter(col => 
          col.toLowerCase().includes('url') ||
          col.toLowerCase().includes('image') ||
          col.toLowerCase().includes('avatar') ||
          col.toLowerCase().includes('banner') ||
          col.toLowerCase().includes('media') ||
          col.toLowerCase().includes('photo') ||
          col.toLowerCase().includes('picture') ||
          col.toLowerCase().includes('logo') ||
          col.toLowerCase().includes('cover') ||
          col.toLowerCase().includes('thumbnail') ||
          col.toLowerCase().includes('attachment')
        );
        
        if (urlColumns.length > 0) {
          console.log(`   📎 Columnas de URLs: ${urlColumns.join(', ')}`);
          
          // Buscar URLs de R2 en estas columnas
          for (const col of urlColumns) {
            const { data: r2Data, error: r2Error } = await supabase
              .from(tableName)
              .select('id, ' + col)
              .or(`${col}.ilike.%r2.dev%,${col}.ilike.%cloudflare%,${col}.ilike.%r2.%`)
              .limit(5);
              
            if (!r2Error && r2Data && r2Data.length > 0) {
              console.log(`      🔄 ${col}: ${r2Data.length} registros con URLs externas`);
              totalR2Urls += r2Data.length;
              
              r2Data.forEach((row, index) => {
                const value = row[col];
                if (value) {
                  console.log(`         ${index + 1}. ID: ${row.id} -> ${value.substring(0, 80)}...`);
                }
              });
            }
          }
        } else {
          console.log(`   ✅ Sin columnas de URLs`);
        }
      }
      
    } catch (tableError) {
      console.log(`   ❌ Error verificando tabla: ${tableError.message}`);
    }
    
    console.log('');
  }
  
  console.log(`📊 Resumen final:`);
  console.log(`   🔗 Total URLs externas encontradas: ${totalR2Urls}`);
  
  if (totalR2Urls > 0) {
    console.log(`\n🚀 Se necesita migrar ${totalR2Urls} URLs adicionales`);
  } else {
    console.log(`\n✅ No se encontraron URLs externas adicionales por migrar`);
    console.log(`🎉 La migración parece estar completa!`);
  }
}

checkCommonTables();
