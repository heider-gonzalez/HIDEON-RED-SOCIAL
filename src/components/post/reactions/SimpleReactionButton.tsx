import { Button } from "@/components/ui/button";
import { SimpleReactionType } from "@/types/database/reaction.types";
import { cn } from "@/lib/utils";
import { reactionIcons, type ReactionType } from "./ReactionIcons";

interface SimpleReactionButtonProps {
  postId: string;
  userReaction: SimpleReactionType | null;
  reactions: Record<string, number>;
  onReactionClick: (type: SimpleReactionType) => void;
}

const reactionTypes: ReactionType[] = ["love", "awesome", "incredible", "funny", "surprised"];

export function SimpleReactionButton({
  postId,
  userReaction,
  reactions,
  onReactionClick,
}: SimpleReactionButtonProps) {
  
  const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);
  
  const currentReactionType = (userReaction || "love") as ReactionType;
  const currentReaction = reactionIcons[currentReactionType];
  const CurrentIcon = currentReaction.icon;
  const currentColor = userReaction ? currentReaction.color : "";

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onReactionClick((userReaction || 'love') as SimpleReactionType)}
        className={cn(
          "gap-2 hover:bg-accent",
          userReaction && currentColor
        )}
      >
        <CurrentIcon className={cn("h-5 w-5", currentColor)} />
        {totalReactions > 0 && (
          <span className="text-sm font-medium">{totalReactions}</span>
        )}
      </Button>

      {/* Quick reaction options on hover */}
      <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {reactionTypes.map((type) => {
          const { icon: Icon, label, color } = reactionIcons[type];
          return (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              onClick={() => onReactionClick(type as SimpleReactionType)}
              className={cn("h-8 w-8 p-0", userReaction === type && color)}
              title={label}
            >
              <Icon className={cn("h-4 w-4", userReaction === type && color)} />
            </Button>
          );
        })}
      </div>
    </div>
  );
}
