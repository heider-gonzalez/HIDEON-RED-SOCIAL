-- Update reaction types to support new reactions (only if tables exist)

-- Add a comment to document the allowed reaction types (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reactions') THEN
        COMMENT ON COLUMN reactions.reaction_type IS 'Allowed values: like, love, funny, wow, angry, poop, join';
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'story_reactions') THEN
        COMMENT ON COLUMN story_reactions.reaction_type IS 'Allowed values: like, love, funny, wow, angry, poop, join';
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'likes') THEN
        COMMENT ON COLUMN likes.reaction_type IS 'Allowed values: like, love, funny, wow, angry, poop, join';
    END IF;
END $$;

-- Create an index for better performance on reaction queries (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reactions') THEN
        CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(reaction_type);
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'story_reactions') THEN
        CREATE INDEX IF NOT EXISTS idx_story_reactions_type ON story_reactions(reaction_type);
    END IF;
END $$;

-- For the special "join" reaction functionality, we might want to track project interests
-- This table could be used to show who "joined" a project/idea (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        CREATE TABLE IF NOT EXISTS project_joins (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          
          -- Prevent duplicate joins
          UNIQUE(post_id, user_id)
        );
    END IF;
END $$;

-- Enable RLS (only if project_joins table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_joins') THEN
        ALTER TABLE project_joins ENABLE ROW LEVEL SECURITY;

        -- RLS Policies for project_joins
        DROP POLICY IF EXISTS "Anyone can view project joins" ON project_joins;
        CREATE POLICY "Anyone can view project joins" ON project_joins FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Users can join projects" ON project_joins;
        CREATE POLICY "Users can join projects" ON project_joins FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Users can leave projects" ON project_joins;
        CREATE POLICY "Users can leave projects" ON project_joins FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;