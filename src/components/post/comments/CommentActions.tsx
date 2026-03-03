
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { reactionIcons, type ReactionType } from "@/components/post/reactions/ReactionIcons";

interface CommentActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  commentId: string;
  userReaction: ReactionType | null;
  reactionsCount: number;
  reactionsByType?: Record<string, number> | null;
  onReaction: (commentId: string, type: ReactionType) => void;
}

function getTopReactions(reactionsByType?: Record<string, number> | null) {
  if (!reactionsByType) return [] as Array<{ type: ReactionType; count: number }>;

  return (Object.entries(reactionsByType) as Array<[string, number]>)
    .filter(([, count]) => typeof count === "number" && count > 0)
    .map(([type, count]) => ({ type: type as ReactionType, count }))
    .filter((r) => r.type in reactionIcons)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

export function CommentActions({
  onEdit,
  onDelete,
  commentId,
  userReaction,
  reactionsCount,
  reactionsByType,
  onReaction,
}: CommentActionsProps) {
  const topReactions = getTopReactions(reactionsByType);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-accent rounded-full ml-1"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 bg-background"
            >
              <div className="px-2 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center -space-x-1">
                    {topReactions.length > 0 ? (
                      topReactions.map(({ type, count }) => (
                        <span
                          key={type}
                          className="text-sm leading-none"
                          title={`${reactionIcons[type].label}: ${count}`}
                        >
                          {reactionIcons[type].emoji}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm leading-none text-muted-foreground">{reactionIcons.love.emoji}</span>
                    )}
                  </div>

                  <span className="text-xs text-muted-foreground font-medium">{reactionsCount}</span>
                </div>

                <div className="mt-2 grid grid-cols-5 gap-1">
                  {(
                    [
                      "love",
                      "awesome",
                      "incredible",
                      "funny",
                      "surprised",
                    ] as ReactionType[]
                  ).map((type) => {
                    const isActive = userReaction === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
                          isActive ? "bg-muted" : "hover:bg-muted/60"
                        }`}
                        title={reactionIcons[type].label}
                        onClick={() => onReaction(commentId, type)}
                      >
                        <span className="text-base leading-none">{reactionIcons[type].emoji}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <DropdownMenuItem 
                className="cursor-pointer text-xs py-1"
                onClick={onEdit}
              >
                <Pencil className="h-3 w-3 mr-2" />
                <span>Editar</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer text-destructive focus:text-destructive text-xs py-1"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3 mr-2" />
                <span>Eliminar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent>
          <p>Opciones</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
