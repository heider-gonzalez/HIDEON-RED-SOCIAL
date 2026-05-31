-- MVP: Project applications (apply to collaborate) with RLS (only if posts table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        CREATE TABLE IF NOT EXISTS public.project_applications (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
          applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          message text,
          status text NOT NULL DEFAULT 'pending',
          created_at timestamptz NOT NULL DEFAULT now(),

          UNIQUE (post_id, applicant_id)
        );

        CREATE INDEX IF NOT EXISTS idx_project_applications_post_id_created_at
          ON public.project_applications(post_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_project_applications_applicant_id_created_at
          ON public.project_applications(applicant_id, created_at DESC);

        ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS project_applications_select ON public.project_applications;
        CREATE POLICY project_applications_select
          ON public.project_applications
          FOR SELECT
          TO authenticated
          USING (
            auth.uid() = applicant_id
            OR EXISTS (
              SELECT 1
              FROM public.posts p
              WHERE p.id = project_applications.post_id
                AND p.user_id = auth.uid()
            )
          );

        DROP POLICY IF EXISTS project_applications_insert ON public.project_applications;
        CREATE POLICY project_applications_insert
          ON public.project_applications
          FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = applicant_id);

        DROP POLICY IF EXISTS project_applications_update_owner ON public.project_applications;
        CREATE POLICY project_applications_update_owner
          ON public.project_applications
          FOR UPDATE
          TO authenticated
          USING (
            EXISTS (
              SELECT 1
              FROM public.posts p
              WHERE p.id = project_applications.post_id
                AND p.user_id = auth.uid()
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1
              FROM public.posts p
              WHERE p.id = project_applications.post_id
                AND p.user_id = auth.uid()
            )
          );

        DROP POLICY IF EXISTS project_applications_delete_applicant ON public.project_applications;
        CREATE POLICY project_applications_delete_applicant
          ON public.project_applications
          FOR DELETE
          TO authenticated
          USING (auth.uid() = applicant_id);
    END IF;
END $$;
