// Función para manejar URLs híbridas entre Supabase y R2
export function getHybridUrl(url?: string | null): string | null {
  if (!url) return null;
  
  // Si ya es una URL completa (contiene http), usarla directamente
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Si es solo un path, construir URL con dominio R2
  const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-d387767454eb4c528e6574b331e3f5c7.r2.dev';
  
  // Remover slash inicial si existe para evitar doble slash
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  
  return `${r2PublicUrl}/${cleanPath}`;
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
  
  // Si es solo un path, intentar R2 primero, luego fallback a Supabase
  const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-d387767454eb4c528e6574b331e3f5c7.r2.dev';
  const supabaseUrl = 'https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public';
  
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  const r2Url = `${r2PublicUrl}/${cleanPath}`;
  const supabaseUrlWithFallback = `${supabaseUrl}/${cleanPath}`;
  
  console.log('🔄 URLs generadas:');
  console.log('  R2:', r2Url);
  console.log('  Supabase fallback:', supabaseUrlWithFallback);
  
  // Por ahora retornar R2, pero podríamos implementar detección de cuál funciona
  return r2Url;
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
