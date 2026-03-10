-- Fix security vulnerability: Set search_path for functions to prevent mutable search path attacks

-- Fix get_anonymous_number function
ALTER FUNCTION public.get_anonymous_number() SET search_path = '';

-- Fix other functions that may have the same issue
ALTER FUNCTION public.is_premium_user(uuid) SET search_path = '';
ALTER FUNCTION public.get_hearts_limit(uuid) SET search_path = '';
ALTER FUNCTION public.reset_daily_hearts() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.toggle_post_pin(uuid, boolean) SET search_path = '';
ALTER FUNCTION public.save_user_story_privacy(uuid, text) SET search_path = '';
ALTER FUNCTION public.check_column_exists(text, text) SET search_path = '';
ALTER FUNCTION public.get_post_pin_status(uuid) SET search_path = '';
ALTER FUNCTION public.get_user_story_privacy(uuid) SET search_path = '';