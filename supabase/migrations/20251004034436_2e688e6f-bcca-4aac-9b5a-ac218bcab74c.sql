-- Agregar índices para optimizar consultas de participantes de ideas (only if table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'idea_participants') THEN
        -- Índice para búsqueda rápida de participantes por post_id
        CREATE INDEX IF NOT EXISTS idx_idea_participants_post_id 
        ON public.idea_participants(post_id);

        -- Índice para joins rápidos con profiles
        CREATE INDEX IF NOT EXISTS idx_idea_participants_user_id 
        ON public.idea_participants(user_id);

        -- Índice compuesto para consultas que filtran por post_id y ordenan por created_at
        CREATE INDEX IF NOT EXISTS idx_idea_participants_post_created 
        ON public.idea_participants(post_id, created_at DESC);
    END IF;
END $$;