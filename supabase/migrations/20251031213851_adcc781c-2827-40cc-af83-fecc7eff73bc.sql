-- Agregar columnas para estilos de contenido y archivos (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        ALTER TABLE posts 
        ADD COLUMN IF NOT EXISTS background_color TEXT,
        ADD COLUMN IF NOT EXISTS content_style JSONB;

        -- Crear índice para mejorar el rendimiento
        CREATE INDEX IF NOT EXISTS idx_posts_background_color ON posts(background_color);
    END IF;
END $$;