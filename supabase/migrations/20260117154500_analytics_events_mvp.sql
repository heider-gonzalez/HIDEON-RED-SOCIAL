-- Analytics Pro MVP: events + daily aggregates + RPCs (only if profiles table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        -- 1) Tables
        CREATE TABLE IF NOT EXISTS public.analytics_events (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
          event_type text NOT NULL,
          entity_type text NOT NULL,
          entity_id uuid,
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_analytics_events_owner_created_at
          ON public.analytics_events(owner_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_analytics_events_entity
          ON public.analytics_events(entity_type, entity_id);

        -- Prevent spam for logged-in users on same entity/event/day
        CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_events_dedupe_logged
          ON public.analytics_events(owner_id, actor_id, event_type, entity_type, entity_id, ((created_at AT TIME ZONE 'UTC')::date))
          WHERE actor_id IS NOT NULL AND entity_id IS NOT NULL;

        CREATE TABLE IF NOT EXISTS public.analytics_daily (
          owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          day date NOT NULL DEFAULT CURRENT_DATE,
          event_type text NOT NULL,
          count integer NOT NULL DEFAULT 0,
          PRIMARY KEY(owner_id, day, event_type)
        );

        CREATE TABLE IF NOT EXISTS public.analytics_daily_entity (
          owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          day date NOT NULL DEFAULT CURRENT_DATE,
          event_type text NOT NULL,
          entity_type text NOT NULL,
          entity_id uuid NOT NULL,
          count integer NOT NULL DEFAULT 0,
          PRIMARY KEY(owner_id, day, event_type, entity_type, entity_id)
        );

        -- 2) RLS
        ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.analytics_daily_entity ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS analytics_events_owner_read ON public.analytics_events;
        CREATE POLICY analytics_events_owner_read
          ON public.analytics_events
          FOR SELECT
          TO authenticated
          USING (auth.uid() = owner_id);

        DROP POLICY IF EXISTS analytics_events_no_direct_write ON public.analytics_events;
        CREATE POLICY analytics_events_no_direct_write
          ON public.analytics_events
          FOR ALL
          TO authenticated
          USING (false)
          WITH CHECK (false);

        DROP POLICY IF EXISTS analytics_daily_owner_read ON public.analytics_daily;
        CREATE POLICY analytics_daily_owner_read
          ON public.analytics_daily
          FOR SELECT
          TO authenticated
          USING (auth.uid() = owner_id);

        DROP POLICY IF EXISTS analytics_daily_no_direct_write ON public.analytics_daily;
        CREATE POLICY analytics_daily_no_direct_write
          ON public.analytics_daily
          FOR ALL
          TO authenticated
          USING (false)
          WITH CHECK (false);

        DROP POLICY IF EXISTS analytics_daily_entity_owner_read ON public.analytics_daily_entity;
        CREATE POLICY analytics_daily_entity_owner_read
          ON public.analytics_daily_entity
          FOR SELECT
          TO authenticated
          USING (auth.uid() = owner_id);

        DROP POLICY IF EXISTS analytics_daily_entity_no_direct_write ON public.analytics_daily_entity;
        CREATE POLICY analytics_daily_entity_no_direct_write
          ON public.analytics_daily_entity
          FOR ALL
          TO authenticated
          USING (false)
          WITH CHECK (false);
    END IF;
END $$;

-- 3) Fix project_views unique rule: only enforce uniqueness for logged-in viewers
-- Note: Skipping project_views ALTER and RPC functions as they depend on project_views, engagement_metrics, and other tables
-- These will be created when the required tables exist
