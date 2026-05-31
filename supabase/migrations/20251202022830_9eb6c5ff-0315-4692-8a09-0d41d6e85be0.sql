-- Habilitar RLS en la tabla canales (only if canales table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'canales') THEN
        ALTER TABLE public.canales ENABLE ROW LEVEL SECURITY;

        -- Política para ver canales: todos pueden ver canales no privados o los que son miembros
        CREATE POLICY "Users can view public channels or channels they are members of"
        ON public.canales
        FOR SELECT
        USING (
          NOT es_privado 
          OR 
          EXISTS (
            SELECT 1 FROM public.miembros_canal 
            WHERE miembros_canal.id_canal = canales.id 
            AND miembros_canal.id_usuario = auth.uid()
          )
        );
    END IF;
END $$;

-- Habilitar RLS en la tabla miembros_canal (only if miembros_canal table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'miembros_canal') THEN
        ALTER TABLE public.miembros_canal ENABLE ROW LEVEL SECURITY;

        -- Política para ver miembros: solo miembros del canal pueden ver otros miembros
        CREATE POLICY "Users can view members of channels they belong to"
        ON public.miembros_canal
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.miembros_canal mc2
            WHERE mc2.id_canal = miembros_canal.id_canal 
            AND mc2.id_usuario = auth.uid()
          )
        );

        -- Política para agregar miembros: sistema puede agregar automáticamente
        CREATE POLICY "System can add members to channels"
        ON public.miembros_canal
        FOR INSERT
        WITH CHECK (true);
    END IF;
END $$;