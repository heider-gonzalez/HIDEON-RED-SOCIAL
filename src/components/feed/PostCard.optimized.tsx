import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LikeButton } from './LikeButton';
import { InstagramAudioPlayer } from '@/components/media/InstagramAudioPlayer';
import { useUser } from '@/hooks/use-user';
import { Post } from './PostFeed';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { MediaLightbox, type LightboxMediaItem } from '@/components/post/MediaLightbox';
import { useFullscreenVideo } from '@/components/video/FullscreenVideoContext';
import { normalizePostContent } from '@/utils/post-content';
import { MessageCircle, Share2, MoreHorizontal, User, Briefcase, School, ChevronDown, ChevronUp, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { getHybridUrl } from '@/lib/hybrid-url';

export interface PostCardProps {
  post: Post;
}

export const PostCard = React.memo(function PostCard({ post }: PostCardProps) {
  const { user } = useUser();
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fullscreenVideo = useFullscreenVideo();
  
  // Memoized calculations to prevent re-computation
  const postProfile = useMemo(() => post.profiles, [post.profiles]);
  const { username, avatar_url, career, institution } = postProfile;
  
  const formattedDate = useMemo(() => new Date(post.created_at).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }), [post.created_at]);

  const mediaType = useMemo(() => {
    const isVideo = post.media_url?.match(/\.(mp4|webm|mov|ogg)$/i) || 
                      ((post as any).media_urls && (post as any).media_urls.some((url: string) => url.match(/\.(mp4|webm|mov|ogg)$/i)));
    const isImage = post.media_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
                      ((post as any).media_urls && (post as any).media_urls.some((url: string) => url.match(/\.(jpg|jpeg|png|gif|webp)$/i)));
    return { isVideo, isImage };
  }, [post.media_url, (post as any).media_urls]);

  const primaryMediaUrl = useMemo(() => {
    return post.media_url || 
           (((post as any).media_urls && (post as any).media_urls.find((url: string) => url.match(/\.(mp4|webm|mov|ogg)$/i))) ||
            ((post as any).media_urls && (post as any).media_urls[0]));
  }, [post.media_url, (post as any).media_urls]);

  const primaryMediaSrc = useMemo(() => getHybridUrl(primaryMediaUrl) || null, [primaryMediaUrl]);

  const mediaItems: LightboxMediaItem[] = useMemo(() => {
    const urls = [
      ...(Array.isArray((post as any).media_urls) ? (post as any).media_urls : []),
      ...(post.media_url ? [post.media_url] : [])
    ].filter(Boolean) as string[];

    const uniq = Array.from(new Set(urls));
    return uniq.map((url) => {
      const isVid = Boolean(url.match(/\.(mp4|webm|mov|ogg)$/i));
      return { url, type: isVid ? 'video' : 'image' };
    });
  }, [post.media_url, (post as any).media_urls]);

  const cleanContent = useMemo(() => normalizePostContent(post.content), [post.content]);

  // Memoized event handlers
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Publicación de ${username}`,
          text: cleanContent,
          url: window.location.href + '/post/' + post.id
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href + '/post/' + post.id);
    }
  }, [username, cleanContent, post.id]);

  const formatTime = useCallback((seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }, []);

  const openFullscreenFromFeed = useCallback((v?: HTMLVideoElement | null) => {
    const video = v ?? videoRef.current;
    try {
      video?.pause();
    } catch {
      // ignore
    }
    fullscreenVideo.open({
      initialPostId: post.id,
      initialUrl: primaryMediaUrl,
      initialTime: video?.currentTime ?? 0,
      muted: video?.muted ?? true,
    });
  }, [post.id, primaryMediaUrl, fullscreenVideo]);

  const togglePlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (v.paused) {
        await v.play();
      } else {
        v.pause();
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = !v.muted;
    } catch {
      // ignore
    }
  }, []);

  const changeVolume = useCallback((next: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.min(1, Math.max(0, next));
    try {
      v.volume = clamped;
    } catch {
      // ignore
    }
  }, []);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Element is visible, you can start loading media if needed
            console.log('PostCard is visible:', post.id);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [post.id]);

  return (
    <div ref={containerRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={getHybridUrl(avatar_url) || undefined} alt={username} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {username}
              </h3>
              {(career || institution) && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  {career && (
                    <div className="flex items-center space-x-1">
                      <Briefcase className="h-3 w-3" />
                      <span>{career}</span>
                    </div>
                  )}
                  {institution && (
                    <div className="flex items-center space-x-1">
                      <School className="h-3 w-3" />
                      <span>{institution}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {cleanContent}
        </p>
      </div>

      {/* Media */}
      {primaryMediaUrl && (
        <div className="relative bg-black">
          {mediaType.isVideo ? (
            <video
              ref={videoRef}
              src={primaryMediaSrc || undefined}
              className="w-full max-h-96 object-contain"
              onClick={togglePlay}
              playsInline
              muted
              preload="metadata"
            />
          ) : (
            <img
              src={primaryMediaSrc || undefined}
              alt="Post image"
              className="w-full max-h-96 object-contain cursor-pointer"
              onClick={() => setLightboxOpen(true)}
              loading="lazy"
            />
          )}
          
          {/* Media controls overlay */}
          <div className="absolute bottom-2 right-2 flex items-center space-x-2">
            {mediaType.isVideo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="bg-black/50 text-white hover:bg-black/70"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLightboxOpen(true)}
              className="bg-black/50 text-white hover:bg-black/70"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <LikeButton postId={post.id} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              {commentCount > 0 && (
                <span className="text-sm">{commentCount}</span>
              )}
            </Button>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formattedDate}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <CommentForm postId={post.id} onCommentSubmitted={() => setCommentCount(prev => prev + 1)} />
          <CommentList postId={post.id} />
        </div>
      )}

      {/* Lightbox */}
      <MediaLightbox
        isOpen={lightboxOpen}
        items={mediaItems}
        initialIndex={0}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
});
