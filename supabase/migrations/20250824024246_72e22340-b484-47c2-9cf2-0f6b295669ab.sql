-- Create saved_posts table
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable Row Level Security
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop if exists first)
DROP POLICY IF EXISTS "Users can view their own saved posts" ON public.saved_posts;
CREATE POLICY "Users can view their own saved posts" 
ON public.saved_posts 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own saved posts" ON public.saved_posts;
CREATE POLICY "Users can insert their own saved posts" 
ON public.saved_posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved posts" ON public.saved_posts;
CREATE POLICY "Users can delete their own saved posts" 
ON public.saved_posts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create toggle_saved_post function
CREATE OR REPLACE FUNCTION public.toggle_saved_post(post_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_id_val uuid;
  is_saved boolean;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO user_id_val;
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check if post is already saved
  SELECT EXISTS(
    SELECT 1 FROM public.saved_posts 
    WHERE user_id = user_id_val AND post_id = post_id_param
  ) INTO is_saved;
  
  IF is_saved THEN
    -- Remove from saved
    DELETE FROM public.saved_posts 
    WHERE user_id = user_id_val AND post_id = post_id_param;
    RETURN false;
  ELSE
    -- Add to saved
    INSERT INTO public.saved_posts (user_id, post_id)
    VALUES (user_id_val, post_id_param);
    RETURN true;
  END IF;
END;
$$;