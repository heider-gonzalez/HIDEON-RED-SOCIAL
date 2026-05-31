-- Add status field to idea_participants table for approval workflow (only if idea_participants table exists)
-- This enables the creator to approve/reject join requests

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'idea_participants') THEN
        -- Add status column with constraint
        ALTER TABLE public.idea_participants
        ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected'));

        -- Update existing records to 'approved' (they were already joined before this change)
        UPDATE public.idea_participants
        SET status = 'approved'
        WHERE status IS NULL OR status = 'pending';

        -- Add index for better query performance on status
        CREATE INDEX IF NOT EXISTS idx_idea_participants_status ON public.idea_participants(status);

        -- Update RLS policies to allow idea owner to update participant status
        DROP POLICY IF EXISTS "Idea owners can add participants" ON public.idea_participants;
        DROP POLICY IF EXISTS "Idea owners can manage participants" ON public.idea_participants;
        DROP POLICY IF EXISTS "Users can request to join ideas" ON public.idea_participants;
        DROP POLICY IF EXISTS "Users can join ideas" ON public.idea_participants;
        DROP POLICY IF EXISTS "Users can leave ideas" ON public.idea_participants;
        DROP POLICY IF EXISTS "Anyone can view idea participants" ON public.idea_participants;

        CREATE POLICY "Idea owners can manage participants" ON public.idea_participants
        FOR ALL
        USING (
          EXISTS (
            SELECT 1
            FROM public.posts p
            WHERE p.id = idea_participants.post_id
              AND p.user_id = auth.uid()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM public.posts p
            WHERE p.id = idea_participants.post_id
              AND p.user_id = auth.uid()
          )
        );

        -- Ensure users can still join ideas (insert with pending status)
        CREATE POLICY "Users can request to join ideas" ON public.idea_participants
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);

        -- Ensure users can leave ideas
        CREATE POLICY "Users can leave ideas" ON public.idea_participants
        FOR DELETE
        USING (auth.uid() = user_id);

        -- Anyone can view participants (but status will be visible)
        CREATE POLICY "Anyone can view idea participants" ON public.idea_participants
        FOR SELECT USING (true);
    END IF;
END $$;
