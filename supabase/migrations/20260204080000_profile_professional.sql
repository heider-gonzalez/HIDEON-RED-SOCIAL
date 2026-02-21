CREATE TABLE IF NOT EXISTS public.profile_professional (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  headline text,
  city text,
  work_mode text CHECK (work_mode IN ('remote', 'hybrid', 'onsite')),
  value_proposition text,
  seeking_tags text[] DEFAULT '{}'::text[],
  offering_tags text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_professional_profile_id ON public.profile_professional(profile_id);

CREATE TABLE IF NOT EXISTS public.profile_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  metric_label text,
  metric_value text,
  proof_url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_achievements_profile_id ON public.profile_achievements(profile_id);

ALTER TABLE public.profile_professional ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view professional profile" ON public.profile_professional;
CREATE POLICY "Anyone can view professional profile" ON public.profile_professional
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can upsert their professional profile" ON public.profile_professional;
CREATE POLICY "Users can upsert their professional profile" ON public.profile_professional
  FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Anyone can view achievements" ON public.profile_achievements;
CREATE POLICY "Anyone can view achievements" ON public.profile_achievements
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage their achievements" ON public.profile_achievements;
CREATE POLICY "Users can manage their achievements" ON public.profile_achievements
  FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profile_professional_updated_at ON public.profile_professional;
CREATE TRIGGER update_profile_professional_updated_at
  BEFORE UPDATE ON public.profile_professional
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profile_achievements_updated_at ON public.profile_achievements;
CREATE TRIGGER update_profile_achievements_updated_at
  BEFORE UPDATE ON public.profile_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
