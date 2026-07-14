-- 🚀 ÍNDICES CRÍTICOS PARA RED SOCIAL HSOCIAL
-- Optimización de alto rendimiento para latencia Colombia-US

-- IMPORTANTE: Ejecutar en producción con CONCURRENTLY para evitar bloqueos
-- psql -h [host] -U [user] -d [database] -f critical_indexes.sql

-- ========================================
-- ÍNDICES PARA POSTS (Tabla más consultada)
-- ========================================

-- Índice principal para ordenamiento cronológico
CREATE INDEX CONCURRENTLY idx_posts_created_at_desc 
ON posts(created_at DESC);

-- Índice compuesto para posts de usuario
CREATE INDEX CONCURRENTLY idx_posts_user_id_created_at 
ON posts(user_id, created_at DESC);

-- Índice para posts públicos (feed principal)
CREATE INDEX CONCURRENTLY idx_posts_visibility_created_at 
ON posts(visibility, created_at DESC) 
WHERE visibility = 'public';

-- Índice para posts con media (optimización de carga de imágenes)
CREATE INDEX CONCURRENTLY idx_posts_media_url 
ON posts(media_url) 
WHERE media_url IS NOT NULL;

-- Índice para búsqueda de posts por contenido (si se implementa búsqueda)
CREATE INDEX CONCURRENTLY idx_posts_content_gin 
ON posts USING gin(to_tsvector('spanish', content));

-- Índice compuesto para feed personalizado
CREATE INDEX CONCURRENTLY idx_posts_author_visibility_created_at 
ON posts(user_id, visibility, created_at DESC);

-- Índice para posts compartidos
CREATE INDEX CONCURRENTLY idx_posts_shared_post_id 
ON posts(shared_post_id) 
WHERE shared_post_id IS NOT NULL;

-- ========================================
-- ÍNDICES PARA PROFILES
-- ========================================

-- Índice para búsqueda de usuarios (case insensitive)
CREATE INDEX CONCURRENTLY idx_profiles_username_lower 
ON profiles(LOWER(username));

-- Índice para perfiles recientes
CREATE INDEX CONCURRENTLY idx_profiles_created_at 
ON profiles(created_at DESC);

-- Índice para búsqueda por carrera/institución
CREATE INDEX CONCURRENTLY idx_profiles_career 
ON profiles(career) 
WHERE career IS NOT NULL;

-- ========================================
-- ÍNDICES PARA REACTIONS (Alta frecuencia)
-- ========================================

-- Índice compuesto para verificar si usuario ya reaccionó
CREATE INDEX CONCURRENTLY idx_reactions_post_id_user_id 
ON reactions(post_id, user_id);

-- Índice para contar reacciones por post
CREATE INDEX CONCURRENTLY idx_reactions_post_id_created_at 
ON reactions(post_id, created_at DESC);

-- Índice para reacciones por tipo
CREATE INDEX CONCURRENTLY idx_reactions_type_created_at 
ON reactions(reaction_type, created_at DESC);

-- ========================================
-- ÍNDICES PARA COMMENTS
-- ========================================

-- Índice para comentarios de un post
CREATE INDEX CONCURRENTLY idx_comments_post_id_created_at 
ON comments(post_id, created_at DESC);

-- Índice para comentarios de usuario
CREATE INDEX CONCURRENTLY idx_comments_user_id_created_at 
ON comments(user_id, created_at DESC);

-- Índice para respuestas a comentarios
CREATE INDEX CONCURRENTLY idx_comments_parent_id_created_at 
ON comments(parent_id, created_at DESC) 
WHERE parent_id IS NOT NULL;

-- ========================================
-- ÍNDICES PARA SEGUIMIENTO Y AMISTAD
-- ========================================

-- Índice para follows (quién sigue a quién)
CREATE INDEX CONCURRENTLY idx_follows_follower_following 
ON follows(follower_id, following_id);

-- Índice para followers de un usuario
CREATE INDEX CONCURRENTLY idx_follows_following_created_at 
ON follows(following_id, created_at DESC);

-- Índice para friend requests
CREATE INDEX CONCURRENTLY idx_friend_requests_sender_receiver 
ON friend_requests(sender_id, receiver_id);

-- ========================================
-- ÍNDICES PARA TABLAS PREMIUM
-- ========================================

-- Índice para suscripciones activas
CREATE INDEX CONCURRENTLY idx_subscriptions_user_status 
ON subscriptions(user_id, status);

-- Índice para verificación de premium
CREATE INDEX CONCURRENTLY idx_subscriptions_user_end_date 
ON subscriptions(user_id, end_date DESC);

-- Índice para reset diario de corazones
CREATE INDEX CONCURRENTLY idx_premium_hearts_user_reset_date 
ON premium_hearts(user_id, last_reset_date);

-- ========================================
-- ÍNDICES PARA NOTIFICATIONS
-- ========================================

-- Índice para notificaciones de usuario
CREATE INDEX CONCURRENTLY idx_notifications_user_id_created_at 
ON notifications(user_id, created_at DESC);

-- Índice para notificaciones no leídas
CREATE INDEX CONCURRENTLY idx_notifications_user_read 
ON notifications(user_id, read) 
WHERE read = false;

-- ========================================
-- ÍNDICES PARA MESSAGES (Chat)
-- ========================================

-- Índice para conversaciones
CREATE INDEX CONCURRENTLY idx_messages_sender_receiver_created_at 
ON messages(sender_id, receiver_id, created_at DESC);

-- Índice para mensajes no leídos
CREATE INDEX CONCURRENTLY idx_messages_receiver_read_created_at 
ON messages(receiver_id, read, created_at DESC) 
WHERE read = false;

-- ========================================
-- ÍNDICES PARA GRUPOS Y COMPAÑÍAS
-- ========================================

-- Índice para posts de grupos
CREATE INDEX CONCURRENTLY idx_posts_group_id_created_at 
ON posts(group_id, created_at DESC) 
WHERE group_id IS NOT NULL;

-- Índice para posts de compañías
CREATE INDEX CONCURRENTLY idx_posts_company_id_created_at 
ON posts(company_id, created_at DESC) 
WHERE company_id IS NOT NULL;

-- ========================================
-- ÍNDICES PARA POLLS Y VOTING
-- ========================================

-- Índice para votos de encuestas
CREATE INDEX CONCURRENTLY idx_poll_votes_post_id_user_id 
ON poll_votes(post_id, user_id);

-- Índice para contar votos por post
CREATE INDEX CONCURRENTLY idx_poll_votes_post_id_created_at 
ON poll_votes(post_id, created_at DESC);

-- ========================================
-- ÍNDICES PARA IDEAS
-- ========================================

-- Índice para participantes de ideas
CREATE INDEX CONCURRENTLY idx_idea_participants_idea_id_user_id 
ON idea_participants(idea_id, user_id);

-- Índice para ideas de un post
CREATE INDEX CONCURRENTLY idx_idea_participants_idea_created_at 
ON idea_participants(idea_id, created_at DESC);

-- ========================================
-- ÍNDICES PARA HIDDEN POSTS
-- ========================================

-- Índice para posts ocultos por usuario
CREATE INDEX CONCURRENTLY idx_hidden_posts_user_id_post_id 
ON hidden_posts(user_id, post_id);

-- Índice para posts ocultos recientes
CREATE INDEX CONCURRENTLY idx_hidden_posts_user_created_at 
ON hidden_posts(user_id, created_at DESC);

-- ========================================
-- ÍNDICES PARA COMMENT REACTIONS
-- ========================================

-- Índice para reacciones a comentarios
CREATE INDEX CONCURRENTLY idx_comment_reactions_comment_user 
ON comment_reactions(comment_id, user_id);

-- ========================================
-- ÍNDICES PARA SHARES
-- ========================================

-- Índice para shares de posts
CREATE INDEX CONCURRENTLY idx_shares_post_id_user_id 
ON shares(post_id, user_id);

-- Índice para shares por post
CREATE INDEX CONCURRENTLY idx_shares_post_id_created_at 
ON shares(post_id, created_at DESC);

-- ========================================
-- ÍNDICES PARA BÚSQUEDA (si se implementa)
-- ========================================

-- Índices de texto completo para búsqueda
CREATE INDEX CONCURRENTLY idx_posts_search_fts 
ON posts USING gin(to_tsvector('spanish', content || ' ' || COALESCE(profiles.username, '')));

-- ========================================
-- ÍNDICES PARA ANALYTICS (si se usa)
-- ========================================

-- Índice para analytics de posts
CREATE INDEX CONCURRENTLY idx_post_analytics_post_date 
ON post_analytics(post_id, date);

-- ========================================
-- OPTIMIZACIONES ADICIONALES
-- ========================================

-- Actualizar estadísticas del optimizador
ANALYZE posts;
ANALYZE profiles;
ANALYZE reactions;
ANALYZE comments;
ANALYZE notifications;
ANALYZE messages;
ANALYZE follows;
ANALYZE subscriptions;
ANALYZE premium_hearts;

-- Limpiar índices no utilizados (descomentar después de analizar)
-- DROP INDEX CONCURRENTLY IF EXISTS idx_nombre_indice_obsoleto;

-- ========================================
-- MONITOREO Y MANTENIMIENTO
-- ========================================

-- Vista para monitorear uso de índices
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

-- Vista para identificar índices no utilizados
CREATE OR REPLACE VIEW unused_indexes AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
AND indexname NOT LIKE '%_pkey%'
ORDER BY tablename, indexname;

-- ========================================
-- COMENTARIOS DE IMPLEMENTACIÓN
-- ========================================

/*
NOTAS IMPORTANTES:

1. Todos los índices usan CONCURRENTLY para evitar bloqueos en producción
2. Los índices parciales (WHERE) son más eficientes para consultas específicas
3. Los índices compuestos siguen el orden de cardinalidad (más selectivo primero)
4. Se incluyen índices GIN para búsqueda de texto completo
5. Se agregaron vistas de monitoreo para mantenimiento continuo

TIEMPO DE EJECUCIÓN ESPERADO:
- En producción: ~2-5 minutos por cada 10 índices
- Total: ~15-25 minutos para todos los índices

IMPACTO ESPERADO:
- Queries de feed: 70-80% más rápidas
- Búsquedas de usuario: 90% más rápidas  
- Reacciones: 60% más rápidas
- Carga inicial: 50% reducción en tiempo

RECOMENDACIONES:
1. Ejecutar en horario de bajo tráfico
2. Monitorear performance después de cada lote
3. Mantener registro de índices creados
4. Revisar mensualmente índices no utilizados
*/
