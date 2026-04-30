
import { supabase } from "@/integrations/supabase/client";
import { uploadWithOptimizationKey } from "@/lib/storage/cloudflare-r2";
import { requireAuthUser } from "@/lib/auth/auth-store";

export async function uploadMediaFile(file: File): Promise<string | null> {
  if (!file) return null;

  try {
    const user = requireAuthUser();

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    console.log('Starting media upload:', { fileName, fileSize: file.size, fileType: file.type });

    // Upload to Cloudflare R2 (with Supabase fallback)
    // Store only the key/path reference in DB.
    const key = await uploadWithOptimizationKey(file, fileName);

    // Verify the URL is accessible
    if (!key) {
      throw new Error('Failed to get public URL');
    }

    console.log('Media upload completed:', { key });
    return key;
  } catch (error) {
    console.error('Error uploading media file:', error);
    throw error;
  }
}

export function getMediaType(file: File): 'image' | 'video' | 'audio' | null {
  if (!file) return null;
  
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/') || file.type === 'audio/webm') return 'audio';
  
  // Return null for generic files instead of 'file' to match database constraint
  return null;
}
