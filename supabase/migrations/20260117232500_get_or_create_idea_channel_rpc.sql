-- Get or create idea channel RPC (only if idea_channels table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'idea_channels') THEN
        ALTER TABLE public.idea_channels ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Note: Skipping function creation as it depends on idea_channels, posts, canales, idea_participants, and miembros_canal tables
-- This will be created when the required tables exist
