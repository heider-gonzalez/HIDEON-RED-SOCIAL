-- Profile edit cooldowns (60-day rule)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_career_change timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_semester_change timestamp with time zone;
