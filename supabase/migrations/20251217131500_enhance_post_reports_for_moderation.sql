-- Enhance post_reports to support a complete moderation workflow (only if post_reports table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'post_reports') THEN
        -- Add missing columns for richer reporting and moderation status
        ALTER TABLE public.post_reports
          ADD COLUMN IF NOT EXISTS description TEXT,
          ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

        -- Add foreign keys (safe to re-run) - only if posts and profiles exist
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = 'post_reports'
                AND column_name = 'post_id'
            ) THEN
              BEGIN
                ALTER TABLE public.post_reports
                  ADD CONSTRAINT post_reports_post_id_fkey
                  FOREIGN KEY (post_id) REFERENCES public.posts(id)
                  ON DELETE CASCADE;
              EXCEPTION WHEN duplicate_object THEN
                -- ignore
              END;
            END IF;
        END IF;

        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = 'post_reports'
                AND column_name = 'user_id'
            ) THEN
              BEGIN
                ALTER TABLE public.post_reports
                  ADD CONSTRAINT post_reports_user_id_fkey
                  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
                  ON DELETE CASCADE;
              EXCEPTION WHEN duplicate_object THEN
                -- ignore
              END;
            END IF;
        END IF;

        -- Ensure RLS is enabled
        ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

        -- Allow moderators/admin to view all reports - only if app_role type exists
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
            DROP POLICY IF EXISTS "Moderators can view all post reports" ON public.post_reports;
            CREATE POLICY "Moderators can view all post reports"
            ON public.post_reports
            FOR SELECT
            TO authenticated
            USING (
              public.has_role('moderator'::public.app_role, (SELECT auth.uid()::text))
              OR public.has_role('admin'::public.app_role, (SELECT auth.uid()::text))
            );

            -- Allow moderators/admin to update reports (status/updated_at)
            DROP POLICY IF EXISTS "Moderators can update post reports" ON public.post_reports;
            CREATE POLICY "Moderators can update post reports"
            ON public.post_reports
            FOR UPDATE
            TO authenticated
            USING (
              public.has_role('moderator'::public.app_role, (SELECT auth.uid()::text))
              OR public.has_role('admin'::public.app_role, (SELECT auth.uid()::text))
            )
            WITH CHECK (
              public.has_role('moderator'::public.app_role, (SELECT auth.uid()::text))
              OR public.has_role('admin'::public.app_role, (SELECT auth.uid()::text))
            );
        END IF;

        -- Helpful indexes
        CREATE INDEX IF NOT EXISTS idx_post_reports_status_created_at
          ON public.post_reports(status, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_post_reports_post_id_created_at
          ON public.post_reports(post_id, created_at DESC);
    END IF;
END $$;
