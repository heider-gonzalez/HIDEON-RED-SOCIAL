import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wgbbaxvuuinubkgffpiq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYmJheHZ1dWludWJrZ2ZmcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTgxNzg2OCwiZXhwIjoyMDU1MzkzODY4fQ.ntKJlyWN_GZAtQydt0gGnsEH7ivBV-s-IUPy67uijlo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDatabaseSchema() {
  console.log('🔍 Obteniendo esquema de la base de datos...\n');
  
  try {
    // Obtener todas las tablas
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
      
    if (tablesError) {
      throw new Error(`Error obteniendo tablas: ${tablesError.message}`);
    }
    
    console.log(`📋 Tablas encontradas: ${tables.length}`);
    
    // Para cada tabla, obtener sus columnas
    for (const table of tables) {
      console.log(`\n🔍 Analizando tabla: ${table.table_name}`);
      
      try {
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type')
          .eq('table_schema', 'public')
          .eq('table_name', table.table_name)
          .order('ordinal_position');
          
        if (columnsError) {
          console.log(`   ❌ Error obteniendo columnas: ${columnsError.message}`);
          continue;
        }
        
        // Buscar columnas que puedan contener URLs
        const urlColumns = columns.filter(col => 
          col.column_name.toLowerCase().includes('url') ||
          col.column_name.toLowerCase().includes('image') ||
          col.column_name.toLowerCase().includes('avatar') ||
          col.column_name.toLowerCase().includes('banner') ||
          col.column_name.toLowerCase().includes('media') ||
          col.column_name.toLowerCase().includes('photo') ||
          col.column_name.toLowerCase().includes('picture') ||
          col.column_name.toLowerCase().includes('logo') ||
          col.column_name.toLowerCase().includes('cover') ||
          col.column_name.toLowerCase().includes('thumbnail') ||
          col.column_name.toLowerCase().includes('attachment')
        );
        
        if (urlColumns.length > 0) {
          console.log(`   📎 Columnas potenciales de URLs: ${urlColumns.map(c => c.column_name).join(', ')}`);
          
          // Verificar si hay datos en estas columnas
          for (const col of urlColumns) {
            try {
              const { data: sampleData, error: sampleError } = await supabase
                .from(table.table_name)
                .select(col.column_name)
                .not(col.column_name, 'is', null)
                .limit(3);
                
              if (!sampleError && sampleData && sampleData.length > 0) {
                console.log(`      ✅ ${col.column_name}: ${sampleData.length} registros con datos`);
                sampleData.forEach((row, index) => {
                  const value = row[col.column_name];
                  if (value && typeof value === 'string') {
                    if (value.includes('r2.dev') || value.includes('cloudflare')) {
                      console.log(`         ${index + 1}. 🔄 ${value.substring(0, 100)}...`);
                    } else {
                      console.log(`         ${index + 1}. ✅ ${value.substring(0, 100)}...`);
                    }
                  }
                });
              }
            } catch (sampleErr) {
              // Ignorar errores de muestra
            }
          }
        } else {
          console.log(`   ✅ Sin columnas de URLs encontradas`);
        }
        
      } catch (tableError) {
        console.log(`   ❌ Error analizando tabla: ${tableError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

getDatabaseSchema();
