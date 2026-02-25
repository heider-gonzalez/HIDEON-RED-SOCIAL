import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type CoquitosRow = Database["public"]["Functions"]["get_coquitos_leaderboard"]["Returns"][number];

export function LeaderboardGrid({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate();
  
  const { data: leaders, isLoading } = useQuery<CoquitosRow[]>({
    queryKey: ["explore-coquitos", 20, 30],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_coquitos_leaderboard", {
        limit_count: 20,
        window_days: 30,
      });
      if (error) throw error;
      return data || [];
    }
  });

  const q = searchQuery.trim().toLowerCase();
  const filtered = (leaders || []).filter((u) => {
    if (!q) return true;
    const username = String(u.username || "").toLowerCase();
    const career = String(u.career || "").toLowerCase();
    return username.includes(q) || career.includes(q);
  });

  if (isLoading) {
    return <div className="space-y-3">
      {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
    </div>;
  }

  if (!filtered || filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Brain className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No encontramos personas con ese filtro</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered?.map((leader) => (
        <Card 
          key={leader.user_id} 
          className="overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-card border border-border"
          onClick={() => navigate(`/profile/${leader.user_id}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <Avatar className="h-12 w-12">
                <AvatarImage src={leader.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-foreground">
                  {leader.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              
              {/* Info */}
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-foreground">
                  {leader.username || "Usuario"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {leader.career || "Usuario destacado"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
