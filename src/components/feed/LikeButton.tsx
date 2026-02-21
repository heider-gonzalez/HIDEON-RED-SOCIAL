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
      className={`flex items-center gap-1 ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        handleReaction('love' as any);
      }}
      disabled={isReacting || !userId}
      aria-label={isLiked ? 'Quitar me gusta' : 'Me gusta'}
    >
      <Heart
        className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-500'}`}
        fill={isLiked ? 'currentColor' : 'none'}
      />
      {likeCount > 0 && (
        <span className={`text-sm ${isLiked ? 'text-red-500' : 'text-gray-500'}`}>
          {likeCount}
        </span>
      )}
    </Button>
  );
}

export default LikeButton;
