
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { forwardRef } from "react";

interface CommentActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

const DropdownMenuTriggerWithRef = forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ children, ...props }, ref) => (
    <Button 
      ref={ref}
      variant="ghost" 
      size="sm" 
      className="h-5 w-5 p-0 hover:bg-accent rounded-full ml-1"
      {...props}
    >
      {children}
    </Button>
  )
);

DropdownMenuTriggerWithRef.displayName = "DropdownMenuTriggerWithRef";

export function CommentActions({ onEdit, onDelete }: CommentActionsProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <DropdownMenuTriggerWithRef>
                <MoreVertical className="h-3 w-3" />
              </DropdownMenuTriggerWithRef>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-40 bg-background"
            >
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
