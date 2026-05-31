-- Re-crear tablas esenciales que se eliminaron

-- Tabla friendships (esencial para amistades y seguidores)
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friendships" ON public.friendships
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their friendships" ON public.friendships
  FOR DELETE USING (auth.uid() = user_id);

-- Tabla idea_participants (para ideas colaborativas) - only if posts table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        CREATE TABLE IF NOT EXISTS public.idea_participants (
          id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
          user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          profession text,
          joined_at timestamp with time zone NOT NULL DEFAULT now(),
          UNIQUE(post_id, user_id)
        );

        ALTER TABLE public.idea_participants ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Anyone can view idea participants" ON public.idea_participants
          FOR SELECT USING (true);

        CREATE POLICY "Users can join ideas" ON public.idea_participants
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can leave ideas" ON public.idea_participants
          FOR DELETE USING (auth.uid() = user_id);

        CREATE INDEX IF NOT EXISTS idx_idea_participants_post_id ON public.idea_participants(post_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);