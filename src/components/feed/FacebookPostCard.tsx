import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ThumbsUp, MessageCircle, Share2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getHybridUrl } from '@/lib/hybrid-url';

interface FacebookPostCardProps {
  post: {
    id: string;
    content: string;
    created_at: string;
    media_url?: string;
    media_urls?: string[];
    profiles: {
      id: string;
      username: string;
      avatar_url: string | null;
      full_name?: string;
      career?: string;
      institution?: string;
    };
    likes_count?: number;
    comments_count?: number;
    shares_count?: number;
  };
}

export function FacebookPostCard({ post }: FacebookPostCardProps) {
  const { username, avatar_url, full_name, career, institution } = post.profiles;
  
  const formattedDate = new Date(post.created_at).toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const displayName = full_name || username;
  const primaryMedia = post.media_url || (post.media_urls?.[0]);
  const mediaSrc = primaryMedia ? getHybridUrl(primaryMedia) : null;
  const isVideo = primaryMedia?.match(/\.(mp4|webm|mov|ogg)$/i);

  const likes = post.likes_count || 0;
  const comments = post.comments_count || 0;
  const shares = post.shares_count || 0;

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 mb-4 overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${post.profiles.id}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatar_url || undefined} />
                <AvatarFallback>
                  {displayName.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <Link
                  to={`/profile/${post.profiles.id}`}
                  className="font-semibold text-sm text-foreground hover:underline"
                >
                  {displayName}
                </Link>
                <span className="text-xs text-muted-foreground">
                  · {career || institution ? `${career || institution} · ` : ''}{formattedDate}
                </span>
                <Globe className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* Media */}
      {mediaSrc && (
        <div className="w-full border-t border-b border-border/30">
          {isVideo ? (
            <video
              src={mediaSrc}
              controls
              className="w-full max-h-[600px] object-contain bg-black"
            />
          ) : (
            <img
              src={mediaSrc}
              alt="Post media"
              className="w-full max-h-[600px] object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}

      {/* Engagement Stats */}
      {(likes > 0 || comments > 0 || shares > 0) && (
        <div className="px-4 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                <div className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <ThumbsUp className="h-2.5 w-2.5 text-white" />
                </div>
              </div>
              <span>{likes > 0 && `${likes}`}</span>
            </div>
            <div className="flex items-center gap-2">
              {comments > 0 && <span>{comments} comentarios</span>}
              {comments > 0 && shares > 0 && <span>·</span>}
              {shares > 0 && <span>{shares} compartidos</span>}
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-border/30 mx-4" />

      {/* Action Buttons */}
      <div className="flex items-center justify-around p-1">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 flex items-center gap-2 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <ThumbsUp className="h-5 w-5" />
          <span className="text-sm font-medium">Me gusta</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 flex items-center gap-2 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Comentar</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 flex items-center gap-2 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Share2 className="h-5 w-5" />
          <span className="text-sm font-medium">Compartir</span>
        </Button>
      </div>
    </div>
  );
}
