import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Post } from "@/types/post";
import { useIsMobile } from "@/hooks/use-mobile";
import { PostHeader } from "@/components/post/PostHeader";
import { PostActivitySummary } from "@/components/post/PostActivitySummary";
import { ActionsButtons } from "@/components/post/actions/ActionsButtons";
import { Comments } from "@/components/post/Comments";
import { usePost } from "@/hooks/use-post";
import { getHybridUrl } from "@/lib/hybrid-url";

export type LightboxMediaItem = {
  url: string;
  type: "image" | "video";
};

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  items: LightboxMediaItem[];
  startIndex?: number;
  post?: Post;
}

function DesktopPostPanel({ post }: { post: Post }) {
  const postState = usePost(post as Post, false, true);

  return (
    <div className="bg-background h-full overflow-y-auto">
      <div className="p-3 border-b">
        <PostHeader post={post as Post} isDemoPost={Boolean((post as any)?.is_demo || (post as any)?.demo_readonly)} />
      </div>

      <div className="px-3 pt-3">
        <div className="text-sm text-foreground whitespace-pre-wrap break-words">
          {(post as any)?.content || ""}
        </div>
      </div>

      <div className="mt-2">
        <PostActivitySummary
          post={post as Post}
          reactionsByType={(post as any)?.reactions_by_type || {}}
          commentsCount={(post as any)?.comments_count || 0}
          sharesCount={(post as any)?.shares_count || 0}
          onCommentsClick={() => postState.toggleComments()}
        />

        <div className="border-t border-border/50" />

        <ActionsButtons
          postId={(post as Post).id}
          userReaction={null}
          onComment={() => postState.toggleComments()}
          post={post as Post}
          onReaction={(id, type) => postState.onReaction(id, type)}
          commentsExpanded={postState.showComments}
          sharesCount={(post as any)?.shares_count || 0}
        />

        <Comments
          postId={(post as Post).id}
          comments={postState.comments}
          onReaction={postState.handleCommentReaction}
          onReply={postState.handleReply}
          onSubmitComment={postState.handleSubmitComment}
          onDeleteComment={postState.handleDeleteComment}
          onUpdateComment={postState.handleUpdateComment}
          onLoadReplies={postState.loadReplies}
          newComment={postState.newComment}
          onNewCommentChange={postState.setNewComment}
          replyTo={postState.replyTo}
          onCancelReply={postState.handleCancelReply}
          showComments={postState.showComments}
          commentImage={postState.commentImage}
          setCommentImage={postState.setCommentImage}
          postAuthorId={(post as Post).user_id}
          totalCommentsCount={(post as any)?.comments_count ?? (post as any)?.comments?.count}
          isSubmitting={postState.isSubmitting}
          loadMoreRef={postState.loadMoreRef}
          hasNextPage={postState.hasNextPage}
          isFetchingNextPage={postState.isFetchingNextPage}
        />
      </div>
    </div>
  );
}

export function MediaLightbox({ isOpen, onClose, items, startIndex = 0, post }: MediaLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [isReelLikeVideo, setIsReelLikeVideo] = useState(false);
  const wheelLockRef = useRef<number>(0);
  const pointerStartXRef = useRef<number | null>(null);
  const pointerStartYRef = useRef<number | null>(null);
  const pointerMovedRef = useRef(false);
  const didPushHistoryRef = useRef(false);
  const isMobile = useIsMobile();

  const total = items.length;
  const current = items[index];
  const currentSrc = getHybridUrl(current?.url) || current?.url;

  const isDesktopPostViewer = Boolean(post) && !isMobile;


  useEffect(() => {
    setIsReelLikeVideo(false);
  }, [index, current?.url, current?.type]);

  useEffect(() => {
    if (isOpen) {
      setIndex(Math.min(Math.max(startIndex, 0), Math.max(total - 1, 0)));
    }
  }, [isOpen, startIndex, total]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "ArrowLeft") {
        if (total <= 1) return;
        setIndex((prev) => (prev - 1 + total) % total);
        return;
      }

      if (e.key === "ArrowRight") {
        if (total <= 1) return;
        setIndex((prev) => (prev + 1) % total);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, total]);

  useEffect(() => {
    if (!isOpen) {
      didPushHistoryRef.current = false;
      return;
    }

    try {
      if (!didPushHistoryRef.current) {
        window.history.pushState({ __hsocial_lightbox: true }, "");
        didPushHistoryRef.current = true;
      }
    } catch {
      // ignore
    }

    const onPopState = () => {
      onClose();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isOpen, onClose]);

  if (!isOpen || !current) return null;

  const goPrev = () => {
    if (total <= 1) return;
    setIndex((prev) => (prev - 1 + total) % total);
  };
  const goNext = () => {
    if (total <= 1) return;
    setIndex((prev) => (prev + 1) % total);
  };

  const SWIPE_THRESHOLD_PX = 60;

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    const now = Date.now();
    if (now - wheelLockRef.current < 350) return;

    if (Math.abs(e.deltaY) < 10) return;

    wheelLockRef.current = now;

    if (e.deltaY > 0) {
      goNext();
    } else {
      goPrev();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={
          isDesktopPostViewer
            ? "p-0 fixed inset-0 translate-x-0 translate-y-0 w-screen h-[100vh] max-w-none border-none rounded-none bg-zinc-950/95 overflow-hidden [&>button]:hidden"
            : "p-0 fixed inset-0 translate-x-0 translate-y-0 w-screen h-[100svh] max-w-none border-none rounded-none bg-zinc-950/95 overflow-hidden [&>button]:hidden"
        }
        aria-describedby={undefined}
      >
        <DialogTitle asChild>
          <VisuallyHidden>Visor de medios</VisuallyHidden>
        </DialogTitle>
        <DialogDescription className="sr-only">Visor tipo Facebook para navegar por imágenes y videos</DialogDescription>

        {/* Fixed close button (estilo Facebook) */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-5 left-5 z-[10002] rounded-full bg-zinc-950/60 text-white hover:bg-zinc-950/80 backdrop-blur"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </Button>

        {isDesktopPostViewer ? (
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_400px] h-full min-h-0">
            {/* Left: Media */}
            <div
              className="relative flex items-center justify-center bg-transparent h-full w-full min-h-0"
              onWheel={handleWheel}
              onPointerDown={(e) => {
                pointerStartXRef.current = e.clientX;
                pointerStartYRef.current = e.clientY;
                pointerMovedRef.current = false;
                try {
                  (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                } catch {
                  // ignore
                }
              }}
              onPointerMove={(e) => {
                if (pointerStartXRef.current === null || pointerStartYRef.current === null) return;
                const dx = e.clientX - pointerStartXRef.current;
                const dy = e.clientY - pointerStartYRef.current;
                if (Math.abs(dx) > 10 || Math.abs(dy) > 10) pointerMovedRef.current = true;
              }}
              onPointerUp={(e) => {
                const startX = pointerStartXRef.current;
                const startY = pointerStartYRef.current;
                pointerStartXRef.current = null;
                pointerStartYRef.current = null;
                try {
                  (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
                } catch {
                  // ignore
                }

                if (!pointerMovedRef.current) return;
                if (startX === null || startY === null) return;
                const dx = e.clientX - startX;
                if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
                if (dx < 0) goNext();
                else goPrev();
              }}
              onPointerCancel={() => {
                pointerStartXRef.current = null;
                pointerStartYRef.current = null;
              }}
            >
              {/* Counter */}
              {total > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[80] text-xs text-white/90 tabular-nums">
                  {index + 1} / {total}
                </div>
              )}

              {total > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-zinc-950/55 hover:bg-zinc-950/80 text-white z-[80] h-11 w-11 rounded-full backdrop-blur"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}

              {current.type === "image" ? (
                <img
                  src={currentSrc}
                  alt={`Media ${index + 1} de ${total}`}
                  className="max-h-full max-w-[calc(100vw-400px)] object-contain transition-opacity duration-200"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  {isReelLikeVideo ? (
                    <div className="h-full max-h-full aspect-[9/16] w-auto max-w-[calc(100vw-400px)]">
                      <video
                        src={currentSrc}
                        className="h-full w-full object-cover transition-opacity duration-200"
                        controls
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onLoadedMetadata={(e) => {
                          try {
                            const v = e.currentTarget;
                            const w = v.videoWidth || 1;
                            const h = v.videoHeight || 1;
                            setIsReelLikeVideo(h / w >= 1.25);
                          } catch {
                            // ignore
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <video
                      src={currentSrc}
                      className="max-h-full max-w-[calc(100vw-400px)] object-contain transition-opacity duration-200"
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        try {
                          const v = e.currentTarget;
                          const w = v.videoWidth || 1;
                          const h = v.videoHeight || 1;
                          setIsReelLikeVideo(h / w >= 1.25);
                        } catch {
                          // ignore
                        }
                      }}
                    />
                  )}
                </div>
              )}

              {total > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-zinc-950/55 hover:bg-zinc-950/80 text-white z-[80] h-11 w-11 rounded-full backdrop-blur"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  aria-label="Siguiente"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}
            </div>

            <DesktopPostPanel post={post as Post} />
          </div>
        ) : (
          <div
            className="relative flex-1 flex items-center justify-center overflow-hidden bg-gray-950 h-full w-full"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
            role="button"
            tabIndex={0}
            onWheel={handleWheel}
            onPointerDown={(e) => {
              pointerStartXRef.current = e.clientX;
              pointerStartYRef.current = e.clientY;
              pointerMovedRef.current = false;
              try {
                (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
              } catch {
                // ignore
              }
            }}
            onPointerMove={(e) => {
              if (pointerStartXRef.current === null || pointerStartYRef.current === null) return;
              const dx = e.clientX - pointerStartXRef.current;
              const dy = e.clientY - pointerStartYRef.current;
              if (Math.abs(dx) > 10 || Math.abs(dy) > 10) pointerMovedRef.current = true;
            }}
            onPointerUp={(e) => {
              const startX = pointerStartXRef.current;
              const startY = pointerStartYRef.current;
              pointerStartXRef.current = null;
              pointerStartYRef.current = null;
              try {
                (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
              } catch {
                // ignore
              }

              if (!pointerMovedRef.current) return;

              if (startX === null || startY === null) return;
              const dx = e.clientX - startX;
              if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;

              if (dx < 0) goNext();
              else goPrev();
            }}
            onPointerCancel={() => {
              pointerStartXRef.current = null;
              pointerStartYRef.current = null;
            }}
          >
            {/* Counter */}
            {total > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[80] text-xs text-white/90 tabular-nums">
                {index + 1} / {total}
              </div>
            )}

            {total > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-zinc-950/40 hover:bg-zinc-950/60 text-white z-[80]"
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label="Anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            {current.type === "image" ? (
              <img
                src={currentSrc}
                alt={`Media ${index + 1} de ${total}`}
                className="max-h-full max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                loading="eager"
                decoding="async"
                role="button"
                tabIndex={0}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="button" tabIndex={0}>
                {isReelLikeVideo ? (
                  <div className="h-full max-h-full aspect-[9/16] w-auto max-w-full">
                    <video
                      src={currentSrc}
                      className="h-full w-full object-cover"
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        try {
                          const v = e.currentTarget;
                          const w = v.videoWidth || 1;
                          const h = v.videoHeight || 1;
                          setIsReelLikeVideo(h / w >= 1.25);
                        } catch {
                          // ignore
                        }
                      }}
                    />
                  </div>
                ) : (
                  <video
                    src={currentSrc}
                    className="max-h-full max-w-full object-contain"
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      try {
                        const v = e.currentTarget;
                        const w = v.videoWidth || 1;
                        const h = v.videoHeight || 1;
                        setIsReelLikeVideo(h / w >= 1.25);
                      } catch {
                        // ignore
                      }
                    }}
                  />
                )}
              </div>
            )}

            {total > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-zinc-950/40 hover:bg-zinc-950/60 text-white z-[80]"
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label="Siguiente"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
