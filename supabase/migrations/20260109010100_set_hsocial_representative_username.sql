-- Set the representative profile name for automated hsocial messages (only if profiles table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        UPDATE public.profiles
        SET username = 'hsocial'
        WHERE id = 'a12b715b-588a-41eb-bc09-5739bb579894';
    END IF;
END $$;
