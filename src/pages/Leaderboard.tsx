import { FacebookLayout } from "@/components/layout/FacebookLayout";
import { Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type CoquitosRow = Database["public"]["Functions"]["get_coquitos_leaderboard"]["Returns"][number];

export default function Leaderboard() {
  const navigate = useNavigate();
  
  const { data: topUsers, isLoading } = useQuery<CoquitosRow[]>({
    queryKey: ["coquitos-leaderboard", 50, 30],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_coquitos_leaderboard", {
        limit_count: 50,
        window_days: 30,
      });
      
      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <FacebookLayout>
        <LoadingSpinner />
      </FacebookLayout>
    );
  }

  return (
    <FacebookLayout>
      <div className="max-w-2xl mx-auto p-4 pb-20">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Personas</h1>
            <p className="text-sm text-muted-foreground">
              Personas que comparten, ayudan y hacen que la comunidad avance
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {topUsers?.map((user) => (
            <Card 
              key={user.user_id} 
              className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => navigate(`/profile/${user.user_id}`)}
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>{user.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">@{user.username || "usuario"}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.career || "Sin carrera"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </FacebookLayout>
  );
}
