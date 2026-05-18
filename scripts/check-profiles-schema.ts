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

async function checkProfilesSchema() {
  console.log('🔍 Verificando esquema de la tabla profiles...\n');

  try {
    // Intentar obtener columnas de profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error al consultar profiles:', error.message);
      return;
    }

    if (profiles && profiles.length > 0) {
      console.log('📋 Columnas disponibles en profiles:');
      console.log(Object.keys(profiles[0]).join(', '));
      console.log('\n📋 Ejemplo de datos:');
      console.log(JSON.stringify(profiles[0], null, 2));
    }

    // Verificar si hay email en auth.users
    console.log('\n🔍 Verificando auth.users...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error al consultar auth.users:', authError.message);
    } else if (users) {
      console.log(`✅ Encontrados ${users.length} usuarios en auth.users`);
      if (users.length > 0) {
        console.log('📋 Columnas en auth.users:');
        console.log(Object.keys(users[0]).join(', '));
        console.log('\n📋 Ejemplo de datos:');
        console.log(JSON.stringify({
          id: users[0].id,
          email: users[0].email,
          email_confirmed_at: users[0].email_confirmed_at
        }, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

checkProfilesSchema().catch(console.error);
