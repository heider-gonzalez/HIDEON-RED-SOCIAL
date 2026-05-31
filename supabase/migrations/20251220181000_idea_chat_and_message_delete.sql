-- Idea group chat + message delete permissions (only if posts table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        -- 1) Link each idea (post) to a private channel
        CREATE TABLE IF NOT EXISTS public.idea_channels (
          post_id uuid PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
          channel_id uuid NOT NULL REFERENCES public.canales(id) ON DELETE CASCADE,
          created_at timestamp with time zone NOT NULL DEFAULT now()
        );

        ALTER TABLE public.idea_channels ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view idea channels" ON public.idea_channels;
        CREATE POLICY "Users can view idea channels" ON public.idea_channels
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM public.posts p
            WHERE p.id = idea_channels.post_id
              AND p.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.idea_participants ip
            WHERE ip.post_id = idea_channels.post_id
              AND ip.user_id = auth.uid()
          )
        );

        DROP POLICY IF EXISTS "Idea owners can create idea channels" ON public.idea_channels;
        CREATE POLICY "Idea owners can create idea channels" ON public.idea_channels
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM public.posts p
            WHERE p.id = idea_channels.post_id
              AND p.user_id = auth.uid()
          )
        );
    END IF;
END $$;

-- 2) Allow deleting messages (own messages) in channels (private or public) - only if mensajes table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mensajes') THEN
        ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view messages" ON public.mensajes;
        CREATE POLICY "Users can view messages" ON public.mensajes
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM public.canales c
            WHERE c.id = mensajes.id_canal
              AND (
                NOT c.es_privado
                OR EXISTS (
                  SELECT 1
                  FROM public.miembros_canal mc
                  WHERE mc.id_canal = mensajes.id_canal
                    AND mc.id_usuario = auth.uid()
                )
              )
          )
        );

        DROP POLICY IF EXISTS "Users can insert messages" ON public.mensajes;
        CREATE POLICY "Users can insert messages" ON public.mensajes
        FOR INSERT
        WITH CHECK (
          auth.uid() = mensajes.id_autor
          AND EXISTS (
            SELECT 1
            FROM public.canales c
            WHERE c.id = mensajes.id_canal
              AND (
                NOT c.es_privado
                OR EXISTS (
                  SELECT 1
                  FROM public.miembros_canal mc
                  WHERE mc.id_canal = mensajes.id_canal
                    AND mc.id_usuario = auth.uid()
                )
              )
          )
        );

        DROP POLICY IF EXISTS "Users can delete own messages" ON public.mensajes;
        CREATE POLICY "Users can delete own messages" ON public.mensajes
        FOR DELETE
        USING (auth.uid() = mensajes.id_autor);
    END IF;
END $$;
