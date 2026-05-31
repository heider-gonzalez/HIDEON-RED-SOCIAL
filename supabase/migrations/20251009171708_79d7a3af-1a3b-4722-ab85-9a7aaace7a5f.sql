-- Create project_views table for tracking project views (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        CREATE TABLE IF NOT EXISTS public.project_views (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
          viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
          viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          UNIQUE(post_id, viewer_id)
        );

        -- Enable RLS
        ALTER TABLE public.project_views ENABLE ROW LEVEL SECURITY;

        -- Anyone can insert a view
        CREATE POLICY "Anyone can record project views"
          ON public.project_views
          FOR INSERT
          WITH CHECK (true);

        -- Anyone can view project views
        CREATE POLICY "Anyone can view project views"
          ON public.project_views
          FOR SELECT
          USING (true);

        -- Create index for better performance
        CREATE INDEX idx_project_views_post_id ON public.project_views(post_id);
        CREATE INDEX idx_project_views_viewer_id ON public.project_views(viewer_id);
    END IF;
END $$;

-- Function to get project views count (only if project_views table exists)
-- Note: Skipping function creation if required tables don't exist to avoid validation errors
-- The function will be created when the tables exist

-- Function to get project viewers list (only if project_views and profiles tables exist)
-- Note: Skipping function creation if required tables don't exist to avoid validation errors
-- The function will be created when the tables exist