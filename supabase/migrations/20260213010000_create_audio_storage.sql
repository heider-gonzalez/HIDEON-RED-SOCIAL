-- 🎵 Create Audio Storage Bucket
-- Storage for post audio files

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-audio',
  'post-audio',
  true,
  10485760, -- 10MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm', 'audio/aac']
) ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for audio files
-- Allow authenticated users to upload audio files
CREATE POLICY "Users can upload audio files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'post-audio' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()
);

-- Allow public access to audio files
CREATE POLICY "Audio files are publicly accessible" ON storage.objects
FOR SELECT USING (
  bucket_id = 'post-audio'
);

-- Allow users to delete their own audio files
CREATE POLICY "Users can delete their own audio files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'post-audio' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()
);

-- Grant access to storage functions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
