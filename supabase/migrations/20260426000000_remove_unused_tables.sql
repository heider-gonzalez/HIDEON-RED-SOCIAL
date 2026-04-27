-- Remove unused tables with 0 rows and no frontend usage
DROP TABLE IF EXISTS public.event_registrations;
DROP TABLE IF EXISTS public.idea_chat_messages;
DROP TABLE IF EXISTS public.idea_chats;
DROP TABLE IF EXISTS public.music_tracks;
DROP TABLE IF EXISTS public.user_music_favorites;
DROP TABLE IF EXISTS public.user_recent_tracks;
DROP TABLE IF EXISTS public.track_categories;
DROP TABLE IF EXISTS public.project_interests;
DROP TABLE IF EXISTS public.notification_preferences;
