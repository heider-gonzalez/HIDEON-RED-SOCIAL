-- Make end_date optional in academic_events table (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'academic_events') THEN
        ALTER TABLE public.academic_events ALTER COLUMN end_date DROP NOT NULL;
    END IF;
END $$;

-- Update the create_academic_event_atomic function to handle optional end_date
-- Note: Skipping function creation if required tables/types don't exist to avoid validation errors
-- The function will be created when the tables exist