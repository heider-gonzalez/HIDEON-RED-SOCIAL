
import { useCallback } from "react";
import { CommentHeader } from "./CommentHeader";
import { CommentContent } from "./CommentContent";
import { CommentFooter } from "./CommentFooter";
import { CommentReactionSummary } from "./CommentReactionSummary";
import { ReportCommentDialog } from "./ReportCommentDialog";
import { CommentActions } from "./CommentActions";
import type { Comment } from "@/types/post";
import type { ReactionType } from "@/types/database/social.types";
import { Link } from "react-router-dom";

interface SingleCommentProps {
  comment: Comment;
  onReaction: (commentId: string, type: ReactionType) => void;
  onReply: (id: string, username: string) => void;
  onDeleteComment: (commentId: string) => void;
  isReply?: boolean;
  postAuthorId?: string;
  readOnly?: boolean;
  hideReplies?: boolean;
}

export function SingleComment({
  comment,
  onReaction,
  onReply,
  onDeleteComment,
  isReply = false,
  postAuthorId,
  readOnly = false,
  hideReplies = false
}: SingleCommentProps) {
  const handleReply = useCallback(() => {
    const username = comment.profiles?.username || "usuario";
    onReply(comment.id, username);
  }, [comment, onReply]);

  const handleDelete = useCallback(() => {
    onDeleteComment(comment.id);
  }, [comment.id, onDeleteComment]);

  const handleEdit = useCallback(() => {
    // This is a placeholder for future edit functionality
    console.log("Edit comment:", comment.id);
  }, [comment.id]);

  const reactionSummary = comment.reactions_by_type && Object.keys(comment.reactions_by_type).length > 0 ? (
    <div className="rounded-full border border-border bg-background/90 px-2 py-0.5 shadow-sm">
      <CommentReactionSummary
        reactionsByType={comment.reactions_by_type}
        totalCount={comment.likes_count || 0}
        compact={true}
      />
    </div>
  ) : null;

  return (
    <div
      id={`comment-${comment.id}`}
      className={`relative flex flex-col gap-1 ${isReply ? "ml-8" : ""}`}
    >
      {isReply && <div className="absolute -left-3 top-4 h-px w-3 bg-border" />}
      {/* Header with avatar and author */}
      <CommentHeader
        userId={comment.user_id}
        profileData={comment.profiles}
        timestamp={comment.created_at}
        isReply={isReply}
        postAuthorId={postAuthorId}
      />
      
      {/* Comment content */}
      <div className="space-y-1 ml-10">
        <CommentContent 
          content={comment.content} 
          media={comment.media_url} 
          mediaType={comment.media_type}
          reactionSummary={reactionSummary}
        />
        
        <div className="flex items-center gap-2 mt-1">
          <CommentFooter
            commentId={comment.id}
            userReaction={comment.user_reaction}
            reactionsCount={comment.likes_count || 0}
            onReaction={onReaction}
            onReply={handleReply}
            readOnly={readOnly}
          />
          
          {!readOnly && <ReportCommentDialog comment={comment} />}

          {!readOnly && (
            <CommentActions 
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          )}
        </div>

        {comment.replies && comment.replies.length > 0 && !hideReplies && (
          <div className="relative mt-2 space-y-2">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            {comment.replies.map((reply) => (
              <SingleComment
                key={reply.id}
                comment={reply}
                onReaction={onReaction}
                onReply={onReply}
                onDeleteComment={onDeleteComment}
                isReply={true}
                postAuthorId={postAuthorId}
                readOnly={readOnly}
                hideReplies={hideReplies}
              />
            ))}
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && hideReplies && (
          <div className="mt-2">
            <Link
              to="/auth"
              className="text-xs text-muted-foreground hover:underline"
            >
              Inicia sesión para ver respuestas ({comment.replies.length})
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
