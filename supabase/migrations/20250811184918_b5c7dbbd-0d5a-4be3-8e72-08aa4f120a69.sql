-- Add social level definitions and premium profile viewers feature

-- Create social_levels table to define level thresholds and benefits
CREATE TABLE public.social_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_name text NOT NULL UNIQUE,
  min_score integer NOT NULL,
  max_score integer,
  icon_name text NOT NULL,
  color_from text NOT NULL, -- gradient start color
  color_to text NOT NULL,   -- gradient end color
  benefits jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert social level definitions
INSERT INTO public.social_levels (level_name, min_score, max_score, icon_name, color_from, color_to, benefits) VALUES
('Principiante', 0, 49, 'User', '#9CA3AF', '#FCD34D', '{"daily_hearts": 1, "description": "¡Bienvenido a la comunidad!"}'),
('Activo', 50, 199, 'UserCheck', '#FCD34D', '#10B981', '{"daily_hearts": 2, "description": "Usuario comprometido"}'),
('Popular', 200, 499, 'Users', '#10B981', '#3B82F6', '{"daily_hearts": 3, "description": "Miembro valorado"}'),
('Influencer', 500, 999, 'Crown', '#3B82F6', '#8B5CF6', '{"daily_hearts": 5, "description": "Líder de la comunidad"}'),
('Súper Star', 1000, 2499, 'Star', '#8B5CF6', '#EC4899', '{"daily_hearts": 8, "description": "Estrella de la plataforma"}'),
('Leyenda', 2500, null, 'Sparkles', '#EC4899', '#F59E0B', '{"daily_hearts": 10, "description": "Leyenda viviente"}');

-- Enable RLS on social_levels
ALTER TABLE public.social_levels ENABLE ROW LEVEL SECURITY;

-- Anyone can view social levels
CREATE POLICY "Anyone can view social levels" 
ON public.social_levels 
FOR SELECT 
USING (true);

-- Add premium profile viewer tracking
CREATE TABLE public.premium_profile_viewers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL,
  viewer_id uuid,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  is_anonymous boolean DEFAULT false,
  session_id text, -- for anonymous views
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on premium_profile_viewers
ALTER TABLE public.premium_profile_viewers ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile viewers (premium feature)
CREATE POLICY "Users can view their own profile viewers" 
ON public.premium_profile_viewers 
FOR SELECT 
USING (auth.uid() = profile_id);

-- Users can insert their own profile viewers
CREATE POLICY "Users can insert their own profile viewers" 
ON public.premium_profile_viewers 
FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

-- Create function to get social level for a given score
CREATE OR REPLACE FUNCTION public.get_social_level(score_param integer)
RETURNS TABLE(
  level_name text,
  min_score integer,
  max_score integer,
  icon_name text,
  color_from text,
  color_to text,
  benefits jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT 
    sl.level_name,
    sl.min_score,
    sl.max_score,
    sl.icon_name,
    sl.color_from,
    sl.color_to,
    sl.benefits
  FROM public.social_levels sl
  WHERE score_param >= sl.min_score 
    AND (sl.max_score IS NULL OR score_param <= sl.max_score)
  ORDER BY sl.min_score DESC
  LIMIT 1;
$function$;

-- Create function to track premium profile views
CREATE OR REPLACE FUNCTION public.track_premium_profile_view(
  profile_id_param uuid, 
  viewer_id_param uuid DEFAULT NULL,
  is_anonymous_param boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Don't track self-views
  IF viewer_id_param = profile_id_param THEN
    RETURN;
  END IF;

  -- Insert into premium profile viewers for detailed tracking
  INSERT INTO public.premium_profile_viewers (profile_id, viewer_id, is_anonymous)
  VALUES (profile_id_param, viewer_id_param, is_anonymous_param);
  
  -- Also update the existing profile views and metrics
  PERFORM public.increment_profile_view(profile_id_param, viewer_id_param);
END;
$function$;

-- Add engagement reward tracking improvements
CREATE TABLE public.engagement_rewards_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  reward_type text NOT NULL, -- 'daily_login', 'first_post', 'activity_goal', 'streak_bonus', 'level_up'
  hearts_earned integer DEFAULT 0,
  points_earned integer DEFAULT 0,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  earned_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on engagement_rewards_log
ALTER TABLE public.engagement_rewards_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own rewards
CREATE POLICY "Users can view their own rewards" 
ON public.engagement_rewards_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- System can insert rewards
CREATE POLICY "System can insert rewards" 
ON public.engagement_rewards_log 
FOR INSERT 
WITH CHECK (true);

-- Create enhanced daily login reward function
CREATE OR REPLACE FUNCTION public.award_daily_login_bonus()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_user_id uuid;
  today_date date := CURRENT_DATE;
  already_claimed boolean := false;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO current_user_id;
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if already claimed today
  SELECT EXISTS(
    SELECT 1 FROM public.engagement_rewards_log 
    WHERE user_id = current_user_id 
      AND reward_type = 'daily_login'
      AND DATE(earned_at) = today_date
  ) INTO already_claimed;
  
  IF already_claimed THEN
    RETURN;
  END IF;
  
  -- Award daily login bonus
  INSERT INTO public.engagement_rewards_log (user_id, reward_type, hearts_earned, description)
  VALUES (current_user_id, 'daily_login', 1, 'Bonificación de inicio de sesión diario');
  
  -- Update engagement hearts
  INSERT INTO public.engagement_hearts (user_id, hearts_received, reason)
  VALUES (current_user_id, 1, 'Inicio de sesión diario');
END;
$function$;