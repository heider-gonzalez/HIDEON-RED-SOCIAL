
-- Create comment reports table to store reports about comments (only if comments table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comments') THEN
        CREATE TABLE IF NOT EXISTS public.comment_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          reason TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        -- Create unique constraint to prevent multiple reports from the same user
        CREATE UNIQUE INDEX IF NOT EXISTS comment_reports_user_comment_idx ON public.comment_reports (user_id, comment_id);

        -- Add RLS policies for comment reports
        ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

        -- Users can view their own reports
        CREATE POLICY "Users can view their own reports" ON public.comment_reports
          FOR SELECT USING (auth.uid() = user_id);

        -- Users can create reports
        CREATE POLICY "Users can create reports" ON public.comment_reports
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        -- Users cannot update reports
        CREATE POLICY "Users cannot update reports" ON public.comment_reports
          FOR UPDATE USING (false);

        -- Users cannot delete reports
        CREATE POLICY "Users cannot delete reports" ON public.comment_reports
          FOR DELETE USING (false);
    END IF;
END $$;
