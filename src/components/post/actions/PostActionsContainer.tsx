import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionsSummary } from "./ActionsSummary";
import { ActionsButtons } from "./ActionsButtons";
import { ReactionType } from "@/types/database/social.types";
import { useIsMobile } from "@/hooks/use-mobile";
import { normalizeReactionType, reactionIcons } from "../reactions/ReactionIcons";

interface PostActionsContainerProps {
  postId: string;
  reactions: any[];
  commentsCount: number;
  userReaction: string | null | ReactionType;
  onReaction: (postId: string, type: ReactionType) => void;
  onComment: () => void;
  onShare?: () => void;
  compact?: boolean;
}

export function PostActionsContainer({
  postId,
  reactions,
  commentsCount,
  userReaction,
  onReaction,
  onComment,
  onShare,
  compact = false
}: PostActionsContainerProps) {
  const [showReactions, setShowReactions] = useState(false);
  const isMobile = useIsMobile();

  // Process reactions to get total count and counts by type
  const reactionSummary = processReactions(reactions);
  
  // Handle reaction type validation
  const handleReaction = (id: string, type: ReactionType) => {
    // Get all valid reaction types from reactionIcons
    const validReactionTypes = Object.keys(reactionIcons) as ReactionType[];
    
    // Make sure the type is valid before passing it to onReaction
    if (validReactionTypes.includes(type)) {
      onReaction(id, type);
    } else {
      // Default to "love" if an invalid type is provided
      onReaction(id, "love");
    }
  };

  return (
    <div className={`post-actions w-full`}>
      {/* Summary of reactions and comments */}
      <ActionsSummary 
        reactionsCount={reactionSummary.totalCount} 
        commentsCount={commentsCount}
        reactionsByType={reactionSummary.byType}
        compact={compact}
        postId={postId}
      />
      
      {/* Action buttons */}
      <ActionsButtons
        postId={postId}
        userReaction={userReaction as ReactionType}
        onReaction={handleReaction}
        onComment={onComment}
        onShare={onShare}
        compact={compact}
      />
    </div>
  );
}

// Helper function to process reactions
function processReactions(reactions: any[] | { count: number; by_type: Record<string, number> }) {
  let totalCount = 0;
  const byType: Record<string, number> = {};
  
  if (Array.isArray(reactions)) {
    totalCount = reactions.length;
    
    // Count reactions by type
    reactions.forEach(reaction => {
      const rawType = reaction.reaction_type || reaction.type || 'love';
      const type = normalizeReactionType(rawType);
      byType[type] = (byType[type] || 0) + 1;
    });
  } else if (reactions && typeof reactions === 'object') {
    // Handle case where reactions is already summarized
    if ('count' in reactions) {
      totalCount = reactions.count || 0;
    }
    if ('by_type' in reactions && typeof reactions.by_type === 'object') {
      Object.entries(reactions.by_type).forEach(([rawType, count]) => {
        const type = normalizeReactionType(rawType);
        byType[type] = (byType[type] || 0) + (Number(count) || 0);
      });
    }
  }
  
  return {
    totalCount,
    byType
  };
}
