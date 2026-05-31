import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUnifiedReactions } from '@/hooks/use-unified-reactions';

interface LikeButtonProps {
  postId: string;
  userId: string | undefined;
  className?: string;
}

export function LikeButton({ postId, userId, className = '' }: LikeButtonProps) {
  const { isReacting, userReaction, reactionCount, handleReaction } = useUnifiedReactions(postId);

  const isLiked = userReaction === 'love';
  const likeCount = reactionCount;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`flex items-center gap-1 group/like transition-all duration-200 ${className} focus-visible:ring-2 focus-visible:ring-primary/60 hover:bg-red-50 dark:hover:bg-red-900/20`}
      onClick={(e) => {
        e.stopPropagation();
        handleReaction('love' as any);
      }}
      disabled={isReacting || !userId}
      aria-label={isLiked ? 'Quitar me gusta' : 'Me gusta'}
    >
      <Heart
        className={`h-5 w-5 transition-all duration-200 group-hover/like:scale-110 group-active/like:scale-95 ${isLiked ? 'fill-red-500 text-red-500 drop-shadow-glow' : 'text-gray-500'}`}
        fill={isLiked ? 'currentColor' : 'none'}
      />
      {likeCount > 0 && (
        <span className={`text-sm font-medium transition-colors duration-200 ${isLiked ? 'text-red-500' : 'text-gray-500 group-hover/like:text-red-400'}`}>
          {likeCount}
        </span>
      )}
    </Button>
  );
}

export default LikeButton;
