#!/bin/bash
# 🚀 CREACIÓN DE ÍNDICES VIA CLI SUPABASE
# Usa este script si tienes CLI de Supabase instalada
# Evita el problema de transacciones del SQL Editor

echo "🚀 Creando índices críticos para HSOCIAL..."
echo "⏱️  Tiempo estimado: 15-25 minutos"

# Índices Posts (críticos)
echo "📝 Creando índices para posts..."
supabase db push --schema public << 'EOF'
CREATE INDEX CONCURRENTLY idx_posts_created_at_desc ON posts(created_at DESC);
EOF

echo "✅ idx_posts_created_at_desc creado"

supabase db push --schema public << 'EOF'
CREATE INDEX CONCURRENTLY idx_posts_user_id_created_at ON posts(user_id, created_at DESC);
EOF

echo "✅ idx_posts_user_id_created_at creado"

supabase db push --schema public << 'EOF'
CREATE INDEX CONCURRENTLY idx_posts_visibility_created_at ON posts(visibility, created_at DESC) WHERE visibility = 'public';
EOF

echo "✅ idx_posts_visibility_created_at creado"

# Índices Profiles
echo "👤 Creando índices para profiles..."
supabase db push --schema public << 'EOF'
CREATE INDEX CONCURRENTLY idx_profiles_username_lower ON profiles(LOWER(username));
EOF

echo "✅ idx_profiles_username_lower creado"

# Índices Reactions
echo "❤️  Creando índices para reactions..."
supabase db push --schema public << 'EOF'
CREATE INDEX CONCURRENTLY idx_reactions_post_id_user_id ON reactions(post_id, user_id);
EOF

echo "✅ idx_reactions_post_id_user_id creado"

supabase db push --schema public << 'EOF'
CREATE INDEX CONCURRENTLY idx_reactions_post_id_created_at ON reactions(post_id, created_at DESC);
EOF

echo "✅ idx_reactions_post_id_created_at creado"

# Índices Comments
echo "💬 Creando índices para comments..."
supabase db push --schema public << 'EOF'
CREATE INDEX CONCURRENTLY idx_comments_post_id_created_at ON comments(post_id, created_at DESC);
EOF

echo "✅ idx_comments_post_id_created_at creado"

# Índices Notifications
echo "🔔 Creando índices para notifications..."
supabase db push --schema public << 'EOF'
CREATE INDEX CONCURRENTLY idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
EOF

echo "✅ idx_notifications_user_id_created_at creado"

# Índices Premium
echo "💎 Creando índices para premium..."
supabase db push --schema public << 'EOF'
CREATE INDEX CONCURRENTLY idx_subscriptions_user_status ON subscriptions(user_id, status);
EOF

echo "✅ idx_subscriptions_user_status creado"

# Actualizar estadísticas
echo "📊 Actualizando estadísticas..."
supabase db push --schema public << 'EOF'
ANALYZE posts;
ANALYZE profiles;
ANALYZE reactions;
ANALYZE comments;
ANALYZE notifications;
ANALYZE subscriptions;
EOF

echo "✅ Estadísticas actualizadas"

echo "🎉 ¡Índices críticos creados exitosamente!"
echo "📈 Performance mejorada significativamente"
echo ""
echo "🔍 Para verificar:"
echo "   SELECT * FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';"
