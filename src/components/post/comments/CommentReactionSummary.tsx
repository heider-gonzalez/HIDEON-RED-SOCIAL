import React, { useState } from "react";
import { reactionIcons, type ReactionType } from "@/components/post/reactions/ReactionIcons";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ReactionsListDialog } from "@/components/post/reactions/ReactionsListDialog";

interface CommentReactionSummaryProps {
  commentId: string;
  reactionsByType: Record<string, number>;
  totalCount: number;
  compact?: boolean;
}

export function CommentReactionSummary({ 
  commentId,
  reactionsByType, 
  totalCount, 
  compact = false 
}: CommentReactionSummaryProps) {
  const [open, setOpen] = useState(false);
  if (totalCount === 0) return null;

  // Obtener las reacciones ordenadas por cantidad
  const sortedReactions = Object.entries(reactionsByType)
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, compact ? 3 : 5); // Mostrar máximo 3 en modo compacto

  const hoverRows = (Object.entries(reactionsByType) as Array<[string, number]>)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => {
      const reaction = reactionIcons[type as ReactionType];
      if (!reaction) return null;
      return { type, emoji: reaction.emoji, label: reaction.label, count };
    })
    .filter(Boolean) as Array<{ type: string; emoji: string; label: string; count: number }>;

  if (sortedReactions.length === 0) return null;

  return (
    <>
      <HoverCard openDelay={120} closeDelay={120}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className={`flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'} hover:underline`}
            onClick={() => setOpen(true)}
          >
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
            <span className="text-muted-foreground font-medium">{totalCount}</span>
          </button>
        </HoverCardTrigger>

        {hoverRows.length > 0 && (
          <HoverCardContent className="w-52 p-2" align="end" sideOffset={8}>
            <div className="space-y-1">
              {hoverRows.map((row) => (
                <div key={row.type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{row.emoji}</span>
                    <span className="text-foreground">{row.label}</span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">{row.count}</span>
                </div>
              ))}
            </div>
          </HoverCardContent>
        )}
      </HoverCard>

      <ReactionsListDialog
        commentId={commentId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
