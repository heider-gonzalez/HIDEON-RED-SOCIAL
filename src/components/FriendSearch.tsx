
import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";

export function FriendSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchUsers = useCallback(async (raw?: string) => {
    const q = String(raw ?? debouncedSearch).trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, username, google_name, bio, avatar_url')
        .neq('id', user.id)
        .or(`username.ilike.%${q}%,google_name.ilike.%${q}%,bio.ilike.%${q}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo realizar la búsqueda"
      });
    } finally {
      setIsSearching(false);
    }
  }, [debouncedSearch, toast]);

  useEffect(() => {
    searchUsers();
  }, [searchUsers]);

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
    setSearchQuery("");
    setSearchResults([]);
  };

  const getFirstName = (username: string) => {
    return username?.split(' ')[0] || 'Usuario';
  };

  return (
    <>
      <div ref={searchRef} className="relative w-full">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[16px] w-[16px] text-muted-foreground" />
            <Input
              placeholder="Buscar usuarios, proyectos, ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  searchUsers((e.target as HTMLInputElement).value);
                }
              }}
              className="pl-10 pr-4 rounded-2xl border border-border/30 bg-card shadow-md w-full text-sm"
            />
          </div>
        </div>
      {searchResults.length > 0 && (
        <Card className="absolute w-full mt-1 p-2 z-50 shadow-md rounded-2xl border border-border/30 bg-card">
          <div className="space-y-2">
            {searchResults.map((user) => (
              <div 
                key={user.id} 
                role="button"
                tabIndex={0}
                className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => handleUserClick(user.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleUserClick(user.id);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{getFirstName(user.username || 'Usuario')}</div>
                    {user.bio && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {user.bio}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {isSearching && searchQuery.length >= 2 && (
        <Card className="absolute w-full mt-1 p-4 z-50 shadow-lg">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </Card>
      )}
      </div>

    </>
  );
}
