// Archivo: src/components/reactions/ReactionMenu.tsx

import React from "react";
import { reactionIcons, type ReactionType } from "./ReactionIcons";
import { cn } from "@/lib/utils"; // Asegúrate de tener esta función de utilidad

interface ReactionMenuProps {
  show: boolean;
  activeReaction: ReactionType | null;
  setActiveReaction: (reaction: ReactionType | null) => void;
  onReactionSelected: (type: ReactionType) => void;
  onPointerLeave: () => void;
  compact?: boolean; // Nueva prop para versión compacta
}

export function ReactionMenu({
  show,
  activeReaction,
  setActiveReaction,
  onReactionSelected,
  onPointerLeave,
  compact = false, // Valor por defecto
}: ReactionMenuProps) {
  if (!show) return null;

  const reactionTypes: ReactionType[] = ["love", "awesome", "incredible", "funny", "surprised"];

  return (
    <div
      className={cn(
        "flex items-center gap-1.5",
        "bg-white dark:bg-gray-900 border border-border rounded-2xl",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
        "shadow-xl transition-all duration-200",
        "flex-nowrap min-w-max",
        show ? "opacity-100 scale-100" : "opacity-0 scale-95",
      )}
      onPointerLeave={onPointerLeave}
    >
      {reactionTypes.map((type) => {
        const reaction = reactionIcons[type];
        const isActive = activeReaction === type;
        return (
          <button
            key={type}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-lg transition-all duration-150",
              compact ? "p-1" : "p-1.5",
              "hover:bg-muted/50 flex-shrink-0",
              isActive && "bg-muted",
            )}
            onClick={() => onReactionSelected(type)}
            onPointerEnter={() => setActiveReaction(type)}
            onPointerLeave={() => setActiveReaction(null)}
          >
            <span
              className={cn(
                "leading-none block transition-transform duration-150",
                compact ? "text-lg" : "text-2xl",
                // ESCALA DEL EMOJI al hacer hover o al estar activo.
                (isActive || activeReaction === type) && "scale-125",
              )}
            >
              {reaction.emoji}
            </span>

            {compact ? (
              <span className="text-[8px] font-medium text-muted-foreground whitespace-nowrap">
                {reaction.label.length > 8 ? reaction.label.substring(0, 6) + '...' : reaction.label}
              </span>
            ) : (
              <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap">{reaction.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}