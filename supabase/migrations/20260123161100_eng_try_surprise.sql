-- Engagement surprise rewards (only if profiles table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE TABLE IF NOT EXISTS public.eng_surprise_rewards (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          day date NOT NULL DEFAULT CURRENT_DATE,
          source_event text NOT NULL,
          entity_type text,
          entity_id uuid,
          awarded_points integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_eng_surprise_rewards_user_day ON public.eng_surprise_rewards(user_id, day);

        ALTER TABLE public.eng_surprise_rewards ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "eng_surprise_rewards_read_own" ON public.eng_surprise_rewards;
        DROP POLICY IF EXISTS "eng_surprise_rewards_no_write" ON public.eng_surprise_rewards;

        CREATE POLICY "eng_surprise_rewards_read_own"
        ON public.eng_surprise_rewards
        FOR SELECT
        TO authenticated
        USING ((SELECT auth.uid()) = user_id);

        CREATE POLICY "eng_surprise_rewards_no_write"
        ON public.eng_surprise_rewards
        FOR ALL
        TO authenticated
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Note: Skipping function creation as it depends on profiles, eng_points_ledger, eng_user_stats, and profile_badges tables
-- This will be created when the required tables exist
