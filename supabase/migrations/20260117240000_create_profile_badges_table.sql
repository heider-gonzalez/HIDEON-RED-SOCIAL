-- Create profile_badges table for user achievements (only if profiles table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE TABLE IF NOT EXISTS public.profile_badges (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          badge_type text NOT NULL,
          badge_name text NOT NULL,
          badge_description text,
          badge_icon text,
          badge_color text,
          earned_date timestamptz DEFAULT now(),
          created_at timestamptz DEFAULT now(),
          UNIQUE(profile_id, badge_type)
        );

        -- Enable RLS
        ALTER TABLE public.profile_badges ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist (to make migration idempotent)
        DROP POLICY IF EXISTS "Users can view their own badges" ON public.profile_badges;
        DROP POLICY IF EXISTS "Users can view public badges" ON public.profile_badges;
        DROP POLICY IF EXISTS "System can insert badges" ON public.profile_badges;
        DROP POLICY IF EXISTS "System can update badges" ON public.profile_badges;

        -- Policies
        CREATE POLICY "Users can view their own badges" ON public.profile_badges
          FOR SELECT USING (auth.uid() = profile_id);

        CREATE POLICY "Users can view public badges" ON public.profile_badges
          FOR SELECT USING (true);

        CREATE POLICY "System can insert badges" ON public.profile_badges
          FOR INSERT WITH CHECK (true);

        CREATE POLICY "System can update badges" ON public.profile_badges
          FOR UPDATE USING (true);

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_profile_badges_profile_id ON public.profile_badges(profile_id);
        CREATE INDEX IF NOT EXISTS idx_profile_badges_type ON public.profile_badges(badge_type);
    END IF;
END $$;
