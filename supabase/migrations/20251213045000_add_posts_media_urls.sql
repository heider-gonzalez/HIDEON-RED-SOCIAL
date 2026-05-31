-- Add media_urls column to posts table (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        ALTER TABLE public.posts
        ADD COLUMN IF NOT EXISTS media_urls text[];
    END IF;
END $$;
