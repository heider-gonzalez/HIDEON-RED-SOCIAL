
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus } from "lucide-react";

interface Participant {
  id: string;
  username: string;
  avatar_url?: string | null;
}

interface ParticipantsListProps {
  participants: Participant[];
  onParticipantAdd?: () => void;
  showAddButton?: boolean;
  maxDisplay?: number;
}

const EMPTY_PARTICIPANTS: Participant[] = [];

export function ParticipantsList({
  participants = EMPTY_PARTICIPANTS,
  onParticipantAdd,
  showAddButton = false,
  maxDisplay = 10
}: ParticipantsListProps) {
  // Log for debugging
  console.log("Renderizando ParticipantsList con:", participants);
  
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // Determine if we need to show "+X more" badge
  const hasMore = participants.length > maxDisplay;
  const visibleParticipants = hasMore ? participants.slice(0, maxDisplay) : participants;
  const moreCount = participants.length - maxDisplay;
  
  return (
    <div className="flex items-center flex-wrap gap-2">
      {visibleParticipants.map((participant, index) => (
        <Avatar 
          key={participant.id}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          className="border-2 border-background cursor-pointer h-8 w-8"
        >
          <AvatarImage src={participant.avatar_url || undefined} />
          <AvatarFallback>
            {participant.username ? participant.username.charAt(0).toUpperCase() : 'U'}
          </AvatarFallback>
          {hoveredIndex === index && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {participant.username}
            </div>
          )}
        </Avatar>
      ))}
      
      {hasMore && (
        <Badge variant="secondary" className="h-8 rounded-full px-2">
          +{moreCount}
        </Badge>
      )}
      
      {showAddButton && (
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-full" 
          onClick={onParticipantAdd}
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
