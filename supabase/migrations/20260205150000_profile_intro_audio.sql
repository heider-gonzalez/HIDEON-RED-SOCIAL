-- Add intro audio columns to profiles (only if profiles table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER TABLE public.profiles
          ADD COLUMN IF NOT EXISTS intro_audio_url text,
          ADD COLUMN IF NOT EXISTS intro_audio_duration_seconds integer CHECK (intro_audio_duration_seconds BETWEEN 1 AND 30),
          ADD COLUMN IF NOT EXISTS intro_audio_is_active boolean NOT NULL DEFAULT false;
    END IF;
END $$;
