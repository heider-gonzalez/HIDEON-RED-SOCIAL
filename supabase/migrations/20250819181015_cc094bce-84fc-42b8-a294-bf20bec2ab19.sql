-- Fix infinite recursion in group_members RLS policies
-- Drop the problematic policy and create a simpler one
DROP POLICY IF EXISTS "Admins can manage group members" ON public.group_members;

-- Create a security definer function to check group membership safely
CREATE OR REPLACE FUNCTION public.is_group_admin_or_moderator(group_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_id_param 
    AND user_id = user_id_param 
    AND role IN ('admin', 'moderator')
  );
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Admins can manage group members" ON public.group_members
FOR ALL
USING (public.is_group_admin_or_moderator(group_id, auth.uid()))
WITH CHECK (public.is_group_admin_or_moderator(group_id, auth.uid()));

-- Fix engagement_hearts RLS policy to allow system inserts
DROP POLICY IF EXISTS "System can insert engagement hearts" ON public.engagement_hearts;

CREATE POLICY "Users can insert their own engagement hearts" ON public.engagement_hearts
FOR INSERT
WITH CHECK (auth.uid() = user_id);