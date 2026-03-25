const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-11aaf71a35c74d7da48843fdfc2c1e44.r2.dev';

/**
 * Convierte URLs de Supabase Storage a R2 (tras migración).
 * Si la app migró a R2, las URLs en DB pueden seguir apuntando a Supabase.
 */
export function normalizeStorageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (!url.includes('supabase.co/storage')) return url;
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)/);
    if (match) {
      const [, bucket, path] = match;
      return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${bucket}/${path}`;
    }
  } catch {
    // ignore
  }
  return url;
}

// Función para manejar URLs híbridas entre Supabase y R2
export function getHybridUrl(url?: string | null): string | null {
  if (!url) return null;

  // Si ya es una URL completa (contiene http), usarla directamente
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Si es solo un path, construir URL con dominio Supabase (revertir migración)
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  
  return `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/media/${cleanPath}`;
}

// Función mejorada con fallback y logging para debugging
export function getHybridUrlWithFallback(url?: string | null): string | null {
  if (!url) return null;
  
  console.log('🔍 Procesando URL:', url);
  
  // Si es URL de Supabase Storage, convertir a R2 (post-migración)
  const normalized = normalizeStorageUrl(url);
  if (normalized !== url) {
    console.log('✅ URL normalizada Supabase→R2:', normalized);
    return normalized;
  }

  // Si ya es una URL completa, usarla directamente
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('✅ URL completa detectada:', url);
    return url;
  }
  
  // Si es solo un path, construir URL R2
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  const r2Url = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${cleanPath}`;
  console.log('🔄 URL R2 generada:', r2Url);
  return r2Url;
}

/** Obtiene la URL principal de video de un post (media_urls o media_url) usando Supabase */
export function getPostVideoUrl(post: {
  media_url?: string | null;
  media_urls?: string[] | null;
  media_type?: string | null;
}): string | null {
  const videoExt = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.ogg'];
  const isVideo = (u: string) =>
    u && videoExt.some((ext) => String(u).toLowerCase().includes(ext));
  const urls = (post.media_urls && Array.isArray(post.media_urls) ? post.media_urls : []).filter(Boolean) as string[];
  const fromUrls = urls.find((u) => isVideo(String(u)));
  if (fromUrls) return getHybridUrl(fromUrls) || fromUrls;
  const m = post.media_url;
  if (m && (post.media_type?.toLowerCase?.().startsWith?.('video') || isVideo(m)))
    return getHybridUrl(m) || m;
  return getHybridUrl(m) || m;
}

// Función para verificar si una URL es accesible
export async function checkUrlAccessibility(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    return true; // Si no hay error CORS, probablemente funciona
  } catch (error) {
    console.warn('❌ URL no accesible:', url, error);
    return false;
  }
}
