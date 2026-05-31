-- Fix security vulnerability: Set search_path for functions to prevent mutable search path attacks

-- Fix get_anonymous_number function (only if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'get_anonymous_number' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.get_anonymous_number() SET search_path = '';
    END IF;
END $$;

-- Fix other functions that may have the same issue (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'is_premium_user' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.is_premium_user(uuid) SET search_path = '';
    END IF;
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'get_hearts_limit' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.get_hearts_limit(uuid) SET search_path = '';
    END IF;
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'reset_daily_hearts' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.reset_daily_hearts() SET search_path = '';
    END IF;
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.handle_new_user() SET search_path = '';
    END IF;
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'toggle_post_pin' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.toggle_post_pin(uuid, boolean) SET search_path = '';
    END IF;
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'save_user_story_privacy' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.save_user_story_privacy(uuid, text) SET search_path = '';
    END IF;
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'check_column_exists' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.check_column_exists(text, text) SET search_path = '';
    END IF;
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'get_post_pin_status' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.get_post_pin_status(uuid) SET search_path = '';
    END IF;
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'get_user_story_privacy' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.get_user_story_privacy(uuid) SET search_path = '';
    END IF;
END $$;