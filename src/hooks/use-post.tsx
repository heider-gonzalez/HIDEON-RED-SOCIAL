
import { Post } from "@/types/post";
import { useCommentMutations } from "./use-comment-mutations";
import { ReactionType } from "@/types/database/social.types";
import {
  usePostState,
  usePostAuthor,
  usePostComments,
  usePostReactions,
  usePostActions,
  useCommentSubmit
} from "./posts";

export function usePost(post: Post, hideComments = false, initialShowComments = false) {
  // Core state and functions
  const {
    showComments,
    newComment,
    commentImage,
    replyTo,
    isCurrentUserAuthor,
    setIsCurrentUserAuthor,
    canDeletePost,
    setCanDeletePost,
    setNewComment,
    setCommentImage,
    setReplyTo,
    toggleComments,
    handleCancelReply
  } = usePostState(post, hideComments, initialShowComments);
  
  // Check if current user is post author
  // Use either user_id or author_id
  usePostAuthor(
    post.user_id || post.author_id,
    (post as any)?.company_id,
    setIsCurrentUserAuthor,
    setCanDeletePost
  );
  
  // Comments functionality
  const {
    comments,
    handleCommentReaction,
    handleReply,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage
  } = usePostComments(post.id, showComments, setReplyTo, setNewComment);
  
  // Post reactions
  const { onReaction } = usePostReactions(post.id);
  
  // Post actions (delete)
  const { onDeletePost } = usePostActions(post.id);
  
  // Comment submission
  const { handleSubmitComment: submitComment, isSubmitting } = useCommentSubmit(
    post.id,
    setNewComment,
    setCommentImage,
    setReplyTo
  );
  
  // Delete comment functionality
  const { deleteComment } = useCommentMutations(post.id);
  
  // Wrapper function to provide the necessary parameters to submitComment
  const handleSubmitComment = () => {
    submitComment(newComment, commentImage, replyTo);
  };
  
  return {
    showComments,
    comments,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
    newComment,
    commentImage,
    setCommentImage,
    replyTo,
    isCurrentUserAuthor,
    canDeletePost,
    onDeletePost,
    onReaction,
    toggleComments,
    handleCommentReaction,
    handleReply,
    handleSubmitComment,
    handleCancelReply,
    handleDeleteComment: deleteComment,
    setNewComment,
    isSubmitting
  };
}
