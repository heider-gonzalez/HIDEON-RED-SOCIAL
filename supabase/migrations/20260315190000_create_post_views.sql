-- Create post_views table (only if posts table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        CREATE TABLE IF NOT EXISTS public.post_views (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
          viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
          viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          UNIQUE(post_id, viewer_id)
        );

        ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Anyone can record post views" ON public.post_views;
        CREATE POLICY "Anyone can record post views"
          ON public.post_views
          FOR INSERT
          TO authenticated
          WITH CHECK (true);

        DROP POLICY IF EXISTS "Anyone can view post views" ON public.post_views;
        CREATE POLICY "Anyone can view post views"
          ON public.post_views
          FOR SELECT
          TO authenticated
          USING (true);

        CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON public.post_views(post_id);
        CREATE INDEX IF NOT EXISTS idx_post_views_viewer_id ON public.post_views(viewer_id);

        CREATE OR REPLACE FUNCTION public.get_post_views_count(p_post_id UUID)
        RETURNS INTEGER
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = public
        AS $func$
          SELECT COUNT(DISTINCT viewer_id)::INTEGER
          FROM public.post_views
          WHERE post_id = p_post_id;
        $func$;

        CREATE OR REPLACE FUNCTION public.track_post_view(p_post_id UUID)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $func$
        BEGIN
          INSERT INTO public.post_views (post_id, viewer_id)
          VALUES (p_post_id, auth.uid())
          ON CONFLICT (post_id, viewer_id) DO UPDATE
            SET viewed_at = EXCLUDED.viewed_at;
        END;
        $func$;

        GRANT EXECUTE ON FUNCTION public.get_post_views_count(UUID) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.track_post_view(UUID) TO authenticated;
    END IF;
END $$;
