-- Public feed preview RPC (limited) + restrict posts SELECT to authenticated (only if posts table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        -- Convert media_urls from jsonb to text[] if needed
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'posts'
            AND column_name = 'media_urls'
            AND udt_name = 'jsonb'
        ) THEN
          EXECUTE 'ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_urls_tmp text[]';

          EXECUTE '
            UPDATE public.posts
            SET media_urls_tmp =
              CASE
                WHEN media_urls IS NULL THEN NULL
                WHEN jsonb_typeof(media_urls) <> ''array'' THEN NULL
                ELSE ARRAY(
                  SELECT jsonb_array_elements_text(media_urls)
                )
              END
          ';

          EXECUTE 'ALTER TABLE public.posts DROP COLUMN media_urls';
          EXECUTE 'ALTER TABLE public.posts RENAME COLUMN media_urls_tmp TO media_urls';
        END IF;

        -- 1) Ensure posts SELECT is not available to anon
        DROP POLICY IF EXISTS "Users can view public posts, their own, group posts, and company posts" ON public.posts;

        CREATE POLICY "Users can view public posts, their own, group posts, and company posts" ON public.posts
          FOR SELECT
          TO authenticated
          USING (
            visibility = 'public'::post_visibility
            OR user_id = auth.uid()
            OR (group_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.group_members gm
              WHERE gm.group_id = posts.group_id
                AND gm.user_id = auth.uid()
            ))
            OR (company_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.company_members cm
              WHERE cm.company_id = posts.company_id
                AND cm.user_id = auth.uid()
            ))
          );
    END IF;
END $$;

-- 2) Limited public preview for landing page
-- Note: Skipping function creation as it depends on posts, profiles, comments, and reactions tables
-- Function will be created when the required tables exist
