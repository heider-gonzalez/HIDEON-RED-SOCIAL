/**
 * Utilidades de rendimiento para optimizar eventos y operaciones costosas
 */

/**
 * Debounce function - retrasa la ejecución de una función
 * Útil para eventos que se disparan frecuentemente como scroll, resize, input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - limita la frecuencia de ejecución de una función
 * Útil para eventos de scroll y resize
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoize function - cachea resultados de funciones costosas
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    // Limitar el tamaño del cache para evitar memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
}

/**
 * RequestIdleCallback wrapper para ejecutar tareas cuando el navegador está inactivo
 */
export function runWhenIdle(callback: () => void, timeout?: number): void {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => callback(), { timeout });
  } else {
    // Fallback para navegadores que no soportan requestIdleCallback
    setTimeout(callback, timeout || 1);
  }
}

/**
 * Mide el tiempo de ejecución de una función
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  func: T,
  label: string
): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = func(...args);
    const end = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  }) as T;
}

/**
 * Batch DOM updates para reducir reflows
 */
export function batchDOMUpdates(updates: () => void): void {
  if ('requestAnimationFrame' in window) {
    requestAnimationFrame(() => {
      requestAnimationFrame(updates);
    });
  } else {
    setTimeout(updates, 0);
  }
}

/**
 * Detecta si el dispositivo tiene capacidades limitadas
 */
export function isLowEndDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  const deviceMemory = (navigator as any).deviceMemory || 4;
  const connection = (navigator as any).connection;
  
  return (
    hardwareConcurrency <= 2 ||
    deviceMemory <= 2 ||
    (connection && (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g'))
  );
}

/**
 * Ajusta la calidad de animaciones basado en las capacidades del dispositivo
 */
export function getAnimationQuality(): 'full' | 'reduced' | 'none' {
  if (typeof window === 'undefined') return 'full';
  
  // Respetar preferencias del usuario
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return 'none';
  
  // Ajustar basado en capacidades del dispositivo
  if (isLowEndDevice()) return 'reduced';
  
  return 'full';
}