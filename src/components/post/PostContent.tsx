
import { useState, memo } from "react";
import { ImageModal } from "./ImageModal";
import { VideoModal } from "./VideoModal";
// PostPoll removed for performance
import { Post } from "@/types/post";
import { EventCard } from "./EventCard";
import { EventModal } from "./EventModal";
import { usePollVoteMutation } from "@/hooks/post-mutations/use-poll-vote-mutation";
// Removed marketplace display
import { backgroundPresets } from "./TextBackgroundPalette";
import { MentionsText } from "./MentionsText";
import { MediaCarousel } from "./MediaCarousel";

interface PostContentProps {
  post: Post;
  postId: string;
}

function PostContentComponent({ post, postId }: PostContentProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  const { submitVote, isPending: isVoting } = usePollVoteMutation(postId);
  
  // 1. Extraer todas las posibles URLs de video/demo
  const proyectoDemoUrl = String((post as any)?.post_metadata?.proyecto?.demo_url || "").trim();
  const fallbackDemoUrl = String((post as any)?.demo_url || "").trim();
  const projectShowcaseVideoUrl = String(post.project_showcases?.[0]?.video_url || "").trim();
  const projectShowcaseDemoUrl = String(post.project_showcases?.[0]?.demo_url || "").trim();
  
  // 2. Definir función de detección de video (alineada con ProjectCard)
  const isVideoUrl = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.m4v'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext)) || 
           lowerUrl.includes('video') || 
           lowerUrl.includes('stream');
  };

  // 3. Buscar el primer video válido entre los metadatos
  const demoUrl = proyectoDemoUrl || fallbackDemoUrl || projectShowcaseVideoUrl || projectShowcaseDemoUrl;
  const demoIsVideo = isVideoUrl(demoUrl);

  // 4. Determinar si mostrar media
  const hasMedia =
    !!post.media_url ||
    (post.media_urls && post.media_urls.length > 0) ||
    demoIsVideo;
  
  // 5. Preparar items para MediaCarousel
  const mediaItems: Array<{ url: string; type: 'image' | 'video' }> = [];
  
  if (post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
    post.media_urls.forEach((url: string) => {
      const type = post.media_type?.startsWith('video') || isVideoUrl(url) ? 'video' : 'image';
      mediaItems.push({ url, type });
    });
  } else if (post.media_url) {
    const type = post.media_type?.startsWith('video') || isVideoUrl(post.media_url) ? 'video' : 'image';
    mediaItems.push({ url: post.media_url, type });
  } else if (demoIsVideo) {
    // Si no hay media_urls, usamos el video encontrado en metadatos
    mediaItems.push({ url: demoUrl, type: 'video' });
  }
  
  // Check if the post has a poll
  const hasPoll = post.poll && post.poll.options?.length > 0;

  // Check if the post has marketplace
  const hasMarketplace = !!post.marketplace;

  // Check if the post has event
  const hasEvent = !!post.event;

  // Remove excessive logging for performance
  // console.log('PostContent rendering:', { 
  //   postId: post.id, 
  //   hasMedia, 
  //   mediaUrl: post.media_url, 
  //   mediaType: post.media_type,
  //   hasMarketplace,
  //   hasIdea,
  //   hasEvent,
  //   hasPoll
  // });

  // Get background preset for styled content
  const backgroundPreset = post.content_style?.backgroundKey 
    ? backgroundPresets.find(p => p.key === post.content_style?.backgroundKey)
    : null;

  // Check if this is a text-only post with background
  const isStyledTextPost = post.content_style?.isTextOnly && 
                          post.content_style?.backgroundKey !== 'none' && 
                          backgroundPreset && 
                          !hasMedia;

  // Truncar texto si es muy largo
  const contentLength = post.content?.length || 0;
  const shouldTruncate = contentLength > 400 && !isStyledTextPost;
  const displayContent = shouldTruncate && !showFullText 
    ? post.content?.substring(0, 400) + '...' 
    : post.content;

  return (
    <div className="px-0 md:px-4 pb-0 pt-0">
      {post.post_type === 'services' && post.service_category && (
        <div className="px-4 md:px-0 mb-2">
          <div className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground max-w-full truncate">
            {post.service_category}
          </div>
        </div>
      )}

      {post.content && (
        <div className={isStyledTextPost ? "relative rounded-lg overflow-hidden mb-4" : ""}>
          {/* Background layer for styled text posts */}
          {isStyledTextPost && (
            <div className={`absolute inset-0 ${backgroundPreset.gradient}`} />
          )}
          
          <div>
            <MentionsText 
              content={displayContent || ''}
              className={
                isStyledTextPost 
                  ? "relative z-10 text-lg font-semibold text-white text-center py-10 px-4 md:px-6 whitespace-pre-wrap break-words"
                  : "text-[15px] leading-relaxed whitespace-pre-wrap break-words post-content px-4 md:px-0 text-foreground"
              }
            />
            {shouldTruncate && (
              <button
                onClick={() => setShowFullText(!showFullText)}
                className="text-muted-foreground text-sm hover:underline px-4 md:px-0 mt-1"
              >
                {showFullText ? 'Ver menos →' : 'Ver más →'}
              </button>
            )}
          </div>
        </div>
      )}
      
      {hasMedia && !hasMarketplace && (
        <div className="mt-2 mb-0 w-full">
          {mediaItems.length >= 1 ? (
            <MediaCarousel
              mediaItems={mediaItems}
              audioUrl={post.audio_url || undefined}
              audioMetadata={post.audio_metadata || null}
              reelsPostId={postId}
              post={post}
            />
          ) : null}
        </div>
      )}
      
      {hasPoll && post.poll && (
        <div className="mt-4 px-4 md:px-0">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm font-semibold text-foreground">
              {post.poll.question}
            </div>
            <div className="mt-3 space-y-2">
              {post.poll.options.map((opt) => {
                const totalVotes = Number(post.poll?.total_votes || 0);
                const votes = Number(opt.votes || 0);
                const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                const label = (opt as any).content || (opt as any).text || '';
                const isSelected = post.poll?.user_vote === opt.id;
                const hasVoted = Boolean(post.poll?.user_vote);
                const canVote = !hasVoted && !isVoting;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!canVote}
                    onClick={() => submitVote(String(opt.id))}
                    className={
                      "w-full text-left rounded-md border border-border p-2 " +
                      (canVote ? "hover:bg-muted/40 cursor-pointer" : "opacity-80 cursor-not-allowed")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className={isSelected ? "text-sm font-medium text-foreground" : "text-sm text-foreground"}>
                        {label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {pct}%
                      </div>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={isSelected ? "h-full bg-primary" : "h-full bg-muted-foreground/40"}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {Number(post.poll.total_votes || 0)} votos
            </div>
          </div>
        </div>
      )}

      {hasEvent && (
        <div className="mt-4">
          <EventCard 
            event={post.event!}
            onMoreInfo={() => setIsEventModalOpen(true)}
            onRegister={() => {
              // Aquí se implementaría la lógica de registro
              console.log('Registrar en evento:', post.event?.title);
            }}
          />
        </div>
      )}

      {/* Marketplace display removed for performance */}
      
      {/* Image Modal - solo si hay un solo archivo (MediaCarousel maneja sus propios modales) */}
      {mediaItems.length === 1 && mediaItems[0].type === 'image' && (
        <ImageModal 
          isOpen={isImageModalOpen} 
          onClose={() => setIsImageModalOpen(false)}
          imageUrl={mediaItems[0].url}
          altText="Post image"
        />
      )}
      
      {/* Video Modal - solo si hay un solo archivo */}
      {mediaItems.length === 1 && mediaItems[0].type === 'video' && (
        <VideoModal 
          isOpen={isVideoModalOpen} 
          onClose={() => setIsVideoModalOpen(false)}
          videoUrl={mediaItems[0].url}
          altText="Post video"
        />
      )}

      {/* Event Modal - Solo renderizar si hay evento */}
      {hasEvent && post.event && (
        <EventModal 
          event={post.event}
          isOpen={isEventModalOpen} 
          onClose={() => setIsEventModalOpen(false)}
          onRegister={() => {
            console.log('Registrar en evento:', post.event?.title);
            setIsEventModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

export const PostContent = memo(PostContentComponent);
