-- Create tables for engagement system

-- Daily engagement tracking
CREATE TABLE IF NOT EXISTS public.daily_engagement (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  actions JSONB DEFAULT '{}',
  rewards_claimed TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Engagement hearts rewards (different from profile hearts)
CREATE TABLE IF NOT EXISTS public.engagement_hearts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hearts_received INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_hearts ENABLE ROW LEVEL SECURITY;

-- Policies for daily_engagement
CREATE POLICY "Users can view their own daily engagement" 
ON public.daily_engagement 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily engagement" 
ON public.daily_engagement 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify their own daily engagement" 
ON public.daily_engagement 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policies for engagement_hearts
CREATE POLICY "Users can view their own engagement hearts" 
ON public.engagement_hearts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own engagement hearts" 
ON public.engagement_hearts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_engagement_user_date ON public.daily_engagement(user_id, date);
CREATE INDEX IF NOT EXISTS idx_engagement_hearts_user_date ON public.engagement_hearts(user_id, earned_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for daily_engagement
CREATE TRIGGER update_daily_engagement_updated_at
BEFORE UPDATE ON public.daily_engagement
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();