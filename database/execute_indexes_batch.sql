-- 🚀 EJECUCIÓN POR LOTES - ÍNDICES CRÍTICOS
-- Ejecutar este archivo en tu cliente SQL (DBeaver, pgAdmin, etc.)
-- Cada lote se ejecuta individualmente para evitar errores de transacción

-- ========================================
-- LOTE 1: ÍNDICES POSTS (CRÍTICOS)
-- ========================================

CREATE INDEX CONCURRENTLY idx_posts_created_at_desc 
ON posts(created_at DESC);

CREATE INDEX CONCURRENTLY idx_posts_user_id_created_at 
ON posts(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_posts_visibility_created_at 
ON posts(visibility, created_at DESC) 
WHERE visibility = 'public';

CREATE INDEX CONCURRENTLY idx_posts_media_url 
ON posts(media_url) 
WHERE media_url IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_posts_author_visibility_created_at 
ON posts(user_id, visibility, created_at DESC);

-- ========================================
-- LOTE 2: ÍNDICES PROFILES
-- ========================================

CREATE INDEX CONCURRENTLY idx_profiles_username_lower 
ON profiles(LOWER(username));

CREATE INDEX CONCURRENTLY idx_profiles_created_at 
ON profiles(created_at DESC);

-- ========================================
-- LOTE 3: ÍNDICES REACTIONS
-- ========================================

CREATE INDEX CONCURRENTLY idx_reactions_post_id_user_id 
ON reactions(post_id, user_id);

CREATE INDEX CONCURRENTLY idx_reactions_post_id_created_at 
ON reactions(post_id, created_at DESC);

-- ========================================
-- LOTE 4: ÍNDICES COMMENTS
-- ========================================

CREATE INDEX CONCURRENTLY idx_comments_post_id_created_at 
ON comments(post_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_comments_user_id_created_at 
ON comments(user_id, created_at DESC);

-- ========================================
-- LOTE 5: ÍNDICES NOTIFICATIONS
-- ========================================

CREATE INDEX CONCURRENTLY idx_notifications_user_id_created_at 
ON notifications(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_notifications_user_read 
ON notifications(user_id, read) 
WHERE read = false;

-- ========================================
-- LOTE 6: ÍNDICES PREMIUM
-- ========================================

CREATE INDEX CONCURRENTLY idx_subscriptions_user_status 
ON subscriptions(user_id, status);

CREATE INDEX CONCURRENTLY idx_premium_hearts_user_reset_date 
ON premium_hearts(user_id, last_reset_date);

-- ========================================
-- LOTE 7: ÍNDICES MESSAGES
-- ========================================

CREATE INDEX CONCURRENTLY idx_messages_sender_receiver_created_at 
ON messages(sender_id, receiver_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_messages_receiver_read_created_at 
ON messages(receiver_id, read, created_at DESC) 
WHERE read = false;

-- ========================================
-- LOTE 8: ÍNDICES ADICIONALES
-- ========================================

CREATE INDEX CONCURRENTLY idx_follows_following_created_at 
ON follows(following_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_hidden_posts_user_id_post_id 
ON hidden_posts(user_id, post_id);

CREATE INDEX CONCURRENTLY idx_shares_post_id_created_at 
ON shares(post_id, created_at DESC);

-- ========================================
-- LOTE 9: OPTIMIZACIÓN FINAL
-- ========================================

-- Actualizar estadísticas
ANALYZE posts;
ANALYZE profiles;
ANALYZE reactions;
ANALYZE comments;
ANALYZE notifications;
ANALYZE messages;
ANALYZE follows;
ANALYZE subscriptions;
ANALYZE premium_hearts;

-- Crear vistas de monitoreo
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- ========================================
-- VERIFICACIÓN POST-EJECUCIÓN
-- ========================================

-- Verificar todos los índices creados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Monitorear uso inicial (después de 24 horas de uso)
SELECT 
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
