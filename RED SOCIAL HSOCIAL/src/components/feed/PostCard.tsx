import { MessageCircle, Share2, MoreHorizontal, User, Briefcase, School, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LikeButton } from './LikeButton';
import { AudioPlayer } from '@/components/media/AudioPlayer';
import { EnhancedAudioPlayer } from '@/components/media/EnhancedAudioPlayer';
import { useUser } from '@/hooks/use-user';
import { Post } from './PostFeed';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';

export interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  // Format the creation date
  const formattedDate = new Date(post.created_at).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const { user } = useUser();
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(0);
  
  // Get profile data
  const { username, avatar_url, career, institution } = post.profiles;

  // Determine if media is an image or video
  const isVideo = post.media_url?.match(/\.(mp4|webm|mov|ogg)$/i) || 
                  (post.media_urls && post.media_urls.some(url => url.match(/\.(mp4|webm|mov|ogg)$/i)));
  const isImage = post.media_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
                  (post.media_urls && post.media_urls.some(url => url.match(/\.(jpg|jpeg|png|gif|webp)$/i)));
  
  // Get the primary media URL (for projects, use first video if exists)
  const primaryMediaUrl = post.media_url || 
                          (post.media_urls && post.media_urls.find(url => url.match(/\.(mp4|webm|mov|ogg)$/i))) ||
                          (post.media_urls && post.media_urls[0]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              {avatar_url ? (
                <AvatarImage src={avatar_url} alt={`@${username}`} />
              ) : (
                <AvatarFallback>
                  <span className="text-gray-400">
                    {username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h3 className="font-bold text-[#050505] dark:text-white truncate">
                  @{username}
                </h3>
                <span className="mx-1 text-gray-400">·</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formattedDate}
                </span>
              </div>
              {(career || institution) && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {career && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      <span>{career}</span>
                    </span>
                  )}
                  {institution && (
                    <span className="flex items-center gap-1">
                      <School className="h-3 w-3" />
                      <span>{institution}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">
          {post.content}
        </p>
      </div>

      {/* Media */}
      {primaryMediaUrl && (
        <div className="border-t border-b border-gray-100 dark:border-gray-700">
          {isImage && (
            <img
              src={primaryMediaUrl}
              alt="Post media"
              className="w-full h-auto max-h-[500px] object-cover"
              loading="lazy"
            />
          )}
          {isVideo && (
            <video
              src={primaryMediaUrl}
              controls
              className="w-full max-h-[500px]"
            >
              Tu navegador no soporta el elemento de video.
            </video>
          )}
        </div>
      )}

      {/* 🎵 Audio Player */}
      {post.audio_url && (
        <div className="border-b border-gray-100 dark:border-gray-700">
          <EnhancedAudioPlayer
            audioUrl={post.audio_url}
            videoUrl={isVideo ? primaryMediaUrl : undefined}
            audioMetadata={post.audio_metadata}
            autoPlay={false}
            loop={false}
          />
        </div>
      )}

      {/* Footer - Interaction */}
      <div className="px-4 py-3">
        {/* Like, Comment, Share */}
        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
          <LikeButton 
            postId={post.id} 
            userId={user?.id} 
            className="flex-1 justify-start" 
          />
          <Button 
            variant="ghost" 
            className="flex items-center gap-1"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm">
              {commentCount > 0 ? commentCount : ''} Comentar
            </span>
            {showComments ? (
              <ChevronUp className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </Button>
          <Button variant="ghost" className="flex items-center gap-1">
            <Share2 className="h-5 w-5" />
            <span className="text-sm">Compartir</span>
          </Button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 space-y-3">
          <CommentList 
            postId={post.id} 
            className="max-h-60 overflow-y-auto"
          />
          {user && (
            <CommentForm 
              postId={post.id} 
              userId={user.id}
              onAddComment={async (content) => {
                // The CommentList will automatically update via the hook
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default PostCard;
