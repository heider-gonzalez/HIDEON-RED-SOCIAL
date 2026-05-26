
import { useState, useEffect, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Friend {
  id: string;
  username: string;
  avatar_url: string | null;
}

export function FriendsList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadFriends();

    // Suscribirse a cambios en la tabla de friendships
    const friendshipsChannel = supabase
      .channel('friendships-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'friendships' 
      }, () => {
        console.log("Friendships table changed, reloading friends");
        loadFriends();
      })
      .subscribe();

    // Suscribirse a cambios en la tabla de messages
    const messagesChannel = supabase
      .channel('messages-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, () => {
        console.log("New message detected, refreshing friends list");
        loadFriends();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(friendshipsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  const loadFriends = async () => {
    try {
      // Get the current user
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData.session?.user.id;
      
      if (!currentUserId) {
        setLoading(false);
        return;
      }
      
      console.log("Loading friends for user:", currentUserId);
      
      let allFriends: Friend[] = [];
      
      // Use simpler approach to get friends
      const { data: friendsData, error: friendsError } = await (supabase as any)
        .from('friendships')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
        .eq('status', 'accepted');
        
      if (friendsError) throw friendsError;
      
      if (friendsData && Array.isArray(friendsData)) {
        // Get unique friend IDs
        const friendIds = new Set<string>();
        friendsData.forEach((f: any) => {
          if (f.user_id === currentUserId) {
            friendIds.add(f.friend_id);
          } else {
            friendIds.add(f.user_id);
          }
        });
        
        // Get profile data for all friends
        if (friendIds.size > 0) {
          const { data: profilesData, error: profilesError } = await (supabase as any)
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', Array.from(friendIds));
            
          if (profilesError) throw profilesError;
          
          if (profilesData) {
            allFriends = profilesData.map((p: any) => ({
              id: p.id,
              username: p.username || 'Usuario',
              avatar_url: p.avatar_url
            }));
          }
        }
      }
      
      console.log("Total friends loaded:", allFriends.length);
      setFriends(allFriends);
    } catch (error: any) {
      console.error("Error loading friends:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los amigos",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Cargando amigos...</div>;
  }

  if (friends.length === 0) {
    return <div className="text-muted-foreground">No tienes amigos agregados aún.</div>;
  }

  return (
    <div className="space-y-4">
      {friends.map((friend) => (
        <div key={friend.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={friend.avatar_url || undefined} />
              <AvatarFallback>{friend.username[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">
                <Link 
                  to={`/profile/${friend.id}`} 
                  className="hover:underline"
                >
                  {friend.username}
                </Link>
              </div>
            </div>
          </div>
          <Link to={`/messages?user=${friend.id}`}>
            <Button variant="ghost" size="icon">
              <Mail className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}

const FriendsListMemo = memo(FriendsList);
export default FriendsListMemo;
