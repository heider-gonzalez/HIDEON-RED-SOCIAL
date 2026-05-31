-- 🎵 Instagram-style Audio Support Migration
-- Add audio_url and audio_metadata to posts table (only if posts table exists)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        -- Add audio_url field for storing audio file URLs
        ALTER TABLE posts
        ADD COLUMN audio_url TEXT;

        -- Add audio_metadata field for storing audio information (duration, size, type, etc.)
        ALTER TABLE posts
        ADD COLUMN audio_metadata JSONB;

        -- Create index for audio_url queries for better performance
        CREATE INDEX idx_posts_audio_url ON posts(audio_url) WHERE audio_url IS NOT NULL;

        -- Add comment to document the new fields
        COMMENT ON COLUMN posts.audio_url IS 'URL del archivo de audio para música de fondo estilo Instagram';
        COMMENT ON COLUMN posts.audio_metadata IS 'Metadatos del audio incluyendo duración, tamaño, tipo, etc.';
    END IF;
END $$;

-- RLS policies for audio fields (same as existing media fields)
-- Audio URL and metadata follow same visibility rules as other content
