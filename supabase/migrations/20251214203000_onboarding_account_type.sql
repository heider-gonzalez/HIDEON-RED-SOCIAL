-- Onboarding step 2: account type (person vs company) + person status (only if profiles table exists)

-- 1) Extend profiles
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER TABLE public.profiles
        ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'person' CHECK (account_type IN ('person','company')),
        ADD COLUMN IF NOT EXISTS person_status text CHECK (person_status IN ('student','professional', NULL));
    END IF;
END $$;

-- 2) Update handle_new_user trigger to persist metadata and auto-create company for company accounts
-- Note: Skipping function creation as it depends on profiles, companies, and company_members tables
-- Function will be created when the required tables exist
