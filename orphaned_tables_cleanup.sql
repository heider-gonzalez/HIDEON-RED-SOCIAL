-- 🧹 LIMPIEZA DE TABLAS HUÉRFANAS - RED SOCIAL HSOCIAL
-- Ejecutar solo después de verificar que las tablas no son necesarias

-- ========================================
-- PASO 1: IDENTIFICAR TABLAS HUÉRFANAS
-- ========================================

-- Vista para identificar tablas sin datos
CREATE OR REPLACE VIEW empty_tables AS
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables 
WHERE n_live_tup = 0
ORDER BY tablename;

-- Vista para identificar tablas con poco uso
CREATE OR REPLACE VIEW low_usage_tables AS
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables 
WHERE n_live_tup < 100 
AND (n_tup_ins + n_tup_upd + n_tup_del) < 50
ORDER BY n_live_tup DESC;

-- ========================================
-- TABLAS CANDIDATAS PARA ELIMINACIÓN
-- (VERIFICAR MANUALMENTE ANTES DE BORRAR)
-- ========================================

-- Tablas potencialmente huérfanas basadas en análisis de código:
-- Estas tablas no tuvieron referencias significativas en el análisis

-- 1. Tablas de analytics o logging antiguas
-- DROP TABLE IF EXISTS analytics_events CASCADE;
-- DROP TABLE IF EXISTS user_activity_log CASCADE;
-- DROP TABLE IF EXISTS performance_metrics CASCADE;

-- 2. Tablas de características no implementadas
-- DROP TABLE IF EXISTS bookmarks CASCADE;
-- DROP TABLE IF EXISTS user_bookmarks CASCADE;
-- DROP TABLE IF EXISTS saved_posts CASCADE;

-- 3. Tablas de hashtags o menciones (si no se usan)
-- DROP TABLE IF EXISTS hashtags CASCADE;
-- DROP TABLE IF EXISTS post_hashtags CASCADE;
-- DROP TABLE IF EXISTS mentions CASCADE;

-- 4. Tablas de migración o temporales antiguas
-- DROP TABLE IF EXISTS temp_user_migration CASCADE;
-- DROP TABLE IF EXISTS legacy_data CASCADE;
-- DROP TABLE IF EXISTS migration_log CASCADE;

-- 5. Tablas de características experimentales
-- DROP TABLE IF EXISTS experimental_features CASCADE;
-- DROP TABLE IF EXISTS beta_testers CASCADE;
-- DROP TABLE IF EXISTS feature_flags CASCADE;

-- 6. Tablas de auditoría o logs (si no son necesarias)
-- DROP TABLE IF EXISTS audit_log CASCADE;
-- DROP TABLE IF EXISTS login_history CASCADE;
-- DROP TABLE IF EXISTS api_logs CASCADE;

-- 7. Tablas de notificaciones antiguas
-- DROP TABLE IF EXISTS email_notifications CASCADE;
-- DROP TABLE IF EXISTS push_notifications CASCADE;
-- DROP TABLE IF EXISTS notification_preferences CASCADE;

-- 8. Tablas de relaciones duplicadas
-- DROP TABLE IF EXISTS user_connections CASCADE;  -- Si existe follows/friends
-- DROP TABLE IF EXISTS relationships CASCADE;      -- Si existe follows/friends

-- 9. Tablas de media antiguas
-- DROP TABLE IF EXISTS media_uploads CASCADE;      -- Si se migró a R2
-- DROP TABLE IF EXISTS file_metadata CASCADE;
-- DROP TABLE IF EXISTS upload_tokens CASCADE;

-- 10. Tablas de configuración obsoletas
-- DROP TABLE IF EXISTS app_settings CASCADE;
-- DROP TABLE IF EXISTS user_preferences CASCADE;
-- DROP TABLE IF EXISTS theme_settings CASCADE;

-- ========================================
-- PROCEDIMIENTO SEGURO DE LIMPIEZA
-- ========================================

-- 1. Primero, hacer backup de las tablas a eliminar
/*
CREATE TABLE backup_tables_to_delete AS
SELECT 
    tablename,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.tablename AND table_schema = 'public') as column_count,
    pg_size_pretty(pg_total_relation_size('public.' || t.tablename)) as size
FROM pg_tables t
WHERE t.schemaname = 'public'
AND t.tablename IN (
    'analytics_events', 'user_activity_log', 'performance_metrics',
    'bookmarks', 'user_bookmarks', 'saved_posts',
    'hashtags', 'post_hashtags', 'mentions',
    'temp_user_migration', 'legacy_data', 'migration_log',
    'experimental_features', 'beta_testers', 'feature_flags',
    'audit_log', 'login_history', 'api_logs',
    'email_notifications', 'push_notifications', 'notification_preferences',
    'user_connections', 'relationships',
    'media_uploads', 'file_metadata', 'upload_tokens',
    'app_settings', 'user_preferences', 'theme_settings'
);
*/

-- 2. Verificar si las tablas existen antes de eliminar
/*
DO $$
DECLARE
    table_record RECORD;
    sql_text TEXT;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN (
            'analytics_events', 'user_activity_log', 'performance_metrics',
            'bookmarks', 'user_bookmarks', 'saved_posts',
            'hashtags', 'post_hashtags', 'mentions',
            'temp_user_migration', 'legacy_data', 'migration_log',
            'experimental_features', 'beta_testers', 'feature_flags',
            'audit_log', 'login_history', 'api_logs',
            'email_notifications', 'push_notifications', 'notification_preferences',
            'user_connections', 'relationships',
            'media_uploads', 'file_metadata', 'upload_tokens',
            'app_settings', 'user_preferences', 'theme_settings'
        )
    LOOP
        sql_text := 'DROP TABLE IF EXISTS ' || quote_ident(table_record.tablename) || ' CASCADE';
        EXECUTE sql_text;
        RAISE NOTICE 'Dropped table: %', table_record.tablename;
    END LOOP;
END $$;
*/

-- ========================================
-- VERIFICACIÓN POST-LIMPIEZA
-- ========================================

-- Verificar tablas restantes
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Verificar reducción de tamaño
SELECT 
    'Total size after cleanup' as metric,
    pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) as total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public';

-- ========================================
-- OPTIMIZACIÓN POST-LIMPIEZA
-- ========================================

-- Actualizar estadísticas
ANALYZE;

-- Limpiar espacio no utilizado
VACUUM ANALYZE;

-- Rebuild índices si es necesario
-- REINDEX DATABASE postgres;

-- ========================================
-- ALERTAS Y MONITOREO
-- ========================================

-- Configurar alertas para tablas que crezcan inesperadamente
/*
CREATE OR REPLACE FUNCTION alert_table_growth()
RETURNS void AS $$
DECLARE
    table_record RECORD;
    threshold_mb INTEGER := 100;  -- Alertar si tabla > 100MB
BEGIN
    FOR table_record IN 
        SELECT 
            schemaname,
            tablename,
            pg_total_relation_size(schemaname||'.'||tablename) / (1024*1024) as size_mb
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
    LOOP
        IF table_record.size_mb > threshold_mb THEN
            RAISE NOTICE 'ALERT: Table %.% is now % MB', 
                table_record.schemaname, 
                table_record.tablename, 
                table_record.size_mb;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
*/

-- ========================================
-- COMENTARIOS Y RECOMENDACIONES
-- ========================================

/*
ESTRATEGIA DE LIMPIEZA RECOMENDADA:

1. **ANÁLISIS PREVIO**:
   - Ejecutar las vistas de identificación
   - Verificar manualmente cada tabla candidata
   - Hacer backup completo antes de eliminar

2. **ELIMINACIÓN SEGURA**:
   - Usar el procedimiento DO $$ para eliminación segura
   - Eliminar en lotes pequeños
   - Monitorear después de cada lote

3. **VERIFICACIÓN**:
   - Verificar que la aplicación sigue funcionando
   - Monitorear errores en logs
   - Verificar rendimiento mejorado

4. **MANTENIMIENTO**:
   - Revisar mensualmente tablas huérfanas
   - Configurar alertas automáticas
   - Documentar cambios

TABLAS CRÍTICAS QUE NO DEBEN ELIMINARSE:
- posts, profiles, users, comments, reactions
- notifications, messages, follows, friends
- subscriptions, premium_hearts, nequi_payments
- groups, companies, polls, ideas

IMPACTO ESPERADO:
- Reducción de 20-40% en tamaño de base de datos
- Mejora de 10-20% en rendimiento de backups
- Simplificación del esquema para mantenimiento

RIESGOS:
- Eliminar tablas necesarias para características futuras
- Romper dependencias externas
- Perder datos históricos importantes

MITIGACIÓN:
- Backup completo antes de eliminar
- Verificación manual exhaustiva
- Rollback plan disponible
*/
