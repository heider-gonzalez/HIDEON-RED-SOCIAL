-- Create separate projects table to properly manage projects
-- This addresses the issue where projects were just posts with a status change

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_idea_id ON public.projects(idea_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view projects
CREATE POLICY "Anyone can view projects" ON public.projects
  FOR SELECT USING (true);

-- Policy: Only project owner can update project
CREATE POLICY "Project owners can update projects" ON public.projects
  FOR UPDATE USING (auth.uid() = owner_id);

-- Policy: Only project owner can delete project
CREATE POLICY "Project owners can delete projects" ON public.projects
  FOR DELETE USING (auth.uid() = owner_id);

-- Policy: Authenticated users can insert projects (will be restricted by RPC)
CREATE POLICY "Authenticated users can insert projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_projects_updated_at();
