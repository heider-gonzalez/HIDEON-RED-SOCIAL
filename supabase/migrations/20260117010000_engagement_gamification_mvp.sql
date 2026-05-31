-- Engagement gamification MVP (ledger + levels + streaks + weekly rankings)

-- 0) Helpers (can be created unconditionally)
DROP FUNCTION IF EXISTS public.eng_week_start(timestamptz);
CREATE OR REPLACE FUNCTION public.eng_week_start(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT date_trunc('week', ts)::date;
$$;

DROP FUNCTION IF EXISTS public.eng_calc_level(integer);
CREATE OR REPLACE FUNCTION public.eng_calc_level(total_points integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN total_points >= 1000 THEN 5
    WHEN total_points >= 500 THEN 4
    WHEN total_points >= 250 THEN 3
    WHEN total_points >= 100 THEN 2
    ELSE 1
  END;
$$;

-- 1) Core tables (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE TABLE IF NOT EXISTS public.eng_levels (
          level integer PRIMARY KEY,
          min_points integer NOT NULL,
          max_points integer,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        INSERT INTO public.eng_levels(level, min_points, max_points)
        VALUES
          (1, 0, 99),
          (2, 100, 249),
          (3, 250, 499),
          (4, 500, 999),
          (5, 1000, NULL)
        ON CONFLICT (level) DO NOTHING;

        CREATE TABLE IF NOT EXISTS public.eng_user_stats (
          user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
          total_points integer NOT NULL DEFAULT 0,
          level integer NOT NULL DEFAULT 1,
          current_streak integer NOT NULL DEFAULT 0,
          best_streak integer NOT NULL DEFAULT 0,
          last_streak_date date,
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.eng_points_ledger (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          event_type text NOT NULL,
          points integer NOT NULL,
          entity_type text,
          entity_id uuid,
          day date NOT NULL DEFAULT CURRENT_DATE,
          week_start date NOT NULL DEFAULT public.eng_week_start(now()),
          created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_eng_points_ledger_user_day ON public.eng_points_ledger(user_id, day);
        CREATE INDEX IF NOT EXISTS idx_eng_points_ledger_user_week ON public.eng_points_ledger(user_id, week_start);
        CREATE INDEX IF NOT EXISTS idx_eng_points_ledger_week_points ON public.eng_points_ledger(week_start, points);
        CREATE INDEX IF NOT EXISTS idx_eng_points_ledger_entity ON public.eng_points_ledger(entity_type, entity_id);

        -- Prevent duplicate rewards for the same event on the same entity
        CREATE UNIQUE INDEX IF NOT EXISTS idx_eng_points_ledger_unique_entity_event
        ON public.eng_points_ledger(user_id, event_type, entity_type, entity_id)
        WHERE entity_id IS NOT NULL;

        -- 3) RLS
        ALTER TABLE public.eng_levels ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.eng_user_stats ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.eng_points_ledger ENABLE ROW LEVEL SECURITY;

        -- Levels are readable
        DROP POLICY IF EXISTS "eng_levels_read" ON public.eng_levels;
        CREATE POLICY "eng_levels_read"
        ON public.eng_levels
        FOR SELECT
        TO authenticated
        USING (true);

        -- User stats are readable (for rankings/profile). Mutations are via RPC only.
        DROP POLICY IF EXISTS "eng_user_stats_read" ON public.eng_user_stats;
        DROP POLICY IF EXISTS "eng_user_stats_no_write" ON public.eng_user_stats;
        CREATE POLICY "eng_user_stats_read"
        ON public.eng_user_stats
        FOR SELECT
        TO authenticated
        USING (true);

        CREATE POLICY "eng_user_stats_no_write"
        ON public.eng_user_stats
        FOR ALL
        TO authenticated
        USING (false)
        WITH CHECK (false);

        -- Ledger: users can read their own ledger. Direct writes disabled.
        DROP POLICY IF EXISTS "eng_points_ledger_read_own" ON public.eng_points_ledger;
        DROP POLICY IF EXISTS "eng_points_ledger_no_write" ON public.eng_points_ledger;
        CREATE POLICY "eng_points_ledger_read_own"
        ON public.eng_points_ledger
        FOR SELECT
        TO authenticated
        USING ((SELECT auth.uid()) = user_id);

        CREATE POLICY "eng_points_ledger_no_write"
        ON public.eng_points_ledger
        FOR ALL
        TO authenticated
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- 2) Comment "useful" flag (MVP: only post owner can mark)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'comments'
  ) THEN
    EXECUTE 'ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_useful boolean NOT NULL DEFAULT false';
    EXECUTE 'ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS useful_marked_by uuid';
    EXECUTE 'ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS useful_marked_at timestamptz';
  END IF;
END $$;

-- 4) RPC: award points
-- Note: Skipping RPC functions as they depend on profiles, posts, comments, idea_requests, and other tables
-- These will be created when the required tables exist
