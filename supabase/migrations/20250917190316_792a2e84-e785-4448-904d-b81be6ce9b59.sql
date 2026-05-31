-- Crear tabla user_achievements que está siendo referenciada pero no existe (only if table doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_achievements') THEN
        CREATE TABLE public.user_achievements (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          achievement_type TEXT NOT NULL,
          achievement_data JSONB DEFAULT '{}',
          earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );

        -- Habilitar RLS para user_achievements
        ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

        -- Política para que los usuarios vean sus propios logros
        CREATE POLICY "Users can view their own achievements"
        ON public.user_achievements FOR SELECT
        USING (auth.uid() = user_id);

        -- Política para que el sistema pueda insertar logros
        CREATE POLICY "System can insert achievements"
        ON public.user_achievements FOR INSERT
        WITH CHECK (auth.uid() = user_id);

        -- Hacer la tabla disponible para realtime
        ALTER TABLE public.user_achievements REPLICA IDENTITY FULL;
    END IF;
END $$;