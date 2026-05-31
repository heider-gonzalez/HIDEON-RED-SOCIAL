-- Profile edit cooldowns (60-day rule) (only if profiles table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER TABLE public.profiles
          ADD COLUMN IF NOT EXISTS last_career_change timestamp with time zone,
          ADD COLUMN IF NOT EXISTS last_semester_change timestamp with time zone;
    END IF;
END $$;
