import { useQuery } from "@tanstack/react-query";
import { fetchPostComments } from "@/lib/api/posts/queries";
import { ReactionType } from "@/types/database/social.types";
import { Comment } from "@/types/post";
import { normalizeReactionType } from "@/components/post/reactions/ReactionIcons";
import { useReactionMutations } from "@/hooks/post-mutations/use-reaction-mutations";

// Helper function to ensure reaction_type is a valid ReactionType
function normalizeReactions(comments: any[]): Comment[] {
  return comments.map(comment => {
    // Process reactions to ensure they conform to ReactionType
    const normalizedReactions = comment.reactions?.map((reaction: any) => ({
      ...reaction,
      // Ensure reaction_type is a valid ReactionType
      reaction_type: normalizeReactionType(reaction.reaction_type)
    })) || [];
    
    // Process any replies recursively
    const normalizedReplies = comment.replies ? normalizeReactions(comment.replies) : [];
    
    return {
      ...comment,
      reactions: normalizedReactions,
      replies: normalizedReplies,
      // Ensure user_reaction is also normalized if present
      user_reaction: comment.user_reaction ? normalizeReactionType(comment.user_reaction) : null
    };
  });
}

/**
 * Hook for managing post comments functionality
 */
export function usePostComments(
  postId: string, 
  showComments: boolean, 
  setReplyTo: (value: { id: string; username: string } | null) => void,
  setNewComment: (value: string) => void
) {
  const { toggleCommentReaction } = useReactionMutations(postId);

  const { data: rawComments = [] } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => fetchPostComments(postId),
    enabled: showComments
  });
  
  // Normalize the comments to ensure they match the expected type
  const comments = normalizeReactions(rawComments);
  
  const handleCommentReaction = (commentId: string, type: ReactionType) => {
    toggleCommentReaction({ commentId, type });
  };
  
  const handleReply = (id: string, username: string) => {
    setReplyTo({ id, username });
    setNewComment(`@${username} `);
  };
  
  return {
    comments,
    handleCommentReaction,
    handleReply
  };
}
