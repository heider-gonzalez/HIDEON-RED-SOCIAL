-- Add technologies and demo_url fields to posts table for projects (only if posts table exists)
-- These fields will be used to store project metadata

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        -- Add technologies field (array of text)
        ALTER TABLE public.posts 
        ADD COLUMN IF NOT EXISTS technologies text[];

        -- Add demo_url field (text for URL)
        ALTER TABLE public.posts 
        ADD COLUMN IF NOT EXISTS demo_url text;

        -- Add indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_posts_technologies ON public.posts USING GIN (technologies);
        CREATE INDEX IF NOT EXISTS idx_posts_demo_url ON public.posts (demo_url) WHERE demo_url IS NOT NULL;

        -- Add comments for documentation
        COMMENT ON COLUMN public.posts.technologies IS 'Array of technologies used in the project (for project posts)';
        COMMENT ON COLUMN public.posts.demo_url IS 'Demo/preview URL for the project (for project posts)';
    END IF;
END $$;
