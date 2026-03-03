
import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageCircle, Users2 } from "lucide-react";
// Removed online status for performance
import { getRecentActivityLabel, isRecentlyOnline, isUserOnline } from "@/utils/time-utils";
// Removed ChatDialog - using global chat only
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGlobalPresence } from "@/hooks/use-global-presence";

export function FriendsSidebar() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [nowTick, setNowTick] = useState(0);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { isOnline } = useGlobalPresence();
  // Online status tracking removed for performance

  useEffect(() => {
    const t = window.setInterval(() => setNowTick((n) => n + 1), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const friendMeta = useMemo(() => {
    void nowTick;
    const map = new Map<string, { showOnline: boolean; label: string }>();
    (friends || []).forEach((f: any) => {
      const label = getRecentActivityLabel(f.last_seen ?? null);
      const showOnline = isRecentlyOnline(f.last_seen ?? null);
      map.set(f.id, { showOnline, label });
    });
    return map;
  }, [friends, nowTick]);

  useEffect(() => {
    const loadFriends = async () => {
      try {
        // Get the current user
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUserId = sessionData.session?.user.id;
        
        if (!currentUserId) {
          setLoading(false);
          return;
        }
        
        // Obtener amigos utilizando la tabla friendships en lugar de friends
        // Consulta para obtener amigos que el usuario actual ha aceptado 
        const { data: acceptedFriends, error: followingError } = await (supabase as any)
          .from('friendships')
          .select(`
            friend:profiles!friendships_friend_id_fkey (
              id,
              username,
              avatar_url,
              status,
              last_seen
            )
          `)
          .eq('user_id' as any, currentUserId as any)
          .eq('status' as any, 'accepted' as any);

        if (followingError) throw followingError;
        
        // Consulta para obtener usuarios que han aceptado al usuario actual como amigo
        const { data: followers, error: followersError } = await (supabase as any)
          .from('friendships')
          .select(`
            user:profiles!friendships_user_id_fkey (
              id,
              username,
              avatar_url,
              status,
              last_seen
            )
          `)
          .eq('friend_id' as any, currentUserId as any)
          .eq('status' as any, 'accepted' as any);

        if (followersError) throw followersError;
          
        // Combinar y formatear resultados
        const formattedFriends = [
          ...(acceptedFriends || []).map(f => ({
            id: f.friend.id,
            username: f.friend.username || 'Usuario',
            avatar_url: f.friend.avatar_url,
            status: f.friend.status,
            last_seen: f.friend.last_seen
          })),
          ...(followers || []).map(f => ({
            id: f.user.id,
            username: f.user.username || 'Usuario',
            avatar_url: f.user.avatar_url,
            status: f.user.status,
            last_seen: f.user.last_seen
          }))
        ];
        
        // Eliminar duplicados (en caso de amistad mutua)
        const uniqueFriends = Array.from(
          new Map(formattedFriends.map(friend => [friend.id, friend])).values()
        );
            
        setFriends(uniqueFriends);
      } catch (error) {
        console.error("Error loading friends:", error);
      } finally {
        setLoading(false);
      }
    };

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

  const handleFriendClick = (friend, e) => {
    e.preventDefault();
    if (!isMobile) {
      setSelectedFriend(friend);
      setShowChatDialog(true);
    }
  };

  const closeChatDialog = () => {
    setShowChatDialog(false);
    setSelectedFriend(null);
  };

  return (
    <div className="space-y-4">
      {/* Grupos Section */}
      <Card className="bg-white dark:bg-black border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Grupos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Link 
            to="/groups" 
            className="flex items-center gap-3 p-3 hover:bg-accent/30 rounded-md transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4 text-primary" />
              <span className="font-medium">Explorar Grupos</span>
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Amigos Section */}
      <Card className="bg-white dark:bg-black border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold">Amigos</CardTitle>
        </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.length === 0 ? (
              <p className="text-center text-muted-foreground px-4 py-2">
                Aún no tienes amigos agregados
              </p>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="relative group">
                  <Link
                    to={`/profile/${friend.id}`}
                    onClick={(e) => handleFriendClick(friend, e)}
                    className="flex items-center gap-3 p-3 hover:bg-accent/30 rounded-md transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback>{friend.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {friendMeta.get(friend.id)?.showOnline && isOnline(friend.id) && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{friend.username}</div>
                      {(() => {
                        const meta = friendMeta.get(friend.id);
                        if (!meta?.label) return null;
                        return <div className="text-xs text-muted-foreground">{meta.label}</div>;
                      })()}
                    </div>
                    {!isMobile && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </Link>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
      
      {/* Chat removed - using global chat only */}
    </Card>
    </div>
  );
}
