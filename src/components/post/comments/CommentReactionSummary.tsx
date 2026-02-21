import React from "react";
import { reactionIcons, type ReactionType } from "@/components/post/reactions/ReactionIcons";

interface CommentReactionSummaryProps {
  reactionsByType: Record<string, number>;
  totalCount: number;
  compact?: boolean;
}

export function CommentReactionSummary({ 
  reactionsByType, 
  totalCount, 
  compact = false 
}: CommentReactionSummaryProps) {
  if (totalCount === 0) return null;

  // Obtener las reacciones ordenadas por cantidad
  const sortedReactions = Object.entries(reactionsByType)
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, compact ? 3 : 5); // Mostrar máximo 3 en modo compacto

  if (sortedReactions.length === 0) return null;

  return (
    <div className={`flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* Emojis de reacciones */}
      <div className="flex items-center -space-x-1">
        {sortedReactions.map(([type, count]) => {
          const reaction = reactionIcons[type as ReactionType];
          return (
            <span
              key={type}
              className={`inline-block ${compact ? 'text-xs' : 'text-sm'} leading-none`}
              title={`${reaction.label}: ${count}`}
            >
              {reaction.emoji}
            </span>
          );
        })}
      </div>
      
      {/* Contador total */}
      <span className="text-muted-foreground font-medium">
        {totalCount}
      </span>
    </div>
  );
}
