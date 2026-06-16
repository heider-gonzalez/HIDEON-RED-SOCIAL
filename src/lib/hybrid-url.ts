/**
 * Normaliza URLs de Supabase Storage.
 * Nota: el proyecto usa Supabase Storage como origen de media.
 */
export function normalizeStorageUrl(url?: string | null): string | null {
  if (!url) return null;
  return getHybridUrl(url);
}

// Función para manejar URLs híbridas entre Supabase y R2
export function getHybridUrl(input: string | null | undefined): string | null {
  const url = (input || '').trim();
  if (!url) return null;

  // Defensive fix: some legacy migrations incorrectly produced "...r2.devmedia/..." (missing slash)
  // Normalize those into "...r2.dev/media/..." before any further processing.
  const repairedR2Url = url
    .replace(/\.r2\.devmedia\//i, '.r2.dev/media/')
    .replace(/\.r2\.devmulti_media\//i, '.r2.dev/multi_media/');

  const R2_PUBLIC_URL = (import.meta as any)?.env?.VITE_R2_PUBLIC_URL as string | undefined;

  const isSupabaseStorageUrl = (u: string) =>
    u.includes('/storage/v1/object/public/') || u.includes('/storage/v1/render/image');

  // Si ya es una URL completa (contiene http), usarla directamente
  if (repairedR2Url.startsWith('http://') || repairedR2Url.startsWith('https://')) {
    // Si es una URL de Supabase Storage, intentar convertir a R2 para evitar egress.
    if (repairedR2Url.includes('/storage/v1/render/image')) {
      return null;
    }

    if (R2_PUBLIC_URL && repairedR2Url.includes('/storage/v1/object/public/')) {
      try {
        const u = new URL(repairedR2Url);
        const idx = u.pathname.indexOf('/storage/v1/object/public/');
        if (idx >= 0) {
          let rest = u.pathname.slice(idx + '/storage/v1/object/public/'.length).replace(/^\//, '');
          if (rest) {
            if (rest.startsWith('media/')) {
              const file = rest.slice('media/'.length);
              const m = file.match(/^([0-9a-fA-F-]{36})_(avatar|cover)_/);
              if (m) {
                const userId = m[1];
                const kind = m[2];
                rest = `profiles/${userId}/${kind}/${file}`;
              } else {
                rest = file;
              }
            }
            if (rest.startsWith('multi_media/')) rest = rest.slice('multi_media/'.length);
            return `${String(R2_PUBLIC_URL).replace(/\/$/, '')}/${rest}`;
          }
        }
      } catch {
        // ignore
      }
    }
    if (isSupabaseStorageUrl(repairedR2Url)) {
      return null;
    }
    return repairedR2Url;
  }
  
  // Si es solo un path, construir URL con dominio R2
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  if (R2_PUBLIC_URL) {
    return `${String(R2_PUBLIC_URL).replace(/\/$/, '')}/${cleanPath}`;
  }

  return cleanPath;
}

// Función mejorada con fallback y logging para debugging
export function getHybridUrlWithFallback(url?: string | null): string | null {
  if (!url) return null;
  
  console.log('🔍 Procesando URL:', url);
  
  // Si ya es una URL completa, usarla directamente
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('✅ URL completa detectada:', url);
    return getHybridUrl(url);
  }
  
  // Si es solo un path, construir URL Supabase
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  const built = getHybridUrl(cleanPath);
  console.log('🔄 URL generada:', built);
  return built;
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

  console.log('🎬 getPostVideoUrl - candidates:', candidates);
  const firstVideo = candidates.find((u) => isVideo(u));
  console.log('🎬 getPostVideoUrl - firstVideo:', firstVideo);
  
  if (!firstVideo) return null;

  const finalUrl = getHybridUrl(firstVideo);
  console.log('🎬 getPostVideoUrl - finalUrl:', finalUrl);
  return finalUrl;
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
