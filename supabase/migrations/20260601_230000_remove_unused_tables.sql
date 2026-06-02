-- Remove unused tables to optimize database
-- These tables have 0 rows and are not referenced in the codebase

DROP TABLE IF EXISTS public.event_registrations CASCADE;
DROP TABLE IF EXISTS public.music_tracks CASCADE;
DROP TABLE IF EXISTS public.nequi_payments CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.user_music_favorites CASCADE;
DROP TABLE IF EXISTS public.user_recent_tracks CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.user_streaks CASCADE;
DROP TABLE IF EXISTS public.premium_hearts CASCADE;
DROP TABLE IF EXISTS public.premium_incognito_posts CASCADE;
DROP TABLE IF EXISTS public.project_applications CASCADE;
DROP TABLE IF EXISTS public.project_interests CASCADE;
DROP TABLE IF EXISTS public.project_joins CASCADE;
DROP TABLE IF EXISTS public.project_showcases CASCADE;
