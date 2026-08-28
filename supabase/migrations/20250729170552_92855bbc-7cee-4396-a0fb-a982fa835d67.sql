-- User Streaks System
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_streaks') THEN
    CREATE TABLE public.user_streaks (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      streak_type TEXT NOT NULL, -- 'login', 'story', 'post', 'interaction'
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_activity_date DATE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- User Achievements System
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_achievements') THEN
    CREATE TABLE public.user_achievements (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      achievement_type TEXT NOT NULL, -- 'first_post', 'social_butterfly', 'popular_creator', etc.
      achievement_data JSONB,
      earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE(user_id, achievement_type)
    );
  END IF;
END $$;

-- Real-time Engagement Metrics
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'engagement_metrics') THEN
    CREATE TABLE public.engagement_metrics (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      profile_views_today INTEGER NOT NULL DEFAULT 0,
      profile_views_total INTEGER NOT NULL DEFAULT 0,
      posts_engagement_score NUMERIC NOT NULL DEFAULT 0,
      social_score NUMERIC NOT NULL DEFAULT 0,
      last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE(user_id)
    );
  END IF;
END $$;

-- Profile Views Tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_views') THEN
    CREATE TABLE public.profile_views (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      profile_id UUID NOT NULL,
      viewer_id UUID,
      viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      ip_address INET
    );
  END IF;
END $$;

-- Enable RLS on all tables
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_streaks') THEN
    ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_achievements') THEN
    ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'engagement_metrics') THEN
    ALTER TABLE public.engagement_metrics ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_views') THEN
    ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- RLS Policies for user_streaks
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_streaks') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_streaks' AND policyname = 'Users can view their own streaks') THEN
      CREATE POLICY "Users can view their own streaks" 
      ON public.user_streaks 
      FOR SELECT 
      USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_streaks' AND policyname = 'Users can manage their own streaks') THEN
      CREATE POLICY "Users can manage their own streaks" 
      ON public.user_streaks 
      FOR ALL 
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- RLS Policies for user_achievements
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_achievements') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'Users can view their own achievements') THEN
      CREATE POLICY "Users can view their own achievements" 
      ON public.user_achievements 
      FOR SELECT 
      USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'Anyone can view achievements for public profiles') THEN
      CREATE POLICY "Anyone can view achievements for public profiles" 
      ON public.user_achievements 
      FOR SELECT 
      USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'System can manage achievements') THEN
      CREATE POLICY "System can manage achievements" 
      ON public.user_achievements 
      FOR INSERT 
      WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- RLS Policies for engagement_metrics
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'engagement_metrics') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'engagement_metrics' AND policyname = 'Users can view their own metrics') THEN
      CREATE POLICY "Users can view their own metrics" 
      ON public.engagement_metrics 
      FOR SELECT 
      USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'engagement_metrics' AND policyname = 'Anyone can view basic metrics') THEN
      CREATE POLICY "Anyone can view basic metrics" 
      ON public.engagement_metrics 
      FOR SELECT 
      USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'engagement_metrics' AND policyname = 'System can manage metrics') THEN
      CREATE POLICY "System can manage metrics" 
      ON public.engagement_metrics 
      FOR ALL 
      USING (true)
      WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- RLS Policies for profile_views
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_views') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_views' AND policyname = 'Users can view their profile views') THEN
      CREATE POLICY "Users can view their profile views" 
      ON public.profile_views 
      FOR SELECT 
      USING (auth.uid() = profile_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_views' AND policyname = 'System can track views') THEN
      CREATE POLICY "System can track views" 
      ON public.profile_views 
      FOR INSERT 
      WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- Functions for streak management
CREATE OR REPLACE FUNCTION public.update_user_streak(
  user_id_param UUID,
  streak_type_param TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  current_streak_val INTEGER := 0;
  longest_streak_val INTEGER := 0;
BEGIN
  -- Get current streak data
  SELECT current_streak, longest_streak INTO current_streak_val, longest_streak_val
  FROM public.user_streaks
  WHERE user_id = user_id_param AND streak_type = streak_type_param;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, streak_type, current_streak, longest_streak, last_activity_date)
    VALUES (user_id_param, streak_type_param, 1, 1, today_date);
    RETURN;
  END IF;
  
  -- Update existing streak
  UPDATE public.user_streaks
  SET 
    current_streak = CASE 
      WHEN last_activity_date = yesterday_date THEN current_streak + 1
      WHEN last_activity_date = today_date THEN current_streak
      ELSE 1
    END,
    longest_streak = CASE 
      WHEN last_activity_date = yesterday_date AND current_streak + 1 > longest_streak THEN current_streak + 1
      WHEN last_activity_date != today_date AND longest_streak < 1 THEN 1
      ELSE longest_streak
    END,
    last_activity_date = today_date,
    updated_at = now()
  WHERE user_id = user_id_param AND streak_type = streak_type_param;
END;
$$;

-- Function to increment profile views
CREATE OR REPLACE FUNCTION public.increment_profile_view(
  profile_id_param UUID,
  viewer_id_param UUID DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Record the view
  INSERT INTO public.profile_views (profile_id, viewer_id)
  VALUES (profile_id_param, viewer_id_param);
  
  -- Update metrics
  INSERT INTO public.engagement_metrics (user_id, profile_views_today, profile_views_total)
  VALUES (profile_id_param, 1, 1)
  ON CONFLICT (user_id)
  DO UPDATE SET
    profile_views_today = CASE 
      WHEN engagement_metrics.last_reset_date < CURRENT_DATE THEN 1
      ELSE engagement_metrics.profile_views_today + 1
    END,
    profile_views_total = engagement_metrics.profile_views_total + 1,
    last_reset_date = CASE 
      WHEN engagement_metrics.last_reset_date < CURRENT_DATE THEN CURRENT_DATE
      ELSE engagement_metrics.last_reset_date
    END,
    updated_at = now();
END;
$$;

-- Function to calculate social score
CREATE OR REPLACE FUNCTION public.calculate_social_score(user_id_param UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  friends_count INTEGER := 0;
  posts_count INTEGER := 0;
  hearts_count INTEGER := 0;
  reactions_count INTEGER := 0;
  score NUMERIC := 0;
BEGIN
  -- Count friends (mutual follows)
  SELECT COUNT(*) INTO friends_count
  FROM public.friends f1
  WHERE f1.user_id = user_id_param
  AND EXISTS (
    SELECT 1 FROM public.friends f2 
    WHERE f2.user_id = f1.friend_id AND f2.friend_id = f1.user_id
  );
  
  -- Count posts from last 30 days
  SELECT COUNT(*) INTO posts_count
  FROM public.posts
  WHERE user_id = user_id_param
  AND created_at > now() - INTERVAL '30 days';
  
  -- Count hearts received
  SELECT COUNT(*) INTO hearts_count
  FROM public.profile_hearts
  WHERE profile_id = user_id_param;
  
  -- Count reactions on user's posts
  SELECT COUNT(*) INTO reactions_count
  FROM public.reactions r
  JOIN public.posts p ON r.post_id = p.id
  WHERE p.user_id = user_id_param
  AND r.created_at > now() - INTERVAL '30 days';
  
  -- Calculate score (weighted formula)
  score := (friends_count * 10) + (posts_count * 5) + (hearts_count * 15) + (reactions_count * 3);
  
  -- Update engagement metrics
  UPDATE public.engagement_metrics
  SET social_score = score, updated_at = now()
  WHERE user_id = user_id_param;
  
  RETURN score;
END;
$$;

-- Trigger to update streaks on user activity
CREATE OR REPLACE FUNCTION public.handle_user_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update login streak
  PERFORM public.update_user_streak(NEW.id, 'login');
  RETURN NEW;
END;
$$;

-- Create trigger for login streaks (this will be called when user activity is detected)
-- Note: We'll handle this in the application layer instead of auth.users trigger