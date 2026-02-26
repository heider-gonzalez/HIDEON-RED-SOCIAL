// 🚀 CREACIÓN DE ÍNDICES VIA REST API SUPABASE
// Solución definitiva para evitar problemas de transacciones

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-service-role-key'; // Service role key needed

const indexes = [
  // Índices Posts
  'CREATE INDEX CONCURRENTLY idx_posts_created_at_desc ON posts(created_at DESC)',
  'CREATE INDEX CONCURRENTLY idx_posts_user_id_created_at ON posts(user_id, created_at DESC)',
  'CREATE INDEX CONCURRENTLY idx_posts_visibility_created_at ON posts(visibility, created_at DESC) WHERE visibility = \'public\'',
  
  // Índices Profiles
  'CREATE INDEX CONCURRENTLY idx_profiles_username_lower ON profiles(LOWER(username))',
  
  // Índices Reactions
  'CREATE INDEX CONCURRENTLY idx_reactions_post_id_user_id ON reactions(post_id, user_id)',
  'CREATE INDEX CONCURRENTLY idx_reactions_post_id_created_at ON reactions(post_id, created_at DESC)',
  
  // Índices Comments
  'CREATE INDEX CONCURRENTLY idx_comments_post_id_created_at ON comments(post_id, created_at DESC)',
  
  // Índices Notifications
  'CREATE INDEX CONCURRENTLY idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC)',
  
  // Índices Premium
  'CREATE INDEX CONCURRENTLY idx_subscriptions_user_status ON subscriptions(user_id, status)'
];

async function createIndex(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY
    },
    body: JSON.stringify({ sql })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error creating index: ${error}`);
  }
  
  return response.json();
}

async function createAllIndexes() {
  console.log('🚀 Creando índices críticos...');
  
  for (let i = 0; i < indexes.length; i++) {
    const sql = indexes[i];
    console.log(`📝 Creando índice ${i + 1}/${indexes.length}...`);
    
    try {
      await createIndex(sql);
      console.log(`✅ Índice creado: ${sql.split('idx_')[1].split(' ')[0]}`);
      
      // Esperar 2 segundos entre índices para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Error en índice ${i + 1}:`, error.message);
    }
  }
  
  console.log('🎉 ¡Proceso completado!');
}

// Para usar en Node.js:
// node create_indexes_rest.js
