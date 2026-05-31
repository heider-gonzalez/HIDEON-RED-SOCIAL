-- Fix: allow authenticated users to create channels (required for idea group chat) (only if canales table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'canales') THEN
        ALTER TABLE public.canales ENABLE ROW LEVEL SECURITY;

        -- Ensure role has table privileges (RLS still applies)
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.canales TO authenticated;

        -- Recreate INSERT policy on the correct schema/table
        DROP POLICY IF EXISTS "Users can create channels" ON public.canales;
        CREATE POLICY "Users can create channels"
        ON public.canales
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;
