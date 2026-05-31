-- Add is_active column to profile_badges (only if profile_badges table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_badges') THEN
        ALTER TABLE public.profile_badges
        ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
    END IF;
END $$;
