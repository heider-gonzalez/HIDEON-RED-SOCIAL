// 🎵 Audio Storage API
// Upload and manage audio files for posts

import { supabase } from '@/integrations/supabase/client';

export interface AudioMetadata {
  name: string;
  duration: number;
  size: number;
  type: string;
  startTime?: number;
  endTime?: number;
}

export async function uploadAudioFile(
  file: File,
  userId: string,
  metadata?: AudioMetadata
): Promise<{ url: string; metadata: AudioMetadata }> {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('post-audio')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      console.error('❌ Audio upload error:', error);
      throw new Error(`Error uploading audio: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('post-audio')
      .getPublicUrl(fileName);

    // Prepare metadata
    const audioMetadata: AudioMetadata = {
      name: file.name,
      duration: metadata?.duration || 0,
      size: file.size,
      type: file.type,
      startTime: metadata?.startTime || 0,
      endTime: metadata?.endTime || metadata?.duration || 0,
    };

    console.log('✅ Audio uploaded successfully:', {
      url: publicUrl,
      metadata: audioMetadata
    });

    return {
      url: publicUrl,
      metadata: audioMetadata
    };

  } catch (error) {
    console.error('❌ Audio upload failed:', error);
    throw error;
  }
}

export async function deleteAudioFile(url: string): Promise<void> {
  try {
    // Extract file path from URL
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = urlParts.slice(-2).join('/'); // userId/filename

    const { error } = await supabase.storage
      .from('post-audio')
      .remove([filePath]);

    if (error) {
      console.error('❌ Audio delete error:', error);
      throw new Error(`Error deleting audio: ${error.message}`);
    }

    console.log('✅ Audio deleted successfully:', filePath);

  } catch (error) {
    console.error('❌ Audio delete failed:', error);
    throw error;
  }
}

export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    
    audio.addEventListener('error', (e) => {
      reject(new Error('Could not load audio metadata'));
    });
    
    audio.src = URL.createObjectURL(file);
  });
}
