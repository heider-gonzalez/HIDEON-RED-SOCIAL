
import { supabase } from "@/integrations/supabase/client";

const R2_PUBLIC_URL = (import.meta as any)?.env?.VITE_R2_PUBLIC_URL as string | undefined;

export async function uploadToSupabase(file: File, fileName: string): Promise<string> {
  try {
    try {
      const { data, error } = await supabase.functions.invoke('upload-to-r2', {
        body: {
          fileName,
          contentType: file.type,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        throw error;
      }

      const signedUrl = (data as any)?.signedUrl as string | undefined;
      const publicUrlFromFn = (data as any)?.publicUrl as string | undefined;
      const key = (data as any)?.key as string | undefined;

      if (!signedUrl) {
        throw new Error('R2 signed URL missing. Check Edge Function upload-to-r2 and its secrets.');
      }

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });

      if (!uploadRes.ok) {
        const hint = uploadRes.status === 0
          ? 'Possible CORS/OPTIONS issue in your R2 bucket policy.'
          : 'Check your R2 bucket CORS policy includes OPTIONS and allows Content-Type/Cache-Control headers.';
        throw new Error(`R2 upload failed: ${uploadRes.status} ${uploadRes.statusText}. ${hint}`);
      }

      if (key && R2_PUBLIC_URL) {
        const finalUrl = `${String(R2_PUBLIC_URL).replace(/\/$/, '')}/${key}`;
        console.log('R2 upload successful, URL:', finalUrl);
        return finalUrl;
      }

      if (publicUrlFromFn) {
        return publicUrlFromFn;
      }

      throw new Error('R2 upload succeeded but no public URL was provided. Set VITE_R2_PUBLIC_URL or CLOUDFLARE_R2_PUBLIC_URL.');
    } catch (r2Error) {
      console.warn('R2 upload failed, falling back to Supabase Storage:', r2Error);

      const filePath = fileName;

      const { error } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      return publicUrl;
    }
  } catch (error) {
    console.error('Error uploading to Supabase storage:', error);
    throw error;
  }
}


export function getMediaType(file: File): 'image' | 'video' | 'audio' | null {
  if (!file) return null;
  
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/') || file.type === 'audio/webm') return 'audio';
  
  return null;
}

/**
 * Compress image before upload for better performance
 */
export async function compressImage(file: File, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate optimal dimensions
      const maxWidth = 1920;
      const maxHeight = 1080;
      
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/webp',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original
          }
        },
        'image/webp',
        quality
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload with automatic compression for images
 */
export async function uploadWithOptimization(file: File, fileName: string): Promise<string> {
  let processedFile = file;
  
  // Compress images automatically
  if (file.type.startsWith('image/') && file.size > 500000) { // 500KB threshold
    try {
      processedFile = await compressImage(file, 0.85);
      console.log('Image compressed:', { 
        originalSize: file.size, 
        compressedSize: processedFile.size,
        reduction: Math.round(((file.size - processedFile.size) / file.size) * 100) + '%'
      });
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
    }
  }
  
  return uploadToSupabase(processedFile, fileName);
}
