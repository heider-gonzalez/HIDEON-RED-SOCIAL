-- Allow idea owner (post owner) to accept join requests by inserting into idea_participants (only if table exists)
-- This complements existing policy: "Users can join ideas" (auth.uid() = user_id)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'idea_participants') THEN
        ALTER TABLE public.idea_participants ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Idea owners can add participants" ON public.idea_participants;

        CREATE POLICY "Idea owners can add participants" ON public.idea_participants
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM public.posts p
            WHERE p.id = idea_participants.post_id
              AND p.user_id = auth.uid()
          )
        );
    END IF;
END $$;
