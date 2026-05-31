-- Fix para todos los problemas críticos reportados
-- 1. Publicación no se actualiza automáticamente
-- 2. Error de imagen al publicar proyecto  
-- 3. Nombre de perfil sigue siendo sobreescrito

-- ===========================================
-- SOLUCIÓN DEFINITIVA PARA NOMBRE DE PERFIL
-- ===========================================

-- 1. Eliminar TODOS los triggers que modifican nombres
DROP TRIGGER IF EXISTS on_auth_user_update ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_update_strict ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_safe ON auth.users;

-- 2. Crear función que NUNCA actualiza perfiles existentes
CREATE OR REPLACE FUNCTION public.handle_new_user_final()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public

AS $$
BEGIN
    -- Solo insertar si el perfil NO existe
    INSERT INTO public.profiles (id, username, avatar_url, google_name, created_at, updated_at)
    SELECT 
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name'
        ),
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = NEW.id
    );
    
    RETURN NEW;
END;
$$;

-- 3. Trigger solo para nuevos usuarios
CREATE TRIGGER on_auth_user_created_final
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_final();

-- 4. Forzar estado correcto para usuario específico (only if profiles table exists)
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

-- ===========================================
-- MEJORAS PARA PUBLICACIONES
-- ===========================================

-- 5. Añadir índices para mejor rendimiento de publicaciones (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        CREATE INDEX IF NOT EXISTS idx_posts_user_id_created_at ON public.posts(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_post_type ON public.posts(post_type);
        CREATE INDEX IF NOT EXISTS idx_posts_visibility ON public.posts(visibility);
    END IF;
END $$;

-- 6. Optimizar consulta de posts para feed
CREATE OR REPLACE FUNCTION public.get_feed_posts(p_user_id UUID, p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    visibility TEXT,
    post_type TEXT,
    username TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public

AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.content,
        p.media_url,
        p.media_type,
        p.created_at,
        p.updated_at,
        p.visibility,
        p.post_type,
        pr.username,
        pr.avatar_url
    FROM public.posts p
    JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.visibility = 'public'
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 7. Dar permisos para la función optimizada
GRANT EXECUTE ON FUNCTION public.get_feed_posts(UUID, INTEGER, INTEGER) TO authenticated;

-- ===========================================
-- CORRECCIÓN PARA PROYECTOS E IMÁGENES
-- ===========================================

-- 8. Asegurar que los proyectos puedan tener imágenes (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        ALTER TABLE public.posts 
        ADD COLUMN IF NOT EXISTS project_status TEXT DEFAULT 'En desarrollo';

        -- 9. Actualizar constraint para permitir valores en español
        ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_project_status_check;
        ALTER TABLE public.posts 
        ADD CONSTRAINT posts_project_status_check 
        CHECK (
            project_status IN (
                'idea', 'in_progress', 'completed', 'paused', 'cancelled',
                'En desarrollo', 'Completado', 'Pausado', 'Cancelado', 'Idea'
            ) 
            OR project_status IS NULL
        );
    END IF;
END $$;

-- 10. Trigger para actualizar timestamp de posts
CREATE OR REPLACE FUNCTION public.update_post_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public

AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 11. Aplicar trigger a posts (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        DROP TRIGGER IF EXISTS update_post_timestamp_trigger ON public.posts;
        CREATE TRIGGER update_post_timestamp_trigger
        BEFORE UPDATE ON public.posts
        FOR EACH ROW
        EXECUTE FUNCTION public.update_post_timestamp();
    END IF;
END $$;

-- ===========================================
-- LIMPIEZA Y OPTIMIZACIÓN
-- ===========================================

-- 12. Limpiar sesiones antiguas (opcional)
-- DELETE FROM public.sessions WHERE created_at < NOW() - INTERVAL '30 days';

-- 13. Actualizar estadísticas de la tabla (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        ANALYZE public.posts;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ANALYZE public.profiles;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comments') THEN
        ANALYZE public.comments;
    END IF;
END $$;

-- 14. Comentarios de seguridad (only if functions exist)
-- Skipping comments to avoid migration order issues
