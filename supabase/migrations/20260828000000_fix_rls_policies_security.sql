-- Migration to fix RLS policies identified by React Doctor
-- This replaces permissive policies with proper user-based policies

-- Fix for post_views table
DROP POLICY IF EXISTS "System can manage post views" ON public.post_views;
CREATE POLICY "Users can manage their own post views" 
ON public.post_views 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix for profile_badges table (if it exists without RLS)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_badges') THEN
    ALTER TABLE public.profile_badges ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "System can manage profile badges" ON public.profile_badges;
    
    CREATE POLICY "Users can view their own badges" 
    ON public.profile_badges 
    FOR SELECT 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert their own badges" 
    ON public.profile_badges 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Fix for push_notifications table
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'push_notifications') THEN
    ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "System can manage push notifications" ON public.push_notifications;
    
    CREATE POLICY "Users can view their own notifications" 
    ON public.push_notifications 
    FOR SELECT 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert their own notifications" 
    ON public.push_notifications 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Fix for additional tables with permissive policies
-- This covers the remaining policies identified by React Doctor
DO $$
BEGIN
  -- Fix any remaining permissive policies
  UPDATE pg_policies 
  SET qual = 'auth.uid() = user_id', 
      with_check = 'auth.uid() = user_id'
  WHERE (qual = 'true' OR with_check = 'true') 
    AND tablename IN (
      'post_views', 
      'profile_badges', 
      'push_notifications',
      'engagement_rewards_log'
    );
END $$;