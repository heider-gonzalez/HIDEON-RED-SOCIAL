-- Create post_shares table to track when users share posts
CREATE TABLE public.post_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  share_date DATE NOT NULL DEFAULT CURRENT_DATE, -- For unique daily constraint
  share_type TEXT NOT NULL DEFAULT 'profile', -- 'profile', 'link', 'external'
  share_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for post_shares
CREATE POLICY "Users can view all shares" 
ON public.post_shares 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own shares" 
ON public.post_shares 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shares" 
ON public.post_shares 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_post_shares_post_id ON public.post_shares(post_id);
CREATE INDEX idx_post_shares_user_id ON public.post_shares(user_id);
CREATE INDEX idx_post_shares_shared_at ON public.post_shares(shared_at);

-- Create unique constraint to prevent duplicate shares of the same post by the same user on the same day
CREATE UNIQUE INDEX idx_post_shares_unique_daily 
ON public.post_shares(post_id, user_id, share_date);