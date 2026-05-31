-- Prioridad del nombre editado manualmente sobre Google OAuth
-- Agrega campo para controlar si el nombre fue editado y evitar sobreescribir

-- Only apply if profiles table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        -- 1. Agregar campo para controlar si el nombre fue editado manualmente
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS name_manually_edited BOOLEAN DEFAULT FALSE;

        -- 2. Agregar campo para guardar el nombre original de Google (opcional)
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS google_name TEXT;
    END IF;
END $$;

-- 3. Crear función para manejar actualizaciones de Google OAuth
CREATE OR REPLACE FUNCTION public.handle_google_oauth_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public

AS $$
BEGIN
    -- Solo actualizar si el nombre no ha sido editado manualmente
    -- Y si realmente hay un cambio en el nombre de Google
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = NEW.id 
        AND p.name_manually_edited = TRUE
    ) AND (
        OLD.raw_user_meta_data IS NULL 
        OR OLD.raw_user_meta_data->>'full_name' IS NULL
        OR COALESCE(OLD.raw_user_meta_data->>'full_name', '') != COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    ) THEN
        -- Actualizar solo si no ha sido editado manualmente
        NEW.username = COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            OLD.username,
            split_part(NEW.email, '@', 1)
        );
        
        -- Guardar el nombre original de Google
        NEW.google_name = COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- 4. Crear trigger para actualizaciones de auth.users
DROP TRIGGER IF EXISTS on_auth_user_update ON auth.users;
CREATE TRIGGER on_auth_user_update
BEFORE UPDATE ON auth.users
FOR EACH ROW
WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
EXECUTE FUNCTION public.handle_google_oauth_update();

-- 5. Actualizar trigger de inserción para manejar nombres (only if function exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace) THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
        BEFORE INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- 6. Actualizar función handle_new_user para guardar google_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public

AS $$
DECLARE
    user_name TEXT;
BEGIN
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    INSERT INTO public.profiles (id, username, avatar_url, google_name, created_at, updated_at)
    VALUES (
        NEW.id,
        user_name,
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name'
        ),
        NOW(),
        NOW()
    );

    RETURN NEW;
END;
$$;

-- 7. Crear función para marcar nombre como editado manualmente
CREATE OR REPLACE FUNCTION public.mark_name_as_manually_edited(p_user_id UUID, p_new_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public

AS $$
BEGIN
    UPDATE public.profiles 
    SET 
        username = p_new_name,
        name_manually_edited = TRUE,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- 8. Dar permisos para la función de edición manual
GRANT EXECUTE ON FUNCTION public.mark_name_as_manually_edited(UUID, TEXT) TO authenticated;

-- 9. Crear índices para mejor rendimiento (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_name_manually_edited ON public.profiles(name_manually_edited);
        CREATE INDEX IF NOT EXISTS idx_profiles_google_name ON public.profiles(google_name);
    END IF;
END $$;
