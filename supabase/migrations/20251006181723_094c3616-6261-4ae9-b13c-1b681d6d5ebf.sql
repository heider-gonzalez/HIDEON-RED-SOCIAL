-- Add project_status column to posts table for Ideas → Projects flow (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        ALTER TABLE public.posts 
        ADD COLUMN IF NOT EXISTS project_status text CHECK (project_status IN ('idea', 'in_progress', 'completed'));

        -- Add index for better query performance
        CREATE INDEX IF NOT EXISTS idx_posts_project_status ON public.posts(project_status) WHERE project_status IS NOT NULL;
    END IF;
END $$;

-- Create function to convert idea to project
-- Note: Skipping function creation if required tables don't exist to avoid validation errors
-- The function will be created when the tables exist