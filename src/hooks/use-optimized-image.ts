import { useState, useRef, useEffect, useCallback } from 'react';
import { getOptimizedImageUrl, calculateOptimalImageSize, generateSrcSet, getLoadingStrategy } from '@/utils/image-optimization';

interface UseOptimizedImageOptions {
  src: string;
  priority?: 'high' | 'medium' | 'low';
  containerWidth?: number;
  quality?: number;
  onLoadingComplete?: () => void;
  onError?: () => void;
}

export function useOptimizedImage({
  src,
  priority = 'medium',
  containerWidth = 800,
  quality = 80,
  onLoadingComplete,
  onError,
}: UseOptimizedImageOptions) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority === 'high');
  const [error, setError] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Calcular tamaño óptimo basado en el container
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const optimalWidth = calculateOptimalImageSize(containerWidth, devicePixelRatio);
  
  // Generar URLs optimizadas
  const optimizedSrc = getOptimizedImageUrl(src, {
    width: optimalWidth,
    quality,
  });
  
  const srcSet = generateSrcSet(src, {
    width: optimalWidth,
    quality,
  });

  const loadingStrategy = getLoadingStrategy(priority);

  // Setup Intersection Observer para lazy loading
  useEffect(() => {
    if (priority === 'high' || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Empezar a cargar 50px antes de que sea visible
        threshold: 0.01,
      }
    );

    observer.observe(containerRef.current);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  // Manejar carga de imagen
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setError(false);
    onLoadingComplete?.();
  }, [onLoadingComplete]);

  const handleError = useCallback(() => {
    setError(true);
    setIsLoaded(true); // Mostrar estado de error
    onError?.();
  }, [onError]);

  // Precargar imagen cuando está en vista
  useEffect(() => {
    if (!isInView || !imgRef.current) return;

    const img = imgRef.current;
    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [isInView, handleLoad, handleError]);

  return {
    imgRef,
    containerRef,
    src: isInView ? optimizedSrc : undefined,
    srcSet: isInView ? srcSet : undefined,
    loading: loadingStrategy,
    isLoaded,
    error,
    isInView,
    optimalWidth,
  };
}