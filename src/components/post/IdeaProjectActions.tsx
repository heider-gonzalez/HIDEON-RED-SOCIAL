import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Rocket, CheckCircle2, ChevronDown } from "lucide-react";
import { useConvertIdea } from "@/hooks/use-convert-idea";
import { JoinIdeaButton } from "@/components/post/actions/join-idea/JoinIdeaButton";
import type { Post } from "@/types/post";

interface IdeaProjectActionsProps {
  post: Post;
  isAuthor: boolean;
}

export function IdeaProjectActions({ post, isAuthor }: IdeaProjectActionsProps) {
  const { convertIdeaToProject, isConverting } = useConvertIdea();
  const [showActions, setShowActions] = useState(false);

  // Only show for idea posts
  if (post.post_type !== 'idea') return null;

  const currentStatus = post.project_status || 'idea';

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'idea':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            💡 Idea
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            🚀 En Desarrollo
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            ✅ Completado
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleConvert = async (newStatus: 'in_progress' | 'completed') => {
    const success = await convertIdeaToProject(post.id, newStatus);
    if (success) {
      setShowActions(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 px-4 pb-3">
      {!isAuthor && (
        <JoinIdeaButton 
          postId={post.id} 
          variant="default" 
          size="lg"
          className="bg-[#0095f6] hover:bg-[#0081d9] text-white font-semibold"
        />
      )}
      
      {isAuthor && currentStatus !== 'completed' && (
        <DropdownMenu open={showActions} onOpenChange={setShowActions}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isConverting}
              className="w-full"
            >
              {isConverting ? (
                "Actualizando..."
              ) : (
                <>
                  Cambiar Estado
                  <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-full">
            {currentStatus === 'idea' && (
              <DropdownMenuItem
                onClick={() => handleConvert('in_progress')}
                className="cursor-pointer"
              >
                <Rocket className="mr-2 h-4 w-4" />
                Marcar como En Desarrollo
              </DropdownMenuItem>
            )}
            {(currentStatus === 'idea' || currentStatus === 'in_progress') && (
              <DropdownMenuItem
                onClick={() => handleConvert('completed')}
                className="cursor-pointer"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Marcar como Completado
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
