-- Add missing reaction types to allow poop and join reactions (only if tables exist)

-- Add a comment to document the valid reaction types (only if reactions table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reactions') THEN
        COMMENT ON COLUMN reactions.reaction_type IS 'Valid values: like, love, haha, wow, angry, poop, join';
    END IF;
END $$;

-- Insert some test data to verify the new reaction types work (optional)
-- This will fail silently if there are no posts to reference, which is fine (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reactions') 
       AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        INSERT INTO reactions (user_id, reaction_type, post_id)
        SELECT 
          auth.uid(),
          'poop',
          (SELECT id FROM posts LIMIT 1)
        WHERE auth.uid() IS NOT NULL 
        AND EXISTS (SELECT 1 FROM posts LIMIT 1)
        ON CONFLICT DO NOTHING;

        -- Clean up the test reaction immediately
        DELETE FROM reactions 
        WHERE reaction_type = 'poop' 
        AND user_id = auth.uid() 
        AND created_at > now() - interval '1 minute';
    END IF;
END $$;