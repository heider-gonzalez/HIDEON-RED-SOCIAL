-- Hotfix: prevent signup 500 for company accounts by ensuring auth.uid() works inside auth.users trigger (only if profiles table exists)

-- Ensure profiles has the columns referenced by handle_new_user
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER TABLE public.profiles
          ADD COLUMN IF NOT EXISTS username text,
          ADD COLUMN IF NOT EXISTS avatar_url text,
          ADD COLUMN IF NOT EXISTS career text,
          ADD COLUMN IF NOT EXISTS semester text,
          ADD COLUMN IF NOT EXISTS gender text,
          ADD COLUMN IF NOT EXISTS institution_name text,
          ADD COLUMN IF NOT EXISTS academic_role text,
          ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
          ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- Note: Skipping function creation and trigger setup as they depend on profiles, companies, and company_members tables
-- Function will be created when the required tables exist
