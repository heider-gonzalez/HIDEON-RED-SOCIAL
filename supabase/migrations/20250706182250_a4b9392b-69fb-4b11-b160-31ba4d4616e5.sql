-- Agregar el campo relationship_status a la tabla profiles (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS relationship_status TEXT;

        -- Opcional: Agregar un constraint para los valores válidos
        ALTER TABLE public.profiles 
        DROP CONSTRAINT IF EXISTS profiles_relationship_status_check;
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_relationship_status_check 
        CHECK (relationship_status IN ('soltero', 'en_relacion', 'casado', 'es_complicado', 'divorciado', 'viudo', NULL));
    END IF;
END $$;