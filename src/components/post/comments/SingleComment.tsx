
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { CommentHeader } from "./CommentHeader";
import { CommentContent } from "./CommentContent";
import { CommentFooter } from "./CommentFooter";
import { CommentReactionSummary } from "./CommentReactionSummary";
import { ReportCommentDialog } from "./ReportCommentDialog";
import { CommentActions } from "./CommentActions";
import { EditCommentDialog } from "./EditCommentDialog";
import type { Comment } from "@/types/post";
import type { ReactionType } from "@/types/database/social.types";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { normalizeReactionType, type ReactionType as UiReactionType } from "@/components/post/reactions/ReactionIcons";
import { useAuth } from "@/providers/AuthProvider";
import { useUserRoles } from "@/hooks/use-user-roles";

interface SingleCommentProps {
  comment: Comment;
  onReaction: (commentId: string, type: ReactionType) => void;
  onReply: (id: string, username: string) => void;
  onDeleteComment: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newContent: string) => Promise<void>;
  onLoadReplies?: (parentCommentId: string) => Promise<void>;
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
  onUpdateComment,
  onLoadReplies,
  isReply = false,
  
  postAuthorId,
  readOnly = false,
  hideReplies = false
}: SingleCommentProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [repliesCollapsed, setRepliesCollapsed] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: roles } = useUserRoles();

  const isCommentAuthor = Boolean(user?.id) && comment.user_id === user!.id;
  const canDeleteComment = isCommentAuthor || Boolean(roles?.isModeratorOrAdmin);
  const canEditComment = isCommentAuthor;

  const menuUserReaction: UiReactionType | null = comment.user_reaction
    ? normalizeReactionType(comment.user_reaction)
    : null;
  const handleReply = useCallback(() => {
    const username = comment.profiles?.username || "usuario";
    onReply(comment.id, username);
  }, [comment, onReply]);

  const handleDelete = useCallback(() => {
    onDeleteComment(comment.id);
  }, [comment.id, onDeleteComment]);

  const handleEdit = useCallback(() => {
    setEditDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async (newContent: string) => {
    try {
      if (!onUpdateComment) {
        throw new Error("Missing onUpdateComment handler");
      }

      await onUpdateComment(comment.id, newContent);
      toast({
        title: "Comentario actualizado",
        description: "Tu comentario ha sido actualizado exitosamente."
      });
    } catch (error) {
      console.error("Error updating comment:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el comentario. Intenta nuevamente.",
        variant: "destructive"
      });
    }
  }, [comment.id, onUpdateComment, toast]);

  const reactionSummary = comment.reactions_by_type && Object.keys(comment.reactions_by_type).length > 0 ? (
    <div className="rounded-full border border-border bg-background/90 px-2 py-0.5 shadow-sm">
      <CommentReactionSummary
        reactionsByType={comment.reactions_by_type}
        totalCount={comment.likes_count || 0}
        compact={true}
      />
    </div>
  ) : null;

  const hasLoadedReplies = Array.isArray(comment.replies) && comment.replies.length > 0;
  const canLoadReplies = !readOnly && !hideReplies && (comment.replies_count || 0) > 0 && !hasLoadedReplies;
  const canToggleReplies = !readOnly && !hideReplies && hasLoadedReplies;

  const handleLoadReplies = useCallback(async () => {
    if (!onLoadReplies) return;
    await onLoadReplies(comment.id);
  }, [comment.id, onLoadReplies]);

  return (
    <div
      id={`comment-${comment.id}`}
      className={`relative flex flex-col gap-1 ${isReply ? "ml-8" : ""}`}
    >
      {isReply && (
        <>
          <div className="absolute -left-3 top-4 h-px w-3 bg-border" />
        </>
      )}
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
              commentId={comment.id}
              userReaction={menuUserReaction}
              reactionsCount={comment.likes_count || 0}
              reactionsByType={comment.reactions_by_type || null}
              onReaction={(id, type) => onReaction(id, type as unknown as ReactionType)}
              canDelete={canDeleteComment}
              canEdit={canEditComment}
            />
          )}
        </div>

        {canLoadReplies && (
          <div className="mt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent"
              onClick={handleLoadReplies}
            >
              Ver respuestas ({comment.replies_count})
            </Button>
          </div>
        )}

        {canToggleReplies && (
          <div className="mt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent"
              onClick={() => setRepliesCollapsed((v) => !v)}
            >
              {repliesCollapsed ? `Ver respuestas (${comment.replies?.length ?? comment.replies_count ?? 0})` : 'Ver menos'}
            </Button>
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && !hideReplies && !repliesCollapsed && (
          <div className="relative mt-2">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-2">
              {comment.replies.map((reply, index) => {
                const isLast = index === comment.replies!.length - 1;
                return (
                  <div key={reply.id} className="relative">
                    {isLast && (
                      <div className="absolute left-5 top-4 bottom-0 w-px bg-background" />
                    )}
                    <SingleComment
                      comment={reply}
                      onReaction={onReaction}
                      onReply={onReply}
                      onDeleteComment={onDeleteComment}
                      onUpdateComment={onUpdateComment}
                      onLoadReplies={onLoadReplies}
                      isReply={true}
                      postAuthorId={postAuthorId}
                      readOnly={readOnly}
                      hideReplies={hideReplies}
                    />
                  </div>
                );
              })}
            </div>
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
      
      {/* Edit Comment Dialog */}
      <EditCommentDialog
        commentId={comment.id}
        isOpen={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveEdit}
        initialContent={comment.content}
        authorProfile={comment.profiles}
      />
    </div>
  );
}
