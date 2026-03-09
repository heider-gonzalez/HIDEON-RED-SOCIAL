import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { ReelsInfiniteViewer } from '@/components/reels/ReelsInfiniteViewer';
import { OptimizedReelsInfiniteViewer } from '@/components/reels/OptimizedReelsInfiniteViewer';
import { ReelsDesktopLayout } from '@/components/reels/ReelsDesktopLayout';
import { useReelsFeed } from '@/hooks/reels/use-reels-feed';
import { useMobileDetection } from '@/hooks/use-mobile-detection';

export default function Reels() {
  const { reelId } = useParams();
  const { 
    videosPosts, 
    isLoading, 
    trackReelView, 
    trackReelInteraction,
    hasVideos 
  } = useReelsFeed();

  const { shouldUseMobileLayout } = useMobileDetection();

  if (!isLoading && !hasVideos) {
    return (
      <>
        <Helmet>
          <title>Reels - HIDEON</title>
          <meta name="description" content="Descubre videos cortos y creativos de la comunidad universitaria" />
        </Helmet>
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center text-foreground max-w-md mx-auto">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-semibold mb-2">No hay videos disponibles</h3>
            <p className="text-muted-foreground mb-4">
              No se encontraron videos en la base de datos.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </>
    );
  }

  // Contenido de reels
  const reelsContent = isLoading ? (
    <div className="flex justify-center items-center h-screen bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  ) : hasVideos ? (
    shouldUseMobileLayout ? (
      <OptimizedReelsInfiniteViewer
        posts={videosPosts}
        onReaction={trackReelInteraction}
        onViewTracked={trackReelView}
      />
    ) : (
      <ReelsInfiniteViewer 
        posts={videosPosts} 
        onReaction={trackReelInteraction}
        onViewTracked={trackReelView}
        initialPostId={reelId}
      />
    )
  ) : null;

  return (
    <>
      <Helmet>
        <title>Reels - HIDEON</title>
        <meta name="description" content="Descubre videos cortos y creativos de la comunidad universitaria" />
      </Helmet>

      <div className="flex justify-center items-center min-h-screen bg-black">
        <div className="w-full max-w-[1400px]">
          {reelsContent}
        </div>
      </div>

    </>
  );
}