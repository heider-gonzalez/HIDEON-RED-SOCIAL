/**
 * Utilidades para optimización de imágenes
 * Genera URLs optimizadas para diferentes tamaños y formatos
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png' | 'auto';
  fit?: 'cover' | 'contain' | 'fill';
}

/**
 * Genera una URL optimizada para Cloudflare R2 u otros servicios de almacenamiento
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: ImageOptimizationOptions = {}
): string {
  const {
    width = 800,
    height = 600,
    quality = 80,
    format = 'auto',
    fit = 'cover'
  } = options;

  try {
    const url = new URL(originalUrl);
    
    // Si es Cloudflare R2, podemos usar sus servicios de optimización
    if (url.hostname.includes('r2') || url.hostname.includes('cloudflare')) {
      url.searchParams.set('width', width.toString());
      url.searchParams.set('height', height.toString());
      url.searchParams.set('quality', quality.toString());
      url.searchParams.set('format', format);
      url.searchParams.set('fit', fit);
      return url.toString();
    }
    
    // Para Supabase u otros servicios, agregamos parámetros de optimización
    url.searchParams.set('w', width.toString());
    url.searchParams.set('h', height.toString());
    url.searchParams.set('q', quality.toString());
    
    return url.toString();
  } catch {
    // Si hay error al parsear la URL, retornar la original
    return originalUrl;
  }
}

/**
 * Genera múltiples tamaños de imagen para responsive images
 */
export function getResponsiveImageUrls(
  originalUrl: string,
  baseOptions: ImageOptimizationOptions = {}
): Record<string, string> {
  const sizes = [320, 640, 768, 1024, 1200, 1920];
  
  return sizes.reduce((acc, size) => {
    acc[size] = getOptimizedImageUrl(originalUrl, {
      ...baseOptions,
      width: size,
      height: Math.round(size * (baseOptions.height || 600) / (baseOptions.width || 800))
    });
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Calcula el tamaño óptimo de imagen basado en el viewport
 */
export function calculateOptimalImageSize(
  containerWidth: number,
  devicePixelRatio: number = 1
): number {
  // Calcular el tamaño considerando el ratio de píxeles del dispositivo
  const optimalSize = Math.round(containerWidth * devicePixelRatio);
  
  // Redondear al siguiente tamaño estándar
  const standardSizes = [320, 640, 768, 1024, 1200, 1920];
  return standardSizes.find(size => size >= optimalSize) || 1920;
}

/**
 * Genera srcset para responsive images
 */
export function generateSrcSet(
  originalUrl: string,
  baseOptions: ImageOptimizationOptions = {}
): string {
  const urls = getResponsiveImageUrls(originalUrl, baseOptions);
  
  return Object.entries(urls)
    .map(([size, url]) => `${url} ${size}w`)
    .join(', ');
}

/**
 * Lazy loading strategy selector
 */
export function getLoadingStrategy(
  priority: 'high' | 'medium' | 'low' = 'medium'
): 'eager' | 'lazy' {
  return priority === 'high' ? 'eager' : 'lazy';
}