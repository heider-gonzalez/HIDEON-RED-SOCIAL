
import { CommentsList } from "./comments/CommentsList";
import { CommentInput } from "./comments/CommentInput";
import type { Comment } from "@/types/post";
import type { ReactionType } from "@/types/database/social.types";
import { useAuth } from "@/providers/AuthProvider";
import { Link } from "react-router-dom";
import { Loader2, LogIn } from "lucide-react";

interface CommentsProps {
  postId: string;
  comments: Comment[];
  onReaction: (commentId: string, type: ReactionType) => void;
  onReply: (id: string, username: string) => void;
  onSubmitComment: () => void;
  onDeleteComment: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newContent: string) => void;
  newComment: string;
  onNewCommentChange: (value: string) => void;
  replyTo: { id: string; username: string } | null;
  onCancelReply: () => void;
  showComments: boolean;
  commentImage?: File | null;
  setCommentImage?: (file: File | null) => void;
  postAuthorId?: string;
  totalCommentsCount?: number;
  isSubmitting?: boolean;
  loadMoreRef?: React.RefObject<HTMLDivElement>;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

export function Comments({
  postId,
  comments,
  onReaction,
  onReply,
  onSubmitComment,
  onDeleteComment,
  onUpdateComment,
  newComment,
  onNewCommentChange,
  replyTo,
  onCancelReply,
  showComments,
  commentImage,
  setCommentImage,
  postAuthorId,
  totalCommentsCount,
  isSubmitting = false,
  loadMoreRef,
  hasNextPage = false,
  isFetchingNextPage = false
}: CommentsProps) {
  const { isAuthenticated } = useAuth();

  // Solo renderizamos los comentarios si showComments es true
  if (!showComments) return null;

  // Guest preview: show limited read-only comments + CTA
  if (!isAuthenticated) {
    const previewCount = 2;
    const previewComments = comments.slice(0, previewCount);
    const realCount = typeof totalCommentsCount === "number" ? totalCommentsCount : comments.length;

    return (
      <div className="mt-4 space-y-4 px-0 md:px-4">
        <div className="px-4 md:px-0">
          {previewComments.length > 0 ? (
            <CommentsList
              comments={previewComments}
              onReaction={onReaction}
              onReply={onReply}
              onDeleteComment={onDeleteComment}
              onUpdateComment={onUpdateComment}
              postAuthorId={postAuthorId}
              readOnly={true}
              hideReplies={true}
            />
          ) : (
            <div className="px-4 py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Inicia sesión para ser el primero en comentar
              </p>
            </div>
          )}
        </div>

        <div className="px-4 md:px-0">
          <div className="px-4 py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center justify-center text-center">
              <LogIn className="w-8 h-8 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Regístrate o inicia sesión para ver todos los comentarios y participar
              </p>
              <div className="flex items-center gap-2">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Iniciar sesión
                </Link>

                {realCount > previewCount && (
                  <Link to="/auth" className="text-sm text-muted-foreground hover:underline">
                    Ver todos ({realCount})
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4 px-0 md:px-4">
      <div className="px-4 md:px-0">
        <CommentsList 
          comments={comments}
          onReaction={onReaction}
          onReply={onReply}
          onDeleteComment={onDeleteComment}
          onUpdateComment={onUpdateComment}
          postAuthorId={postAuthorId}
        />

        {hasNextPage && (
          <div ref={loadMoreRef} className="py-4 flex items-center justify-center text-muted-foreground">
            {isFetchingNextPage ? (
              <span className="inline-flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando más comentarios...
              </span>
            ) : (
              <span className="text-sm">Desliza para cargar más</span>
            )}
          </div>
        )}
      </div>

      <div className="px-4 md:px-0">
        <CommentInput
          newComment={newComment}
          onNewCommentChange={onNewCommentChange}
          onSubmitComment={onSubmitComment}
          replyTo={replyTo}
          onCancelReply={onCancelReply}
          commentImage={commentImage}
          setCommentImage={setCommentImage}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
