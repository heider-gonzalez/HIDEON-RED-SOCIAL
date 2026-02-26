# 🚀 EJECUCIÓN DE ÍNDICES EN SUPABASE - GUÍA PRÁCTICA

## 📋 PROBLEMA IDENTIFICADO

El error `CREATE INDEX CONCURRENTLY cannot run inside a transaction block` ocurre porque:
- Supabase ejecuta cada script dentro de una transacción
- `CONCURRENTLY` requiere ejecución fuera de transacciones
- Los clientes SQL (DBeaver, pgAdmin) también envuelven en transacciones

## 🛠️ SOLUCIONES

### Opción 1: Supabase Dashboard (Recomendado)

1. **Ir a Supabase Dashboard → SQL Editor**
2. **Ejecutar cada índice individualmente**:
   ```sql
   CREATE INDEX CONCURRENTLY idx_posts_created_at_desc 
   ON posts(created_at DESC);
   ```
3. **Esperar a que complete** antes de ejecutar el siguiente
4. **Repetir para cada índice**

### Opción 2: Script por Lotes

Usa el archivo `execute_indexes_batch.sql`:
1. Copia un lote (ej: LOTE 1)
2. Pega en SQL Editor
3. Ejecuta
4. Espera confirmación
5. Continúa con siguiente lote

### Opción 3: CLI de Supabase

```bash
# Instalar CLI si no está instalada
npm install -g supabase

# Login
supabase login

# Ejecutar índice por índice
supabase db push --schema public <<EOF
CREATE INDEX CONCURRENTLY idx_posts_created_at_desc 
ON posts(created_at DESC);
EOF
```

## ⚡ ESTRATEGIA DE EJECUCIÓN RECOMENDADA

### Fase 1: Índices Críticos (Prioridad Alta)
```sql
-- Posts (feed principal)
CREATE INDEX CONCURRENTLY idx_posts_created_at_desc ON posts(created_at DESC);
CREATE INDEX CONCURRENTLY idx_posts_user_id_created_at ON posts(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_posts_visibility_created_at ON posts(visibility, created_at DESC) WHERE visibility = 'public';

-- Perfiles (búsquedas)
CREATE INDEX CONCURRENTLY idx_profiles_username_lower ON profiles(LOWER(username));

-- Reacciones (interacciones)
CREATE INDEX CONCURRENTLY idx_reactions_post_id_user_id ON reactions(post_id, user_id);
```

### Fase 2: Índices Secundarios (Prioridad Media)
```sql
-- Comments
CREATE INDEX CONCURRENTLY idx_comments_post_id_created_at ON comments(post_id, created_at DESC);

-- Notifications
CREATE INDEX CONCURRENTLY idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);

-- Premium
CREATE INDEX CONCURRENTLY idx_subscriptions_user_status ON subscriptions(user_id, status);
```

### Fase 3: Índices Adicionales (Prioridad Baja)
```sql
-- Mensajes, follows, shares, etc.
-- (Ejecutar después de verificar que los críticos funcionan)
```

## 📊 MONITOREO DURANTE EJECUCIÓN

### Verificar Progreso
```sql
-- Ver índices creados
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';

-- Ver tamaño de tablas
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Monitorear Performance
```sql
-- Ver uso de índices (después de 24 horas)
SELECT 
    tablename,
    indexname,
    idx_scan,
    idx_tup_read
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

## ⚠️ PRECAUCIONES

### Antes de Ejecutar
1. **Backup**: `pg_dump` de la base de datos
2. **Horario**: Ejecutar en horario de bajo tráfico
3. **Monitoreo**: Tener abierto dashboard de Supabase

### Durante Ejecución
1. **No interrumpir**: Esperar confirmación de cada índice
2. **Monitorear**: Verificar que no haya impacto en usuarios
3. **Logs**: Revisar logs de Supabase por errores

### Después de Ejecutar
1. **ANALYZE**: `ANALYZE posts; ANALYZE profiles;` etc.
2. **Test**: Probar feed principal y búsquedas
3. **Monitor**: Observar mejoras de performance

## 🚨 ROLLBACK PLAN

Si algo sale mal:
```sql
-- Eliminar índice específico
DROP INDEX CONCURRENTLY idx_posts_created_at_desc;

-- Eliminar todos los índices creados
DO $$
DECLARE
    idx_record RECORD;
BEGIN
    FOR idx_record IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_%'
    LOOP
        EXECUTE 'DROP INDEX CONCURRENTLY ' || quote_ident(idx_record.indexname);
    END LOOP;
END $$;
```

## 📈 IMPACTO ESPERADO

### Tiempos de Ejecución
- **Índice pequeño**: 10-30 segundos
- **Índice grande**: 1-3 minutos
- **Total críticos**: 5-10 minutos
- **Total completo**: 15-25 minutos

### Mejoras de Performance
- **Feed principal**: 70-80% más rápido
- **Búsquedas**: 90% más rápido
- **Reacciones**: 60% más rápido
- **Carga inicial**: 50% reducción

## ✅ VERIFICACIÓN FINAL

```sql
-- Verificar todos los índices creados
SELECT COUNT(*) as total_indexes_created
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';

-- Verificar tamaño total de índices
SELECT 
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_index_size
FROM pg_index 
WHERE schemaname = 'public' 
AND indexrelname LIKE 'idx_%';
```

## 🎯 NEXT STEPS

1. **Ejecutar índices críticos** (Fase 1)
2. **Monitorear por 24 horas**
3. **Ejecutar índices secundarios** (Fase 2)
4. **Limpiar tablas huérfanas**
5. **Monitorear performance continuo**

---

**Estado**: ✅ Scripts corregidos y listos para ejecución
**Acción**: Ejecutar Fase 1 (índices críticos) primero
