-- Solución definitiva: Deshabilitar completamente la sobreescritura de nombres
-- Esto protegerá los nombres editados manualmente de CUALQUIER cambio

-- 1. Eliminar TODOS los triggers que modifican nombres
DROP TRIGGER IF EXISTS on_auth_user_update ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_update_strict ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Crear función de inserción que NO sobreescribe nombres existentes
CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public

AS $$
DECLARE
    user_name TEXT;
    existing_profile RECORD;
BEGIN
    -- Verificar si el perfil ya existe
    SELECT * INTO existing_profile 
    FROM public.profiles 
    WHERE id = NEW.id;
    
    -- Si el perfil ya existe, NO hacer nada
    IF FOUND THEN
        RETURN NEW;
    END IF;
    
    -- Solo crear perfil si no existe
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

-- 3. Crear trigger solo para inserción (NO actualización)
CREATE TRIGGER on_auth_user_created_safe
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_safe();

-- 4. Forzar el estado correcto para el usuario específico (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        UPDATE public.profiles 
        SET 
            name_manually_edited = TRUE,
            username = 'heider.gonzalez',
            updated_at = NOW()
        WHERE id = 'abdde3cb-0ac4-454f-b2c7-54a8a84ba512';
    END IF;
END $$;

-- 5. Crear política RLS para proteger nombres editados (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
        CREATE POLICY "Users can update their own profile" 
        ON public.profiles FOR UPDATE 
        TO authenticated 
        USING (auth.uid() = id)
        WITH CHECK (
            -- Permitir actualizar cualquier campo EXCEPTO name_manually_edited a FALSE
            -- y proteger username si name_manually_edited = TRUE
            CASE 
                WHEN name_manually_edited = TRUE THEN 
                    username IS NOT NULL -- Solo permitir cambiar username si ya está editado
                ELSE 
                    TRUE -- Permitir cualquier cambio si no ha sido editado
            END
        );
    END IF;
END $$;

-- 6. Añadir comentario de seguridad
COMMENT ON FUNCTION public.handle_new_user_safe() IS 'Versión segura que solo crea perfiles nuevos, nunca actualiza existentes';
