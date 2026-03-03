
import { SingleComment } from "./SingleComment";
import type { Comment } from "@/types/post";
import type { ReactionType } from "@/types/database/social.types";

interface CommentsListProps {
  comments: Comment[];
  onReaction: (commentId: string, type: ReactionType) => void;
  onReply: (id: string, username: string) => void;
  onDeleteComment: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newContent: string) => void;
  postAuthorId?: string;
  readOnly?: boolean;
  hideReplies?: boolean;
}

export function CommentsList({
  comments,
  onReaction,
  onReply,
  onDeleteComment,
  onUpdateComment,
  postAuthorId,
  readOnly = false,
  hideReplies = false
}: CommentsListProps) {
  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        No hay comentarios. ¡Sé el primero en comentar!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <SingleComment
          key={comment.id}
          comment={comment}
          onReaction={onReaction}
          onReply={onReply}
          onDeleteComment={onDeleteComment}
          onUpdateComment={onUpdateComment}
          postAuthorId={postAuthorId}
          readOnly={readOnly}
          hideReplies={hideReplies}
        />
      ))}
    </div>
  );
}
