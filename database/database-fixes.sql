-- ========================================
-- FIXES PARA ERRORES DE SUPABASE
-- ========================================
-- Ejecuta estos comandos en tu base de datos Supabase

-- 1. Crear función RPC check_column_exists si no existe
CREATE OR REPLACE FUNCTION check_column_exists(table_name TEXT, column_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = check_column_exists.table_name
    AND column_name = check_column_exists.column_name
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$;

-- 2. Asegurar que la tabla profiles tenga las columnas necesarias
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'person',
ADD COLUMN IF NOT EXISTS person_status TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS career TEXT,
ADD COLUMN IF NOT EXISTS semester TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS institution_name TEXT,
ADD COLUMN IF NOT EXISTS academic_role TEXT;

-- 3. Verificar que la tabla posts tenga las columnas de sharing
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS shared_post_id UUID REFERENCES posts(id),
ADD COLUMN IF NOT EXISTS shared_from UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- 4. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_posts_shared_post_id ON posts(shared_post_id);
CREATE INDEX IF NOT EXISTS idx_posts_shared_from ON posts(shared_from);
CREATE INDEX IF NOT EXISTS idx_posts_is_shared ON posts(is_shared);
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned);

-- 5. Configurar RLS (Row Level Security) si no está configurado
-- Asegurar que las políticas existan para las nuevas columnas

-- 6. Grant permissions para la función RPC
GRANT EXECUTE ON FUNCTION check_column_exists TO anon, authenticated;

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Verificar que la función existe
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'check_column_exists' 
AND routine_schema = 'public';

-- Verificar columnas en profiles
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
AND column_name IN ('account_type', 'person_status', 'company_name');

-- Verificar columnas en posts
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'posts' 
AND table_schema = 'public'
AND column_name IN ('shared_post_id', 'shared_from', 'is_shared', 'is_pinned');
