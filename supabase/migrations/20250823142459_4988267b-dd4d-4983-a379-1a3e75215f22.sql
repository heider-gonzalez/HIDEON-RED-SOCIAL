-- Verificar y habilitar completamente las reacciones faltantes (only if tables exist)
-- Insertar reacciones de prueba para poop y join para validar que funcionen

-- Primero verificamos que existe al menos un post para hacer la prueba (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts')
       AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reactions') THEN
        DECLARE
          test_post_id uuid;
          test_user_id uuid;
        BEGIN
          -- Obtener un post existente para la prueba
          SELECT id INTO test_post_id FROM posts LIMIT 1;
          
          -- Obtener el usuario actual
          SELECT auth.uid() INTO test_user_id;
          
          IF test_post_id IS NOT NULL AND test_user_id IS NOT NULL THEN
            -- Insertar reacciones de prueba para verificar que poop y join funcionan
            INSERT INTO reactions (user_id, post_id, reaction_type)
            VALUES 
              (test_user_id, test_post_id, 'poop'),
              (test_user_id, test_post_id, 'join')
            ON CONFLICT DO NOTHING;
            
            -- Limpiar las reacciones de prueba inmediatamente
            DELETE FROM reactions 
            WHERE user_id = test_user_id 
              AND post_id = test_post_id 
              AND reaction_type IN ('poop', 'join')
              AND created_at > now() - interval '1 minute';
              
            RAISE NOTICE 'Test reactions poop and join inserted and cleaned successfully';
          ELSE
            RAISE NOTICE 'No posts found or no authenticated user for testing';
          END IF;
        END;
    END IF;
END $$;

-- Agregar comentario a la columna para documentar los tipos válidos (only if reactions table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reactions') THEN
        COMMENT ON COLUMN reactions.reaction_type IS 'Valid reaction types: like, love, haha, wow, angry, poop, join';
    END IF;
END $$;