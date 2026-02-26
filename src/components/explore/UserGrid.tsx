import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type ExploreUser = {
  id: string;
  username: string | null;
  google_name: string | null;
  avatar_url: string | null;
  career: string | null;
  updated_at: string | null;
};

export function UserGrid({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate();
  const normalizedQuery = searchQuery.trim();
  
  const { data: users, isLoading } = useQuery<ExploreUser[]>({
    queryKey: ['explore-users', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, username, google_name, avatar_url, career, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (normalizedQuery) {
        const q = normalizedQuery.replace(/,/g, ' ');
        query = query.or(`username.ilike.%${q}%,google_name.ilike.%${q}%,career.ilike.%${q}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ExploreUser[];
    }
  });

  if (isLoading) {
    return <div className="grid grid-cols-2 gap-3">
      {[1,2,3,4].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)}
    </div>;
  }

  if (!users || users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No se encontraron usuarios</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {users?.map((user) => (
        <Card 
          key={user.id} 
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(`/profile/${user.id}`)}
        >
          <CardContent className="p-4 flex flex-col items-center text-center">
            <Avatar className="h-16 w-16 mb-3">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="text-lg">
                {user.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <h3 className="font-semibold text-sm line-clamp-1">
              @{user.username || 'usuario'}
            </h3>
            
            {user.career && (
              <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
                {user.career}
              </p>
            )}
            
            <Button 
              size="sm" 
              className="w-full mt-2"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${user.id}`);
              }}
            >
              Ver perfil
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
