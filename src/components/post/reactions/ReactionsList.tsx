import React from "react";
import { normalizeReactionType, reactionIcons, type ReactionType } from "./ReactionIcons";

interface ReactionsListProps {
  reactions: Record<string, number>;
  className?: string;
  showCounts?: boolean;
  maxVisible?: number;
}

export function ReactionsList({ 
  reactions, 
  className = "", 
  showCounts = true, 
  maxVisible = 5 
}: ReactionsListProps) {
  const sortedReactions = Object.entries(reactions)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxVisible);

  if (sortedReactions.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {sortedReactions.map(([type, count]) => {
        const normalizedType = normalizeReactionType(type);
        const reaction = reactionIcons[normalizedType];
        if (!reaction) return null;

        const { icon: Icon, color, label, emoji } = reaction;

        return (
          <div
            key={normalizedType}
            className="flex items-center gap-1 bg-muted/50 rounded-full px-2 py-1 text-xs"
            title={`${count} ${label}`}
          >
            <div className="flex items-center justify-center">
              {emoji ? (
                <span className="text-sm">{emoji}</span>
              ) : (
                <Icon className={`h-3 w-3 ${color}`} />
              )}
            </div>
            {showCounts && (
              <span className="text-muted-foreground font-medium">{count}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}