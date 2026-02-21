import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { CommentReactionsEnhanced } from "./CommentReactionsEnhanced";
import { ReactionType } from "@/types/database/social.types";
import { Link } from "react-router-dom";

interface CommentFooterProps {
  commentId: string;
  userReaction: ReactionType | null | string;
  reactionsCount: number;
  onReaction: (commentId: string, type: ReactionType) => void;
  onReply: () => void;
  readOnly?: boolean;
}

export function CommentFooter({ 
  commentId, 
  userReaction, 
  reactionsCount, 
  onReaction, 
  onReply,
  readOnly = false
}: CommentFooterProps) {
  // Convert string to ReactionType if needed and ensure it's a valid ReactionType
  let safeUserReaction = userReaction as ReactionType | null;
  
  // Validate that userReaction is a valid ReactionType
  const validReactionTypes: ReactionType[] = ["love", "awesome", "incredible", "funny", "surprised"];
  
  if (userReaction && !validReactionTypes.includes(userReaction as ReactionType)) {
    safeUserReaction = null;
  }

  if (readOnly) {
    return (
      <div className="flex items-center gap-3 mt-0.5">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Me gusta</span>
          <span>{reactionsCount}</span>
        </div>
        <Link to="/auth" className="text-xs text-muted-foreground hover:underline">
          Inicia sesión para reaccionar o responder
        </Link>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-3 mt-0.5">
      <CommentReactionsEnhanced
        commentId={commentId}
        userReaction={safeUserReaction}
        reactionsCount={reactionsCount}
        onReaction={onReaction}
        readOnly={readOnly}
      />
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 text-xs flex items-center gap-1"
        onClick={onReply}
      >
        <MessageSquare className="h-3 w-3" />
        Responder
      </Button>
    </div>
  );
}
