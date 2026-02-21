-- 🎵 MANUAL FIX: Create Audio Storage Bucket
-- EJECUTAR ESTE SCRIPT MANUALMENTE EN SUPABASE SQL EDITOR

-- 1. Crear el bucket para archivos de audio
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-audio',
  'post-audio',
  true,
  10485760, -- 10MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm', 'audio/aac']
) ON CONFLICT (id) DO NOTHING;

-- 2. Eliminar políticas existentes (si las hay)
DROP POLICY IF EXISTS "Users can upload audio files" ON storage.objects;
DROP POLICY IF EXISTS "Audio files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own audio files" ON storage.objects;

-- 3. Política para subir archivos de audio
CREATE POLICY "Users can upload audio files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'post-audio' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()
);

-- 4. Política para acceso público a archivos de audio
CREATE POLICY "Audio files are publicly accessible" ON storage.objects
FOR SELECT USING (
  bucket_id = 'post-audio'
);

-- 5. Política para eliminar archivos propios
CREATE POLICY "Users can delete their own audio files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'post-audio' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()
);

-- 6. Dar permisos a usuarios autenticados
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- 7. Verificar que el bucket fue creado
SELECT * FROM storage.buckets WHERE id = 'post-audio';

-- 8. Verificar políticas creadas
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
