-- Restrict profiles visibility to authenticated users only (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        -- 1) Drop the existing public SELECT policy
        DROP POLICY IF EXISTS "Los perfiles públicos son visibles para todos" ON public.profiles;

        -- 2) Create a new SELECT policy limited to authenticated users
        DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
        CREATE POLICY "Authenticated users can view profiles"
        ON public.profiles
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Keep existing UPDATE policy as-is (users can edit their own profile)
-- No other changes required
