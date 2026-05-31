-- Add institution and academic role fields to profiles table (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS institution_name text,
        ADD COLUMN IF NOT EXISTS academic_role text CHECK (academic_role IN ('estudiante', 'profesor', 'egresado', 'otro'));
    END IF;
END $$;