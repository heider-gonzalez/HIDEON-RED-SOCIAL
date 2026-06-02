-- Fix urgente para prioridad de nombre editado
-- El trigger estaba sobreescribiendo nombres editados manualmente

-- 1. Eliminar el trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_update ON auth.users;

-- 2. Crear función más estricta que NO actualiza nombres editados
CREATE OR REPLACE FUNCTION public.handle_google_oauth_update_strict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public

AS $$
BEGIN
    -- NUNCA actualizar si el nombre fue editado manualmente
    IF EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = NEW.id 
        AND p.name_manually_edited = TRUE
    ) THEN
        -- No hacer NADA, preservar el nombre editado
        RETURN NEW;
    END IF;
    
    -- Solo actualizar si NUNCA ha sido editado manualmente
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = NEW.id 
        AND p.name_manually_edited = TRUE
    ) THEN
        -- Actualizar solo perfiles que nunca han sido editados
        UPDATE public.profiles 
        SET 
            username = COALESCE(
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'name',
                split_part(NEW.email, '@', 1)
            ),
            google_name = COALESCE(
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'name'
            ),
            updated_at = NOW()
        WHERE id = NEW.id 
        AND name_manually_edited = FALSE;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. Crear nuevo trigger con la función estricta
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_update_strict'
    ) THEN
        CREATE TRIGGER on_auth_user_update_strict
        BEFORE UPDATE ON auth.users
        FOR EACH ROW
        WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
        EXECUTE FUNCTION public.handle_google_oauth_update_strict();
    END IF;
END $$;

-- 4. Verificar y corregir el usuario específico mencionado (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        UPDATE public.profiles 
        SET 
            name_manually_edited = TRUE,
            username = 'heider.gonzalez',
            updated_at = NOW()
        WHERE id = 'abdde3cb-0ac4-454f-b2c7-54a8a84ba512'
        AND name_manually_edited = FALSE;
    END IF;
END $$;

-- 5. Añadir comentario de seguridad
COMMENT ON FUNCTION public.handle_google_oauth_update_strict() IS 'Versión estricta que NUNCA sobreescribe nombres editados manualmente';
