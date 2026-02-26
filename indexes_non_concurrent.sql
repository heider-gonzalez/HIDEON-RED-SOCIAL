-- 🚀 ÍNDICES PARA SUPABASE SQL EDITOR (Versión sin CONCURRENTLY)
-- Esta versión funciona en Supabase Dashboard porque no usa CONCURRENTLY
-- NOTA: Bloqueará escrituras brevemente durante la creación (30 segundos - 2 minutos por índice)

-- ========================================
-- ÍNDICES CRÍTICOS POSTS
-- ========================================

CREATE INDEX idx_posts_created_at_desc ON posts(created_at DESC);

CREATE INDEX idx_posts_user_id_created_at ON posts(user_id, created_at DESC);

CREATE INDEX idx_posts_visibility_created_at ON posts(visibility, created_at DESC) 
WHERE visibility = 'public';

CREATE INDEX idx_posts_media_url ON posts(media_url) 
WHERE media_url IS NOT NULL;

CREATE INDEX idx_posts_author_visibility_created_at ON posts(user_id, visibility, created_at DESC);

-- ========================================
-- ÍNDICES PROFILES
-- ========================================

CREATE INDEX idx_profiles_username_lower ON profiles(LOWER(username));

CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- ========================================
-- ÍNDICES REACTIONS
-- ========================================

CREATE INDEX idx_reactions_post_id_user_id ON reactions(post_id, user_id);

CREATE INDEX idx_reactions_post_id_created_at ON reactions(post_id, created_at DESC);

-- ========================================
-- ÍNDICES COMMENTS
-- ========================================

CREATE INDEX idx_comments_post_id_created_at ON comments(post_id, created_at DESC);

CREATE INDEX idx_comments_user_id_created_at ON comments(user_id, created_at DESC);

-- ========================================
-- ÍNDICES NOTIFICATIONS
-- ========================================

CREATE INDEX idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, read) 
WHERE read = false;

-- ========================================
-- ÍNDICES PREMIUM
-- ========================================

CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);

CREATE INDEX idx_premium_hearts_user_reset_date ON premium_hearts(user_id, last_reset_date);

-- ========================================
-- ÍNDICES MESSAGES
-- ========================================

CREATE INDEX idx_messages_sender_receiver_created_at ON messages(sender_id, receiver_id, created_at DESC);

CREATE INDEX idx_messages_receiver_read_created_at ON messages(receiver_id, read, created_at DESC) 
WHERE read = false;

-- ========================================
-- ÍNDICES ADICIONALES
-- ========================================

CREATE INDEX idx_follows_following_created_at ON follows(following_id, created_at DESC);

CREATE INDEX idx_hidden_posts_user_id_post_id ON hidden_posts(user_id, post_id);

CREATE INDEX idx_shares_post_id_created_at ON shares(post_id, created_at DESC);

-- ========================================
-- OPTIMIZACIÓN POST-CREACIÓN
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

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Verificar índices creados
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
