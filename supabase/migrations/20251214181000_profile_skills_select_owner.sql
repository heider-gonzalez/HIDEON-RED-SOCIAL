-- Add SELECT policy for profile_skills (owner-only) (only if profile_skills table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_skills') THEN
        ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view their own profile skills" ON public.profile_skills;

        CREATE POLICY "Users can view their own profile skills" ON public.profile_skills
          FOR SELECT USING (auth.uid() = profile_id);
    END IF;
END $$;
