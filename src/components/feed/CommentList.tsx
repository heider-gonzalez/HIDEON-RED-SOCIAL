import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { usePostComments } from '@/hooks/usePostComments';
import { Loader2, MessageSquare } from 'lucide-react';

interface CommentListProps {
  postId: string;
  className?: string;
}

export function CommentList({ postId, className = '' }: CommentListProps) {
  const { comments, isLoading, error } = usePostComments(postId);

  if (isLoading) {
    return (
      <div className={`flex justify-center py-4 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-4 text-sm text-red-500 ${className}`}>
        {error}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className={`text-center py-4 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        <div className="flex flex-col items-center justify-center space-y-2">
          <MessageSquare className="h-5 w-5 text-gray-400" />
          <p>No hay comentarios aún. ¡Sé el primero en comentar!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Avatar className="h-8 w-8 mt-1">
            {comment.profiles.avatar_url ? (
              <AvatarImage src={comment.profiles.avatar_url} alt={comment.profiles.username} />
            ) : (
              <AvatarFallback>
                {comment.profiles.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-900 dark:text-white [.tech_&]:text-white">
                  @{comment.profiles.username}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(comment.created_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                {comment.content}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CommentList;
