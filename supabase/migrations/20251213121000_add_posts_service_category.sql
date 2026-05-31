-- Add service_category column to posts table (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        alter table public.posts
        add column if not exists service_category text;
    END IF;
END $$;
