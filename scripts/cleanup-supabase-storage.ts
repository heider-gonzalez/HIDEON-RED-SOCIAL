import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function identifySupabaseStorageUrls() {
  console.log('🔍 Identifying Supabase Storage URLs in database...');
  
  const tables = [
    'profiles',
    'posts',
    'groups',
    'companies'
  ];

  const results: any[] = [];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .or('avatar_url.ilike.%supabase%,cover_url.ilike.%supabase%,media_url.ilike.%supabase%,logo_url.ilike.%supabase%');

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`📁 Found ${data.length} records in ${table} with Supabase Storage URLs`);
        results.push(...data.map(record => ({ table, record })));
      }
    } catch (error) {
      console.error(`❌ Error checking ${table}:`, error);
    }
  }

  return results;
}

async function migrateToR2() {
  console.log('🚀 Starting migration to Cloudflare R2...');
  
  const results = await identifySupabaseStorageUrls();
  
  if (results.length === 0) {
    console.log('✅ No Supabase Storage URLs found. Migration complete!');
    return;
  }

  console.log(`📊 Found ${results.length} records to migrate`);
  
  // Generate migration report
  console.log('\n📋 Migration Report:');
  for (const { table, record } of results) {
    console.log(`- ${table}: ${record.id || record.name || 'unknown'}`);
  }

  console.log('\n⚠️  Manual migration required:');
  console.log('1. Download files from Supabase Storage');
  console.log('2. Upload to Cloudflare R2');
  console.log('3. Update database URLs');
  console.log('4. Run this script again to verify');
}

if (require.main === module) {
  migrateToR2()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { identifySupabaseStorageUrls, migrateToR2 };
