import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { useChatSystem } from "@/hooks/use-chat-system";

interface UserActionsProps {
  userId: string;
  username: string;
  avatarUrl: string | null;
}

export function UserActions({ userId, username, avatarUrl }: UserActionsProps) {
  const { openChat } = useChatSystem();
  
  return (
    <div className="flex gap-2 px-2">
      <Button
        variant="ghost"
        size="sm"
        className="flex-1 h-7 text-xs"
        onClick={() => openChat(userId, username, avatarUrl)}
      >
        Mensaje
      </Button>
      <Link
        to={`/profile/${userId}`}
        className="p-1.5 rounded-full hover:bg-muted/70 transition-colors"
        title="Ver perfil"
      >
        <Avatar className="h-6 w-6">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback>
            <User className="h-3 w-3" />
          </AvatarFallback>
        </Avatar>
      </Link>
    </div>
  );
}
