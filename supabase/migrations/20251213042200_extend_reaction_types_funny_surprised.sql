-- Extend reaction types to include 'funny' and 'surprised' (only if reactions table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reactions') THEN
        ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_reaction_type_check;

        ALTER TABLE reactions ADD CONSTRAINT reactions_reaction_type_check
        CHECK (reaction_type IN ('love', 'awesome', 'incredible', 'funny', 'surprised'));
    END IF;
END $$;
