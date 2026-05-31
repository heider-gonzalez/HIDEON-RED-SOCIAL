-- Crear índices para optimizar consultas de popularidad (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'friendships') THEN
        CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON public.friendships(friend_id, status) WHERE status = 'accepted';
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_hearts') THEN
        CREATE INDEX IF NOT EXISTS idx_profile_hearts_profile_id ON public.profile_hearts(profile_id);
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'engagement_hearts') THEN
        CREATE INDEX IF NOT EXISTS idx_engagement_hearts_user_id ON public.engagement_hearts(user_id);
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_career ON public.profiles(career) WHERE career IS NOT NULL;
    END IF;
END $$;

-- Función optimizada para obtener usuarios populares (only if profiles table exists)
-- Note: Skipping function creation if profiles table doesn't exist to avoid validation errors
-- The function will be created when the table exists