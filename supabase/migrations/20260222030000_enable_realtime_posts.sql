-- Habilitar Realtime para la tabla posts
ALTER TABLE public.posts REPLICA IDENTITY FULL;

-- Agregar la tabla posts a la publicación de realtime (si no está ya)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;
END $$;
