import React, { useState, useEffect } from 'react';
import { getHybridUrlWithFallback, checkUrlAccessibility } from '@/lib/hybrid-url';
import { MediaRenderer } from './MediaRenderer';

interface SmartMediaRendererProps {
  url?: string | null;
  className?: string;
  onClick?: () => void;
  alt?: string;
  videoRef?: React.Ref<HTMLVideoElement>;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  stopPropagationOnClick?: boolean;
  autoPlay?: boolean;
  autoPlayOnView?: boolean;
  pauseOnOutOfView?: boolean;
  resetOnPause?: boolean;
  customControls?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  playsInline?: boolean;
}

export function SmartMediaRenderer(props: SmartMediaRendererProps) {
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.url) {
      setFinalUrl(null);
      setIsLoading(false);
      return;
    }

    const processUrl = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Obtener URL híbrida con logging
        const hybridUrl = getHybridUrlWithFallback(props.url);
        
        if (!hybridUrl) {
          setError('No se pudo generar la URL');
          setIsLoading(false);
          return;
        }

        // Verificar si la URL es accesible
        const isAccessible = await checkUrlAccessibility(hybridUrl);
        
        if (isAccessible) {
          setFinalUrl(hybridUrl);
          console.log('✅ URL verificada y accesible:', hybridUrl);
        } else {
          // Si no es accesible, intentar fallback a Supabase
          if (props.url && !props.url.startsWith('http')) {
            const supabaseUrl = `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/${props.url.replace(/^\//, '')}`;
            const supabaseAccessible = await checkUrlAccessibility(supabaseUrl);
            
            if (supabaseAccessible) {
              setFinalUrl(supabaseUrl);
              console.log('🔄 Usando fallback de Supabase:', supabaseUrl);
            } else {
              setError('No se pudo acceder al archivo en R2 ni Supabase');
              console.error('❌ Ninguna URL es accesible');
            }
          } else {
            setError('URL no accesible');
          }
        }
      } catch (err) {
        setError('Error al procesar la URL');
        console.error('❌ Error procesando URL:', err);
      } finally {
        setIsLoading(false);
      }
    };

    processUrl();
  }, [props.url]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted ${props.className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !finalUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted border border-border ${props.className}`}>
        <div className="text-center p-4">
          <div className="text-muted-foreground text-sm">
            {error || 'No hay media disponible'}
          </div>
          {props.url && (
            <div className="text-xs text-muted-foreground mt-1">
              Original: {props.url}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <MediaRenderer
      {...props}
      url={finalUrl}
    />
  );
}
