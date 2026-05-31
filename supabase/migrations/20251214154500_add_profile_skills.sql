-- Add profile skills table (scalable skill system) (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE TABLE IF NOT EXISTS public.profile_skills (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          skill_name text NOT NULL,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now(),
          UNIQUE(profile_id, skill_name)
        );

        CREATE INDEX IF NOT EXISTS profile_skills_profile_id_idx ON public.profile_skills(profile_id);

        ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Anyone can view profile skills" ON public.profile_skills
          FOR SELECT USING (true);

        CREATE POLICY "Users can add their own profile skills" ON public.profile_skills
          FOR INSERT WITH CHECK (auth.uid() = profile_id);

        CREATE POLICY "Users can update their own profile skills" ON public.profile_skills
          FOR UPDATE USING (auth.uid() = profile_id);

        CREATE POLICY "Users can delete their own profile skills" ON public.profile_skills
          FOR DELETE USING (auth.uid() = profile_id);
    END IF;
END $$;
