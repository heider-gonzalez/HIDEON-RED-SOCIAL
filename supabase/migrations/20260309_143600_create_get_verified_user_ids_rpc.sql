-- Create RPC function to get verified user IDs without RLS restrictions
-- This allows leaderboard and explore pages to show verified badges efficiently
CREATE OR REPLACE FUNCTION get_verified_user_ids(user_ids text[])
RETURNS TABLE (
  user_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return verified user IDs from university_verifications table
  -- Bypasses RLS to allow public reads for verified status
  SELECT 
    uv.user_id
  FROM university_verifications uv
  WHERE 
    uv.is_verified = true
    AND uv.user_id = ANY(user_ids)
    AND uv.user_id IS NOT NULL;
END;
$$;
