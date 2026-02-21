import { Layout } from "@/components/layout";
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
      const { data, error } = await supabase.rpc("get_coquitos_leaderboard", {
        limit_count: 50,
        window_days: 30,
      });
      
      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <Layout hideLeftSidebar hideRightSidebar>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout hideLeftSidebar hideRightSidebar>
      <div className="max-w-2xl mx-auto p-4 pb-20">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Coquitos Destacados</h1>
            <p className="text-sm text-muted-foreground">
              Aportes verificados de profesionales y estudiantes que impulsan proyectos en HSocial
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {topUsers?.map((user) => (
            <Card 
              key={user.user_id} 
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/profile/${user.user_id}`)}
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-muted-foreground min-w-[40px]">
                  #{user.rank}
                </div>
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
                <Badge
                  variant="secondary"
                  className="gap-2 flex-shrink-0 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                >
                  <Brain className="h-3 w-3" />
                  <span className="tabular-nums">{Math.round(Number(user.score || 0))}</span>
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
