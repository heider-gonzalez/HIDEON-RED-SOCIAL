import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users } from "lucide-react";
import { useIdeaParticipants } from "@/hooks/ideas/use-idea-participants";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

interface IdeaParticipantsProps {
  postId: string;
  showList?: boolean;
}

export function IdeaParticipants({ postId, showList = false }: IdeaParticipantsProps) {
  const { data: participants, isLoading } = useIdeaParticipants(postId, 'approved');
  const navigate = useNavigate();
  const { user } = useAuth();

  const approvedParticipants = participants || [];
  const currentUserIsParticipant = approvedParticipants.some(p => p.user_id === user?.id);

  if (isLoading) {
    return null;
  }

  if (approvedParticipants.length === 0) return null;

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{approvedParticipants.length} {approvedParticipants.length === 1 ? 'Participante' : 'Participantes'}</span>
        </div>
        
        {currentUserIsParticipant && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => navigate(`/messages?idea=${postId}`)}
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Ir al chat
          </Button>
        )}
      </div>

      {showList && approvedParticipants.length > 0 && (
        <div className="mt-3 flex -space-x-2 overflow-hidden">
          {approvedParticipants.slice(0, 5).map((participant) => (
            <Avatar key={participant.user_id} className="h-8 w-8 border-2 border-background">
              <AvatarImage src={participant.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {participant.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          ))}
          {approvedParticipants.length > 5 && (
            <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">
              +{approvedParticipants.length - 5}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
