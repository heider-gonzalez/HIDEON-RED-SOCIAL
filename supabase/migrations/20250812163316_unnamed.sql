-- Restrict profiles visibility to authenticated users only
-- 1) Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Los perfiles públicos son visibles para todos" ON public.profiles;

-- 2) Create a new SELECT policy limited to authenticated users
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Keep existing UPDATE policy as-is (users can edit their own profile)
-- No other changes required
