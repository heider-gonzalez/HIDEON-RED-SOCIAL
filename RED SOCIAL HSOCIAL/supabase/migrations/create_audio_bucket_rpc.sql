-- 🎵 RPC Function to Create Audio Bucket
-- Function to create the post-audio bucket if it doesn't exist

CREATE OR REPLACE FUNCTION create_audio_bucket_if_not_exists()
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if bucket already exists
    IF EXISTS (
        SELECT 1 FROM storage.buckets 
        WHERE id = 'post-audio'
    ) THEN
        RETURN QUERY SELECT true, 'Bucket already exists'::text;
        RETURN;
    END IF;
    
    -- Create the bucket
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'post-audio',
        'post-audio',
        true,
        10485760, -- 10MB limit
        ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm', 'audio/aac']
    );
    
    -- Drop existing policies first
    DROP POLICY IF EXISTS "Users can upload audio files" ON storage.objects;
    DROP POLICY IF EXISTS "Audio files are publicly accessible" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own audio files" ON storage.objects;
    
    -- Create policies for the bucket
    CREATE POLICY "Users can upload audio files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'post-audio' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()
    );
    
    CREATE POLICY "Audio files are publicly accessible" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'post-audio'
    );
    
    CREATE POLICY "Users can delete their own audio files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'post-audio' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()
    );
    
    -- Grant permissions
    GRANT ALL ON storage.buckets TO authenticated;
    GRANT ALL ON storage.objects TO authenticated;
    
    RETURN QUERY SELECT true, 'Bucket created successfully'::text;
END;
$$;
