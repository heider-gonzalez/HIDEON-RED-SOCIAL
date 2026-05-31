-- Add project_id column to idea_channels table (only if idea_channels table exists)
-- This allows chat channels to be linked to projects instead of just ideas

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'idea_channels') THEN
        ALTER TABLE public.idea_channels
        ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

        -- Add index for better query performance
        CREATE INDEX IF NOT EXISTS idx_idea_channels_project_id ON public.idea_channels(project_id);

        -- Update RLS policy to allow reading by project_id
        CREATE POLICY "Users can read idea channels by project" ON public.idea_channels
          FOR SELECT USING (
            auth.uid() IS NOT NULL AND (
              post_id IN (
                SELECT id FROM public.posts WHERE user_id = auth.uid()
              ) OR
              project_id IN (
                SELECT id FROM public.projects WHERE owner_id = auth.uid()
              ) OR
              EXISTS (
                SELECT 1 FROM public.idea_participants ip
                WHERE ip.post_id = idea_channels.post_id AND ip.user_id = auth.uid()
              )
            )
          );
    END IF;
END $$;
