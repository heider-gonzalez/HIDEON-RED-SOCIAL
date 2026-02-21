ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS intro_audio_url text,
  ADD COLUMN IF NOT EXISTS intro_audio_duration_seconds integer CHECK (intro_audio_duration_seconds BETWEEN 1 AND 30),
  ADD COLUMN IF NOT EXISTS intro_audio_is_active boolean NOT NULL DEFAULT false;
