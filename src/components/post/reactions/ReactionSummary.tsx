import React, { useState } from "react";
import { normalizeReactionType, reactionIcons } from "./ReactionIcons";
import { ReactionsListDialog } from "./ReactionsListDialog";

interface ReactionSummaryProps {
  reactions: Record<string, number>;
  postId: string;
}

export function ReactionSummary({ reactions, postId }: ReactionSummaryProps) {
  const [showDialog, setShowDialog] = useState(false);
  
  // Obtener el conteo total
  const totalCount = Object.values(reactions).reduce((sum, count) => sum + count, 0);
  
  if (totalCount === 0) {
    return null;
  }

  // Ordenar las reacciones por conteo (las más populares primero)
  const sortedReactions = Object.entries(reactions)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  // Obtener los emojis de las reacciones más populares (máximo 5)
  const topReactionEmojis = sortedReactions.slice(0, 5).map(([type]) => {
    const normalizedType = normalizeReactionType(type);
    const reaction = reactionIcons[normalizedType];
    return reaction?.emoji || "❤️";
  });

  return (
    <>
      {/* LinkedIn style: reaction emojis with total count */}
      <button 
        className="flex items-center gap-1.5 cursor-pointer hover:underline transition-all group"
        onClick={() => setShowDialog(true)}
      >
        {/* Emoji badges overlapping */}
        <div className="flex items-center -space-x-1">
          {topReactionEmojis.map((emoji, idx) => (
            <div 
              key={idx} 
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-card border-2 border-background text-sm transition-transform group-hover:scale-110"
              style={{ zIndex: topReactionEmojis.length - idx }}
            >
              {emoji}
            </div>
          ))}
        </div>
        
        {/* Total count - LinkedIn blue on hover */}
        <span className="text-sm text-muted-foreground group-hover:text-primary font-medium transition-colors">
          {totalCount}
        </span>
      </button>
      
      <ReactionsListDialog
        postId={postId}
        open={showDialog}
        onOpenChange={setShowDialog}
      />
    </>
  );
}
