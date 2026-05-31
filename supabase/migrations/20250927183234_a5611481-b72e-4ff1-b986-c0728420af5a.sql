-- Simplificar sistema de seguidores - eliminar solicitudes de amistad
-- Crear nueva tabla simple de seguidores
CREATE TABLE IF NOT EXISTS public.followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Migrar datos existentes de friendships aceptadas a followers (only if friendships table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'friendships') THEN
        INSERT INTO public.followers (follower_id, following_id, created_at)
        SELECT user_id, friend_id, created_at 
        FROM public.friendships 
        WHERE status = 'accepted'
        ON CONFLICT (follower_id, following_id) DO NOTHING;

        -- Migrar datos inversos para mantener seguimientos bidireccionales
        INSERT INTO public.followers (follower_id, following_id, created_at)
        SELECT friend_id, user_id, created_at 
        FROM public.friendships 
        WHERE status = 'accepted'
        ON CONFLICT (follower_id, following_id) DO NOTHING;
    END IF;
END $$;

-- Habilitar RLS
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para followers
CREATE POLICY "Users can follow others" 
ON public.followers 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" 
ON public.followers 
FOR DELETE 
USING (auth.uid() = follower_id);

CREATE POLICY "Anyone can view followers" 
ON public.followers 
FOR SELECT 
USING (true);

-- Eliminar tablas antiguas después de migrar datos
DROP TABLE IF EXISTS public.friend_requests CASCADE;
DROP TABLE IF EXISTS public.friends CASCADE;