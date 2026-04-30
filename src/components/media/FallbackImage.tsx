import React, { useState, useEffect } from 'react';
import { getHybridUrl } from '@/lib/hybrid-url';

interface FallbackImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  onClick?: () => void;
  loading?: 'lazy' | 'eager';
}

export function FallbackImage({ src, alt, className, onClick, loading = 'lazy' }: FallbackImageProps) {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!src) {
      setCurrentUrl('');
      setIsLoading(false);
      return;
    }

    setHasError(false);
    setIsLoading(true);

    // Intentar URL híbrida primero
    const hybridUrl = getHybridUrl(src);
    if (hybridUrl) {
      setCurrentUrl(hybridUrl);
    } else {
      setCurrentUrl('');
      setIsLoading(false);
    }
  }, [src]);

  const handleError = () => {
    if (!hasError && src) {
      setHasError(true);
      setIsLoading(false);
    } else {
      console.error('❌ Fallback también falló');
      setIsLoading(false);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    console.log('✅ Imagen cargada exitosamente:', currentUrl);
  };

  if (isLoading && !currentUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted border border-border ${className}`}>
        <div className="text-center p-4">
          <div className="text-muted-foreground text-sm">No hay imagen disponible</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className={`absolute inset-0 flex items-center justify-center bg-muted ${className}`}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}
      <img
        src={currentUrl}
        alt={alt}
        className={className}
        onClick={onClick}
        loading={loading}
        decoding="async"
        onError={handleError}
        onLoad={handleLoad}
        style={{ opacity: isLoading ? 0 : 1 }}
      />
    </>
  );
}
