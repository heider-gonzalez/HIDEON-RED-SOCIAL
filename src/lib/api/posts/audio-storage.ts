// 🎵 Audio Storage API
// Upload and manage audio files for posts

import { supabase } from '@/integrations/supabase/client';
import { uploadToSupabase } from '@/lib/storage/cloudflare-r2';

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

    const key = await uploadToSupabase(file, `post-audio/${fileName}`, { return: 'key' });

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
      url: key,
      metadata: audioMetadata
    });

    return {
      url: key,
      metadata: audioMetadata
    };

  } catch (error) {
    console.error('❌ Audio upload failed:', error);
    throw error;
  }
}

export async function deleteAudioFile(url: string): Promise<void> {
  try {
    if (!url) return;

    const key = (() => {
      if (!url) return '';
      if (!url.startsWith('http')) return url.replace(/^\//, '');
      try {
        const u = new URL(url);
        return u.pathname.replace(/^\//, '');
      } catch {
        return '';
      }
    })();

    if (!key) return;

    const { error } = await supabase.functions.invoke('delete-from-r2', {
      body: JSON.stringify({ key }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (error) {
      console.error('❌ Audio delete error:', error);
      throw new Error(`Error deleting audio: ${error.message}`);
    }

    console.log('✅ Audio deleted successfully:', key);

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
