import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  UserPlus, 
  Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
// Removed engagement sidebar

import { useChatSystem } from "@/hooks/use-chat-system";
import { useBatchFollowingStatus } from "@/hooks/use-batch-following-status";
import { useFollowUser } from "@/hooks/use-follow-user";
import { getRecentActivityLabel, isRecentlyOnline, isUserOnline } from "@/utils/time-utils";
import { useGlobalPresence } from "@/hooks/use-global-presence";

interface RightSidebarProps {
  currentUserId: string | null;
}

interface Friend {
  id: string;
  username: string;
  avatar_url: string | null;
  is_online?: boolean;
  last_seen?: string;
  status?: 'online' | 'offline' | 'away' | null;
}

interface FriendSuggestion {
  id: string;
  username: string;
  avatar_url: string | null;
  mutual_friends?: number;
}

export function RightSidebar({ currentUserId }: RightSidebarProps) {
  const { openChat } = useChatSystem();
  const [onlineFriends, setOnlineFriends] = useState<Friend[]>([]);
  const [friendSuggestions, setFriendSuggestions] = useState<FriendSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState(0);
  const [contactsQuery, setContactsQuery] = useState("");

  const { isOnline } = useGlobalPresence();

  useEffect(() => {
    const t = window.setInterval(() => setNowTick((n) => n + 1), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const { followUser, isLoading: isFollowLoading } = useFollowUser();

  const suggestionIds = friendSuggestions.map(s => s.id);
  const { getFollowingStatus, updateFollowingStatus } = useBatchFollowingStatus(suggestionIds);

  const visibleSuggestions = friendSuggestions.filter(s => !getFollowingStatus(s.id));

  const filteredContacts = useMemo(() => {
    const q = contactsQuery.trim().toLowerCase();
    if (!q) return onlineFriends;
    return onlineFriends.filter((f) => String(f.username || "").toLowerCase().includes(q));
  }, [onlineFriends, contactsQuery]);

  const contactMeta = useMemo(() => {
    void nowTick;
    const map = new Map<string, { showOnline: boolean; label: string }>();
    onlineFriends.forEach((f) => {
      const label = getRecentActivityLabel(f.last_seen ?? null);
      const showOnline = isRecentlyOnline(f.last_seen ?? null);
      map.set(f.id, { showOnline, label });
    });
    return map;
  }, [onlineFriends, nowTick]);

  const onlineCount = useMemo(() => {
    return onlineFriends.filter((f) => contactMeta.get(f.id)?.showOnline && isOnline(f.id)).length;
  }, [onlineFriends, contactMeta, isOnline]);

  // Load online friends and suggestions
  useEffect(() => {
    if (!currentUserId) return;

    const loadSidebarData = async () => {
      try {
        // Load following (Instagram-style). Use it as contact list.
        const { data: followingRows, error: followingError } = await supabase
          .from('followers')
          .select(`
            created_at,
            profiles!followers_following_id_fkey (
              id,
              username,
              avatar_url,
              status,
              last_seen
            )
          `)
          .eq('follower_id', currentUserId)
          .limit(8);

        if (followingError) throw followingError;

        const followingProfiles = (followingRows || [])
          .map((row: any) => row.profiles)
          .filter(Boolean)
          .map((profile: any) => {
            const status = profile.status ?? null;
            const last_seen = profile.last_seen ?? null;
            return {
              id: profile.id,
              username: profile.username || '',
              avatar_url: profile.avatar_url,
              status,
              last_seen,
              is_online: isUserOnline(status, last_seen)
            } as Friend;
          });

        setOnlineFriends(followingProfiles);

        // Load friend suggestions (users not yet friends with)
        const { data: suggestionsDataRaw, error: suggestionsError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .neq('id', currentUserId)
          .limit(5);

        if (suggestionsError) throw suggestionsError;

        // Filter out users you already follow
        const existingFriendIds = followingProfiles.map(f => f.id);
        const suggestionsData = (suggestionsDataRaw ?? []) as Array<{
          id: string;
          username: string | null;
          avatar_url: string | null;
        }>;

        const suggestions = suggestionsData
          .filter((profile) => profile?.id && !existingFriendIds.includes(profile.id))
          .map((profile) => ({
            id: profile.id,
            username: profile.username || "",
            avatar_url: profile.avatar_url,
            mutual_friends: Math.floor(Math.random() * 10) // Simulate mutual friends count
          }));

        setFriendSuggestions(suggestions);
      } catch (error) {
        console.error('Error loading sidebar data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSidebarData();
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="h-full bg-muted/40">
        <div className="px-4 py-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-muted rounded-full"></div>
                  <div className="h-4 bg-muted rounded flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-muted/40">
      <div className="px-4 py-4">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={contactsQuery}
              onChange={(e) => setContactsQuery(e.target.value)}
              placeholder="Buscar contactos..."
              className="pl-10 pr-4 rounded-full h-9 bg-background border-border/50"
            />
          </div>
        </div>

        {/* Online Friends Section */}
        <div className="mb-6">
          <div className="pb-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-3.5 w-3.5" />
                </span>
                Contactos
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {onlineCount} en línea
              </span>
            </div>
          </div>

          <div className="space-y-0.5">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((friend) => {
                const isFriendOnline = Boolean(contactMeta.get(friend.id)?.showOnline && isOnline(friend.id));
                return (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
                    onClick={() => openChat(friend.id, friend.username, friend.avatar_url)}
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback>
                          {friend.username?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      {isFriendOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {friend.username}
                      </p>
                      {contactMeta.get(friend.id)?.label && (
                        <p className="text-xs text-muted-foreground">
                          {contactMeta.get(friend.id)?.label}
                        </p>
                      )}
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        to={`/profile/${friend.id}`}
                        className="p-1.5 rounded-full hover:bg-muted/70 transition-colors"
                        title="Ver perfil"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tienes contactos activos
              </p>
            )}
          </div>
        </div>

        <Separator className="my-4 opacity-50" />

        {/* Friend Suggestions Section */}
        <div>
          <div className="pb-2 text-sm font-semibold flex items-center gap-2 text-foreground">
            <UserPlus className="h-4 w-4" />
            Personas que podrías conocer
          </div>

          <div className="space-y-2">
            {visibleSuggestions.length > 0 ? (
              visibleSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Link
                    to={`/profile/${suggestion.id}`}
                    className="flex items-center gap-3 flex-1"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={suggestion.avatar_url || undefined} />
                      <AvatarFallback>
                        {suggestion.username?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{suggestion.username}</p>
                      {suggestion.mutual_friends && suggestion.mutual_friends > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {suggestion.mutual_friends} seguidores en común
                        </p>
                      )}
                    </div>
                  </Link>

                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs"
                    disabled={isFollowLoading(suggestion.id)}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const result = await followUser(suggestion.id);
                      if (result.success) {
                        updateFollowingStatus(suggestion.id, true);
                        setFriendSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
                      }
                    }}
                  >
                    Seguir
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay sugerencias disponibles
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}