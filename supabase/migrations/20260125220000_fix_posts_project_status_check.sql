-- Fix posts_project_status_check to accept both 'in_progress' and 'En desarrollo'
-- This resolves the 409 Conflict when users publish with project_status = 'En desarrollo' (only if posts table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        -- First, update any existing rows that might violate the new constraint
        UPDATE public.posts
        SET project_status = 'En desarrollo'
        WHERE project_status NOT IN ('idea', 'in_progress', 'En desarrollo', 'En desarrollo')
          AND project_status IS NOT NULL;

        -- Drop the old restrictive check
        ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_project_status_check;

        -- Create a new check that accepts both English and Spanish values
        ALTER TABLE public.posts
        ADD CONSTRAINT posts_project_status_check
        CHECK ((project_status = ANY (ARRAY['idea'::text, 'in_progress'::text, 'En desarrollo'::text, 'En desarrollo'::text, 'En desarrollo'::text, 'En desarrollo'::text])));

        -- Add comment for clarity
        COMMENT ON CONSTRAINT posts_project_status_check ON public.posts IS 'Allows project status: idea, in_progress, En desarrollo, En desarrollo, En desarrollo, or En desarrollo';
    END IF;
END $$;
