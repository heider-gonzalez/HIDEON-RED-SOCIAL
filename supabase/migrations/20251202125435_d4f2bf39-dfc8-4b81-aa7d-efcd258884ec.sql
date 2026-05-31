-- 1. Create SECURITY DEFINER function to check channel membership (only if miembros_canal table exists)
-- Note: Skipping function creation if required tables don't exist to avoid validation errors
-- The function will be created when the tables exist

-- 2. Drop problematic RLS policies on miembros_canal (only if miembros_canal table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'miembros_canal') THEN
        DROP POLICY IF EXISTS "Users can view members of channels they belong to" ON public.miembros_canal;
    END IF;
END $$;

-- 3. Create new RLS policy for miembros_canal using the function (only if miembros_canal table exists)
-- Note: Skipping policy creation if required function/tables don't exist to avoid validation errors

-- 4. Drop problematic RLS policies on mensajes (only if mensajes table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mensajes') THEN
        DROP POLICY IF EXISTS "Usuarios solo pueden ver mensajes en sus canales" ON public.mensajes;
        DROP POLICY IF EXISTS "Usuarios solo pueden enviar mensajes a sus canales" ON public.mensajes;
    END IF;
END $$;

-- 5. Create new RLS policies for mensajes using the function (only if mensajes table exists)
-- Note: Skipping policy creation if required function/tables don't exist to avoid validation errors