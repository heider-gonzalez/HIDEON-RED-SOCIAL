import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage = React.memo(function OptimizedImage({
  src,
  alt,
  className = '',
  skeletonClassName = 'w-full h-96 object-cover',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const element = imgRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // Start loading the image when it comes into view
            if (element.src !== src) {
              element.src = src;
            }
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px' // Start loading 50px before it comes into view
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [src]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(false);
    onError?.();
  }, [onError]);

  // Show skeleton while loading or if there's an error
  if (!isInView || (!isLoaded && !hasError)) {
    return <Skeleton className={skeletonClassName} />;
  }

  // Show error state
  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <div className="text-center p-4">
          <div className="text-red-500 text-sm mb-2">⚠️ Error al cargar imagen</div>
          <button
            onClick={() => {
              setHasError(false);
              setIsLoaded(false);
              if (imgRef.current) {
                imgRef.current.src = src;
              }
            }}
            className="text-blue-500 hover:text-blue-700 text-sm underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={isInView ? src : undefined} // Don't load until in view
      alt={alt}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      loading="lazy"
      onLoad={handleLoad}
      onError={handleError}
    />
  );
});
