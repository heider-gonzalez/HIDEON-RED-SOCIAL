-- Poll voting support (poll_votes table + vote_on_poll RPC) (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        CREATE TABLE IF NOT EXISTS public.poll_votes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
          user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          option_id text NOT NULL,
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          UNIQUE (post_id, user_id)
        );

        ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'poll_votes'
            AND policyname = 'Users can insert their own poll votes'
        ) THEN
          CREATE POLICY "Users can insert their own poll votes"
          ON public.poll_votes
          FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'poll_votes'
            AND policyname = 'Users can read their own poll votes'
        ) THEN
          CREATE POLICY "Users can read their own poll votes"
          ON public.poll_votes
          FOR SELECT
          TO authenticated
          USING (auth.uid() = user_id);
        END IF;
    END IF;
END $$;

-- Note: Skipping function creation for vote_on_poll as it depends on posts and poll_votes tables
-- Function will be created when the required tables exist
