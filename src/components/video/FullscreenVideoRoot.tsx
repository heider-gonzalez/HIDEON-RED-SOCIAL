import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFullscreenVideo } from "@/components/video/FullscreenVideoContext";
import { useReelsFeed } from "@/hooks/reels/use-reels-feed";
import { useMobileDetection } from "@/hooks/use-mobile-detection";
import { OptimizedReelsInfiniteViewer } from "@/components/reels/OptimizedReelsInfiniteViewer";
import { ReelsInfiniteViewer } from "@/components/reels/ReelsInfiniteViewer";
import { X, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function FullscreenVideoRoot() {
  const { isOpen, params, close } = useFullscreenVideo();
  const { videosPosts, trackReelInteraction, trackReelView } = useReelsFeed();
  const { shouldUseMobileLayout } = useMobileDetection();
  const navigate = useNavigate();

  const handleBack = () => {
    close();
    navigate(-1);
  };

  const resolvedInitialPostId = useMemo(() => {
    const byId = params?.initialPostId;
    if (byId) return byId;

    const url = params?.initialUrl;
    if (!url) return undefined;

    const found = videosPosts.find((p: any) => {
      const urls = Array.isArray(p?.media_urls) ? p.media_urls : [];
      return urls.includes(url) || p?.media_url === url;
    });

    return found?.id;
  }, [params?.initialPostId, params?.initialUrl, videosPosts]);

  const initialPlayback = useMemo(() => {
    if (!resolvedInitialPostId) return undefined;
    if (typeof params?.initialTime !== "number") return undefined;
    return {
      postId: resolvedInitialPostId,
      time: params.initialTime,
      muted: params?.muted,
    };
  }, [params?.initialTime, params?.muted, resolvedInitialPostId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0 w-screen h-[100svh] max-w-none border-none rounded-none bg-black [&>button]:hidden">
        <DialogTitle className="sr-only">Visor de video</DialogTitle>
        <DialogDescription className="sr-only">Visor fullscreen para videos estilo Reels/Cine</DialogDescription>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={close}
          className="absolute top-3 left-3 z-[80] rounded-full bg-black/50 text-white hover:bg-black/70"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="absolute top-3 right-3 z-[80] rounded-full bg-black/50 text-white hover:bg-black/70"
          aria-label="Atrás"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {shouldUseMobileLayout ? (
          <OptimizedReelsInfiniteViewer
            posts={videosPosts}
            onReaction={trackReelInteraction}
            onViewTracked={trackReelView}
            initialPostId={resolvedInitialPostId}
            initialPlayback={initialPlayback}
          />
        ) : (
          <ReelsInfiniteViewer
            posts={videosPosts}
            onReaction={trackReelInteraction}
            onViewTracked={trackReelView}
            initialPostId={resolvedInitialPostId}
            initialPlayback={initialPlayback}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
