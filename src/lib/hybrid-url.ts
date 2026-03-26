/**
 * Normaliza URLs de Supabase Storage.
 * Nota: el proyecto usa Supabase Storage como origen de media.
 */
export function normalizeStorageUrl(url?: string | null): string | null {
  if (!url) return null;
  // La app ya migró a Supabase Storage. NO convertimos a R2.
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
  
  // Si ya es una URL completa, usarla directamente
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('✅ URL completa detectada:', url);
    return url;
  }
  
  // Si es solo un path, construir URL Supabase
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  const supabaseUrl = `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/media/${cleanPath}`;
  console.log('🔄 URL Supabase generada:', supabaseUrl);
  return supabaseUrl;
}

/** Obtiene la URL principal de video de un post (media_urls, media_url o demo_url).
 * Importante: debe ser ESTRICTO y solo devolver URLs que parezcan video.
 */
export function getPostVideoUrl(post: {
  media_url?: string | null;
  media_urls?: string[] | null;
  media_type?: string | null;
  demo_url?: string | null;
}): string | null {
  const videoExt = ['.mp4', '.mov', '.webm', '.m4v', '.ogg', '.3gp', '.mkv', '.avi', '.flv'];
  const isVideo = (u?: string | null) => {
    const s = String(u || '').toLowerCase();
    if (!s) return false;
    // If it has a known video extension anywhere in the path/query.
    if (videoExt.some((ext) => s.includes(ext))) return true;
    // Some Supabase URLs may not include extension; rely on media_type.
    const mt = String(post.media_type || '').toLowerCase();
    if (mt === 'video' || mt.startsWith('video/')) return true;
    return false;
  };

  const candidates: string[] = [];
  const urls = (post.media_urls && Array.isArray(post.media_urls) ? post.media_urls : []).filter(Boolean) as string[];
  candidates.push(...urls);
  if (post.media_url) candidates.push(post.media_url);
  if ((post as any).demo_url) candidates.push((post as any).demo_url);

  const firstVideo = candidates.find((u) => isVideo(u));
  if (!firstVideo) return null;

  return getHybridUrl(firstVideo) || firstVideo;
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
