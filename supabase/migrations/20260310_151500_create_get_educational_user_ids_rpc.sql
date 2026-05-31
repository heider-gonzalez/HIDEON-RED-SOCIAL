-- RPC to get user IDs that have an educational email domain
-- Uses auth.users.email and public.university_email_domains
CREATE OR REPLACE FUNCTION public.get_educational_user_ids(user_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  user_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id AS user_id
  FROM auth.users u
  WHERE EXISTS (
    SELECT 1
    FROM public.university_email_domains d
    WHERE d.is_active = true
      AND lower(u.email) LIKE '%' || lower(d.email_domain)
  )
  AND (user_ids IS NULL OR u.id = ANY(user_ids));
$$;

REVOKE ALL ON FUNCTION public.get_educational_user_ids(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_educational_user_ids(uuid[]) TO authenticated;
