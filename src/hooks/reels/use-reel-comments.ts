
import { useState } from "react";
import { usePostComments } from "@/hooks/posts/use-post-comments";
import { useCommentMutations } from "@/hooks/use-comment-mutations";
import { useToast } from "@/hooks/use-toast";
import { ReactionType } from "@/types/database/social.types";

/**
 * Custom hook for handling reel comments functionality
 */
export function useReelComments(postId: string) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [showComments, setShowComments] = useState(false);
  const { toast } = useToast();
  
  // Get comments and related handlers
  const { 
    comments, 
    handleCommentReaction, 
    handleReply,
    loadReplies,
  } = usePostComments(postId, showComments, setReplyTo, setNewComment);
  
  // Get mutations for comments
  const { submitComment, deleteComment } = useCommentMutations(postId);
  
  // Handle submitting a comment
  const handleSubmitComment = () => {
    if (!newComment.trim() && !commentImage) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El comentario no puede estar vacío",
      });
      return;
    }
    
    submitComment({ 
      content: newComment, 
      replyToId: replyTo?.id,
      image: commentImage 
    });
    
    setNewComment("");
    setCommentImage(null);
    setReplyTo(null);
  };
  
  // Handle reaction to a comment
  const handleCommentLike = (commentId: string, type: ReactionType) => {
    handleCommentReaction(commentId, type);
  };
  
  // Handle deleting a comment
  const handleDeleteComment = (commentId: string) => {
    deleteComment(commentId);
  };
  
  // Handle cancelling a reply
  const handleCancelReply = () => {
    setReplyTo(null);
    setNewComment("");
  };
  
  return {
    comments,
    newComment,
    setNewComment,
    replyTo,
    commentImage,
    setCommentImage,
    showComments,
    setShowComments,
    handleSubmitComment,
    handleCommentLike,
    handleReply,
    loadReplies,
    handleDeleteComment,
    handleCancelReply
  };
}
