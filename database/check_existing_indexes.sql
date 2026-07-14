-- 🔍 VERIFICAR ÍNDICES EXISTENTES Y ESQUEMA
-- Ejecuta esto para ver el estado actual

-- Ver todos los índices creados
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Ver estructura de tabla comments
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'comments' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver estructura de tabla notifications  
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver columnas de comments que podrían ser user_id
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'comments' 
AND table_schema = 'public'
AND (column_name LIKE '%user%' OR column_name LIKE '%author%' OR column_name LIKE '%profile%');

-- Ver columnas de notifications que podrían ser user_id
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
AND (column_name LIKE '%user%' OR column_name LIKE '%recipient%' OR column_name LIKE '%target%');
