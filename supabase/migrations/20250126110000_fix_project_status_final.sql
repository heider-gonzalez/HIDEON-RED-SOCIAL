-- Fix final para posts_project_status_check
-- Acepta valores en inglés y español para el estado del proyecto

-- Only apply if posts table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        -- Primero, actualizar cualquier fila existente que pueda violar la nueva restricción
        UPDATE public.posts 
        SET project_status = 'En desarrollo' 
        WHERE project_status NOT IN ('idea', 'in_progress', 'En desarrollo', 'completed', 'Completado', 'paused', 'Pausado')
          AND project_status IS NOT NULL;

        -- Eliminar la restricción anterior si existe
        ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_project_status_check;

        -- Crear una nueva restricción que acepte valores en inglés y español
        ALTER TABLE public.posts 
        ADD CONSTRAINT posts_project_status_check 
        CHECK (
          project_status IN (
            'idea', 'in_progress', 'completed', 'paused', 'cancelled',
            'En desarrollo', 'Completado', 'Pausado', 'Cancelado', 'Idea'
          ) 
          OR project_status IS NULL
        );

        -- Añadir comentario para claridad
        COMMENT ON CONSTRAINT posts_project_status_check ON public.posts IS 'Permite estados del proyecto en inglés y español: idea, in_progress, completed, paused, cancelled, En desarrollo, Completado, Pausado, Cancelado, Idea';
    END IF;
END $$;
