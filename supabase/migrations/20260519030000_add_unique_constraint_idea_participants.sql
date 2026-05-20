-- Add unique constraint to idea_participants to prevent duplicate joins
-- This addresses the issue where users could join the same idea multiple times

-- First, remove any existing duplicates
DELETE FROM public.idea_participants
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY user_id, post_id ORDER BY created_at DESC) as rn
    FROM public.idea_participants
  ) t
  WHERE rn > 1
);

-- Add unique constraint
ALTER TABLE public.idea_participants
ADD CONSTRAINT unique_user_post_pair UNIQUE (user_id, post_id);

-- Add composite index for better query performance
CREATE INDEX IF NOT EXISTS idx_idea_participants_user_post ON public.idea_participants(user_id, post_id);
