-- Habilitar Realtime para la tabla posts (only if posts table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        ALTER TABLE public.posts REPLICA IDENTITY FULL;

        -- Agregar la tabla posts a la publicación de realtime (si no está ya)
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'posts'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
        END IF;
    END IF;
END $$;
