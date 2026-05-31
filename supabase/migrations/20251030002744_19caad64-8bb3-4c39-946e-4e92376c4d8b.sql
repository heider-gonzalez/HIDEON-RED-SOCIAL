-- ============================================
-- H SOCIAL - SIMPLIFICACIÓN Y LIMPIEZA
-- Eliminando funcionalidades no usadas
-- ============================================

-- 1. Eliminar tablas de Stories (only if they exist)
DROP TABLE IF EXISTS story_reactions CASCADE;
DROP TABLE IF EXISTS story_views CASCADE;
DROP TABLE IF EXISTS stories CASCADE;

-- 2. Eliminar tablas de Messages/Chat (only if they exist)
DROP TABLE IF EXISTS group_messages CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS messages CASCADE;

-- 3. Eliminar tablas de funcionalidades no core (only if they exist)
DROP TABLE IF EXISTS duo_dinamico CASCADE;
DROP TABLE IF EXISTS match_actions CASCADE;
DROP TABLE IF EXISTS nequi_payments CASCADE;

-- 4. Simplificar tabla de reactions - solo 3 tipos (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        -- Primero eliminar la tabla existente
        DROP TABLE IF EXISTS reactions CASCADE;

        -- Crear nueva tabla de reactions simplificada
        CREATE TABLE reactions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
          comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
          reaction_type text NOT NULL CHECK (reaction_type IN ('love', 'awesome', 'join')),
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(user_id, post_id, comment_id),
          CHECK (
            (post_id IS NOT NULL AND comment_id IS NULL) OR
            (post_id IS NULL AND comment_id IS NOT NULL)
          )
        );

        -- RLS para reactions
        ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Anyone can view reactions"
          ON reactions FOR SELECT
          USING (true);

        CREATE POLICY "Users can add their own reactions"
          ON reactions FOR INSERT
          WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their own reactions"
          ON reactions FOR UPDATE
          USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete their own reactions"
          ON reactions FOR DELETE
          USING (auth.uid() = user_id);

        -- Índices para mejor performance
        CREATE INDEX idx_reactions_post_id ON reactions(post_id);
        CREATE INDEX idx_reactions_comment_id ON reactions(comment_id);
        CREATE INDEX idx_reactions_user_id ON reactions(user_id);
    END IF;
END $$;

-- 5. Limpiar tabla de notificaciones - solo tipos esenciales (only if notifications table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        -- Eliminar notificaciones de funcionalidades eliminadas
        DELETE FROM notifications 
        WHERE type IN ('story_reaction', 'story_view', 'story_reply', 'message', 'group_post', 'group_invitation');
    END IF;
END $$;

-- 6. Asegurar que posts table tiene las RLS correctas (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        DROP POLICY IF EXISTS "Anyone can view public posts" ON posts;
        CREATE POLICY "Anyone can view public posts"
          ON posts FOR SELECT
          USING (visibility = 'public' OR auth.uid() = user_id);
    END IF;
END $$;

-- 7. Asegurar que profiles tiene RLS correcto (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
        CREATE POLICY "Public profiles are viewable by everyone"
          ON profiles FOR SELECT
          USING (true);
    END IF;
END $$;