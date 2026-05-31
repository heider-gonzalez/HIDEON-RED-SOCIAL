-- Create post_reports table to support reporting videos (reels)
CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone can view post reports" ON public.post_reports;
CREATE POLICY "Anyone can view post reports"
ON public.post_reports
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can create their own post reports" ON public.post_reports;
CREATE POLICY "Users can create their own post reports"
ON public.post_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own post reports" ON public.post_reports;
CREATE POLICY "Users can delete their own post reports"
ON public.post_reports
FOR DELETE
USING (auth.uid() = user_id);

-- Prevent duplicate reports per user per post
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_reports_unique ON public.post_reports (post_id, user_id);

-- Performance index for counting per post
CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON public.post_reports (post_id);