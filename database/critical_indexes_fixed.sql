-- 🚀 ÍNDICES CRÍTICOS PARA RED SOCIAL HSOCIAL (VERSIÓN CORREGIDA)
-- Optimización de alto rendimiento para latencia Colombia-US
-- 
-- IMPORTANTE: Este script está diseñado para ejecutarse fuera de transacciones
-- Ejecutar línea por línea o en lotes pequeños
-- 
-- USO:
-- 1. Copiar y pegar cada CREATE INDEX individualmente en tu cliente SQL
-- 2. O ejecutar en lotes de 5-10 índices a la vez

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
-- OPTIMIZACIONES POST-CREACIÓN
-- ========================================

-- Actualizar estadísticas del optimizador (ejecutar después de crear todos los índices)
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
-- VISTAS DE MONITOREO
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
-- INSTRUCCIONES DE EJECUCIÓN
-- ========================================

/*
OPCIONES DE EJECUCIÓN:

1. EJECUCIÓN MANUAL (RECOMENDADO):
   - Copiar 5-10 CREATE INDEX a la vez
   - Esperar a que completen antes de continuar
   - Monitorear progreso con: \d+ nombre_tabla

2. EJECUCIÓN AUTOMÁTICA:
   - Usar script bash que ejecuta línea por línea
   - Ejemplo: while read line; do echo "$line" | psql ...; done < critical_indexes_fixed.sql

3. EJECUCIÓN POR LOTES:
   - Separar en archivos: indexes_posts.sql, indexes_profiles.sql, etc.
   - Ejecutar cada archivo por separado

TIEMPOS ESPERADOS:
- Cada índice: 30 segundos - 2 minutos (dependiendo del tamaño de la tabla)
- Total: 15-30 minutos para todos los índices

VERIFICACIÓN:
- Verificar índices creados: \di
- Monitorear uso: SELECT * FROM index_usage_stats LIMIT 10;
- Identificar no usados: SELECT * FROM unused_indexes;

ROLLBACK:
- Eliminar índice: DROP INDEX CONCURRENTLY nombre_indice;
- Eliminar todos los índices creados: DROP INDEX CONCURRENTLY idx_*;
*/
