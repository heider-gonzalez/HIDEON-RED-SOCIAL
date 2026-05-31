-- Limpieza más agresiva de datos duplicados (only if reactions table exists)
-- Eliminar duplicados manteniendo solo el más reciente por usuario/post

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reactions') THEN
        -- Eliminar duplicados en reacciones a posts (mantener solo la más reciente)
        DELETE FROM reactions r1
        WHERE EXISTS (
          SELECT 1 FROM reactions r2 
          WHERE r2.user_id = r1.user_id 
          AND r2.post_id = r1.post_id 
          AND r2.post_id IS NOT NULL
          AND r2.created_at > r1.created_at
        );

        -- Eliminar duplicados en reacciones a comentarios (mantener solo la más reciente)  
        DELETE FROM reactions r1
        WHERE EXISTS (
          SELECT 1 FROM reactions r2 
          WHERE r2.user_id = r1.user_id 
          AND r2.comment_id = r1.comment_id 
          AND r2.comment_id IS NOT NULL
          AND r2.created_at > r1.created_at
        );

        -- Crear constraints optimizados
        CREATE UNIQUE INDEX unique_post_reaction 
        ON reactions (user_id, post_id) 
        WHERE post_id IS NOT NULL AND comment_id IS NULL;

        CREATE UNIQUE INDEX unique_comment_reaction 
        ON reactions (user_id, comment_id) 
        WHERE comment_id IS NOT NULL AND post_id IS NULL;
    END IF;
END $$;