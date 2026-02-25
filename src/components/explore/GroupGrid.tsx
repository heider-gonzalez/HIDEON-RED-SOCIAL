import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function GroupGrid({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate();

  const { data: groups, isLoading } = useQuery({
    queryKey: ["explore-groups", searchQuery],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [publicGroups, userGroups] = await Promise.all([
        supabase.rpc("get_public_groups", {
          limit_count: 50,
        }),
        user?.id
          ? supabase.rpc("get_user_groups", {
              user_id_param: user.id,
            })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (publicGroups.error) throw publicGroups.error;
      if (userGroups.error) throw userGroups.error;

      const merged: any[] = [...(publicGroups.data ?? []), ...(userGroups.data ?? [])];
      const byId = new Map<string, any>();
      for (const g of merged) {
        if (!g?.id) continue;
        byId.set(String(g.id), g);
      }
      return Array.from(byId.values());
    },
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredGroups = (groups ?? []).filter((g) => {
    if (!normalizedQuery) return true;
    return (
      g.name?.toLowerCase().includes(normalizedQuery) ||
      g.description?.toLowerCase().includes(normalizedQuery) ||
      g.category?.toLowerCase().includes(normalizedQuery) ||
      (g.tags ?? []).some((t) => t.toLowerCase().includes(normalizedQuery))
    );
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!filteredGroups || filteredGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Por ahora no aparece ningún grupo</p>
        <p className="text-xs text-muted-foreground mt-1">Puedes crear uno y empezar la conversación con tu gente.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {filteredGroups.map((group) => (
        <Card
          key={group.id}
          className="overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 bg-card border border-border"
          onClick={() => navigate(`/groups/${group.slug || group.id}`)}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={group.avatar_url || undefined} />
                <AvatarFallback>
                  {(group.name || "G").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm line-clamp-1">{group.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {group.category || (group.type ? group.type.toUpperCase() : "GRUPO")}
                </p>
              </div>
            </div>

            {group.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{group.description}</p>
            )}

            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {group.member_count ?? 0}
              </Badge>
              {group.is_private && (
                <Badge variant="outline" className="text-xs">
                  Privado
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
