-- Create/get private DM channel via RPC to avoid client-side RLS failures (only if canales table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'canales') THEN
        -- Ensure canales has RLS enabled and authenticated has table privileges
        ALTER TABLE public.canales ENABLE ROW LEVEL SECURITY;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.canales TO authenticated;

        -- Ensure there is an insert policy for authenticated users
        DROP POLICY IF EXISTS "Users can create channels" ON public.canales;
        CREATE POLICY "Users can create channels"
        ON public.canales
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- Note: Skipping function creation as it depends on canales and miembros_canal tables
-- This will be created when the required tables exist
