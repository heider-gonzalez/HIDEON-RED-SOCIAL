
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatTimeAgo } from "@/lib/utils";

interface FriendRequestItemProps {
  id: string;
  sender: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  created_at: string;
  mutual_friends?: {
    username: string;
    avatar_url: string | null;
  }[];
  onAccept: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
}

const EMPTY_MUTUAL_FRIENDS: FriendRequestItemProps['mutual_friends'] = [];

export function FriendRequestItem({ 
  id, 
  sender, 
  created_at, 
  mutual_friends = EMPTY_MUTUAL_FRIENDS, 
  onAccept, 
  onReject 
}: FriendRequestItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-start gap-3">
        <Link to={`/profile/${sender.id}`} className="shrink-0">
          <Avatar className="h-12 w-12">
            <AvatarImage src={sender.avatar_url || undefined} />
            <AvatarFallback>
              {sender.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex flex-col">
          <Link
            to={`/profile/${sender.id}`}
            className="font-medium line-clamp-1"
          >
            {sender.username || "Usuario"}
          </Link>
          
          {mutual_friends.length > 0 && (
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <div className="flex -space-x-2 mr-1">
                {mutual_friends.slice(0, 2).map((friend, index) => (
                  <Avatar key={index} className="h-4 w-4 border border-background">
                    <AvatarImage src={friend.avatar_url || undefined} />
                    <AvatarFallback>{friend.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {mutual_friends.length} {mutual_friends.length === 1 ? 'amigo' : 'amigos'} en común
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-2">
        <span className="text-xs text-muted-foreground">
          {formatTimeAgo(created_at)}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => onAccept(id)}
            className="px-3 py-1 h-8"
          >
            Confirmar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(id)}
            className="px-3 py-1 h-8"
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}
