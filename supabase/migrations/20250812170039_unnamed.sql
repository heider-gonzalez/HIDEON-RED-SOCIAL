-- SECURITY HARDENING MIGRATION
-- 1) Lock down overly permissive "system" policies to service_role only

-- nequi_payments (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'nequi_payments') THEN
        DROP POLICY IF EXISTS "System can manage payments" ON public.nequi_payments;
        CREATE POLICY "System can manage payments"
        ON public.nequi_payments
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

        DROP POLICY IF EXISTS "Users can view their own payments" ON public.nequi_payments;
        CREATE POLICY "Users can view their own payments"
        ON public.nequi_payments
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- engagement_hearts (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'engagement_hearts') THEN
        DROP POLICY IF EXISTS "System can insert engagement hearts" ON public.engagement_hearts;
        CREATE POLICY "System can insert engagement hearts"
        ON public.engagement_hearts
        FOR INSERT
        TO service_role
        WITH CHECK (true);
    END IF;
END $$;

-- engagement_rewards_log (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'engagement_rewards_log') THEN
        DROP POLICY IF EXISTS "System can insert rewards" ON public.engagement_rewards_log;
        CREATE POLICY "System can insert rewards"
        ON public.engagement_rewards_log
        FOR INSERT
        TO service_role
        WITH CHECK (true);
    END IF;
END $$;

-- engagement_metrics (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'engagement_metrics') THEN
        DROP POLICY IF EXISTS "System can manage metrics" ON public.engagement_metrics;
        CREATE POLICY "System can manage metrics"
        ON public.engagement_metrics
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- premium_hearts (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'premium_hearts') THEN
        DROP POLICY IF EXISTS "System can manage premium hearts" ON public.premium_hearts;
        CREATE POLICY "System can manage premium hearts"
        ON public.premium_hearts
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- premium_profile_viewers (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'premium_profile_viewers') THEN
        DROP POLICY IF EXISTS "System can insert profile viewers" ON public.premium_profile_viewers;
        CREATE POLICY "System can insert profile viewers"
        ON public.premium_profile_viewers
        FOR INSERT
        TO service_role
        WITH CHECK (true);
    END IF;
END $$;

-- user_achievements (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_achievements') THEN
        DROP POLICY IF EXISTS "System can manage achievements" ON public.user_achievements;
        CREATE POLICY "System can manage achievements"
        ON public.user_achievements
        FOR INSERT
        TO service_role
        WITH CHECK (true);
    END IF;
END $$;

-- user_streaks (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_streaks') THEN
        DROP POLICY IF EXISTS "System can manage streaks" ON public.user_streaks;
        CREATE POLICY "System can manage streaks"
        ON public.user_streaks
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- subscriptions (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
        DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;
        CREATE POLICY "System can insert subscriptions"
        ON public.subscriptions
        FOR INSERT
        TO service_role
        WITH CHECK (true);
    END IF;
END $$;

-- profile_views (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_views') THEN
        DROP POLICY IF EXISTS "System can track views" ON public.profile_views;
        CREATE POLICY "System can track views"
        ON public.profile_views
        FOR INSERT
        TO service_role
        WITH CHECK (true);
    END IF;
END $$;


-- 2) Fix data visibility on posts/comments/story views/reports (only if tables exist)

-- posts: remove global select policy that exposed private posts
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        DROP POLICY IF EXISTS "Cualquiera puede ver los posts" ON public.posts;
    END IF;
END $$;

-- comments: only allow viewing when
--  - the comment is yours, OR
--  - the post is public, OR
--  - you are the post owner
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comments') THEN
        DROP POLICY IF EXISTS "Cualquiera puede ver los comentarios" ON public.comments;
        CREATE POLICY "View comments for public posts or own"
        ON public.comments
        FOR SELECT
        TO authenticated
        USING (
          (EXISTS (
            SELECT 1 FROM public.posts p 
            WHERE p.id = comments.post_id 
              AND p.visibility = 'public'
          ))
          OR (auth.uid() = comments.user_id)
          OR (EXISTS (
            SELECT 1 FROM public.posts p2 
            WHERE p2.id = comments.post_id 
              AND p2.user_id = auth.uid()
          ))
        );
    END IF;
END $$;

-- post_reports: restrict view to report owners only
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'post_reports') THEN
        DROP POLICY IF EXISTS "Anyone can view post reports" ON public.post_reports;
        CREATE POLICY "Users can view their own post reports"
        ON public.post_reports
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- story_views: restrict listing views
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'story_views') THEN
        DROP POLICY IF EXISTS "Users can view story_views" ON public.story_views;
        CREATE POLICY "Story owners can view views"
        ON public.story_views
        FOR SELECT
        TO authenticated
        USING (
          auth.uid() = (
            SELECT s.user_id FROM public.stories s WHERE s.id = story_views.story_id
          )
        );
        CREATE POLICY "Viewers can view their own views"
        ON public.story_views
        FOR SELECT
        TO authenticated
        USING (auth.uid() = viewer_id);
    END IF;
END $$;


-- 3) Storage hardening: secure buckets and per-user paths
-- Make 'cvs' bucket private (potential PII)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'cvs') THEN
        UPDATE storage.buckets SET public = false WHERE id = 'cvs';
    END IF;
END $$;

-- Profiles bucket: public read, per-user write
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'profiles');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Media bucket (private): per-user full management
DROP POLICY IF EXISTS "Users can manage their own media" ON storage.objects;
CREATE POLICY "Users can manage their own media"
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- CVs bucket (now private): per-user full management
DROP POLICY IF EXISTS "Users can manage their own cvs" ON storage.objects;
CREATE POLICY "Users can manage their own cvs"
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'cvs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'cvs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Audio messages bucket (private): per-user full management
DROP POLICY IF EXISTS "Users can manage their own audio messages" ON storage.objects;
CREATE POLICY "Users can manage their own audio messages"
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'audio-messages' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'audio-messages' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
