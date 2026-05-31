-- Permitir que cualquier usuario (autenticado o no) pueda ver datos públicos de perfiles (only if table exists)
-- Esto es necesario para ver participantes de ideas, reacciones, comentarios, etc.

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE POLICY "Anyone can view public profile data"
        ON public.profiles
        FOR SELECT
        TO public
        USING (true);
    END IF;
END $$;

-- Nota: Esta política solo permite SELECT (lectura), no escritura
-- Los datos sensibles siguen protegidos por otras políticas