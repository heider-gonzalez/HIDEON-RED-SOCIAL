-- Primero, vamos a ver la estructura de las tablas
-- Ejecuta esto primero para entender tu schema

-- Ver estructura de la tabla posts
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'posts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver estructura de la tabla reactions (si existe)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reactions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver si hay alguna tabla que contenga reacciones
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%reaction%' OR table_name LIKE '%post%')
ORDER BY table_name;
