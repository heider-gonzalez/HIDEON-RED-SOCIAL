-- Add profile experiences table (scalable experience system) (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE TABLE IF NOT EXISTS public.profile_experiences (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          title text NOT NULL,
          company_name text NOT NULL,
          location text,
          start_date date,
          end_date date,
          is_current boolean NOT NULL DEFAULT false,
          description text,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS profile_experiences_profile_id_idx ON public.profile_experiences(profile_id);

        ALTER TABLE public.profile_experiences ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Anyone can view profile experiences" ON public.profile_experiences;
        DROP POLICY IF EXISTS "Users can add their own profile experiences" ON public.profile_experiences;
        DROP POLICY IF EXISTS "Users can update their own profile experiences" ON public.profile_experiences;
        DROP POLICY IF EXISTS "Users can delete their own profile experiences" ON public.profile_experiences;

        CREATE POLICY "Anyone can view profile experiences" ON public.profile_experiences
          FOR SELECT USING (true);

        CREATE POLICY "Users can add their own profile experiences" ON public.profile_experiences
          FOR INSERT WITH CHECK (auth.uid() = profile_id);

        CREATE POLICY "Users can update their own profile experiences" ON public.profile_experiences
          FOR UPDATE USING (auth.uid() = profile_id);

        CREATE POLICY "Users can delete their own profile experiences" ON public.profile_experiences
          FOR DELETE USING (auth.uid() = profile_id);
    END IF;
END $$;
