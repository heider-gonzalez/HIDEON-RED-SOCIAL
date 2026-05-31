-- Add missing post_metadata column used across the app (only if posts table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        ALTER TABLE posts
        ADD COLUMN IF NOT EXISTS post_metadata JSONB;
    END IF;
END $$;
