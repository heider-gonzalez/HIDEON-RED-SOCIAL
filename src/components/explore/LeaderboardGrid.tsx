import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { InstitutionCombobox } from "@/components/filters/InstitutionCombobox";
import { VerifiedBadge } from "@/components/profile/VerifiedBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CoquitosRow = Database["public"]["Functions"]["get_coquitos_leaderboard"]["Returns"][number];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function LeaderboardGrid({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate();
  const [institution, setInstitution] = useState("");
  const [careerQuery, setCareerQuery] = useState("");
  
  const { data: leaders, isLoading } = useQuery<CoquitosRow[]>({
    queryKey: ["explore-coquitos", 20, 30],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_coquitos_leaderboard", {
        limit_count: 20,
        window_days: 30,
      });
      if (error) throw error;
      return data || [];
    }
  });

  const userIds = useMemo(
    () => Array.from(new Set((leaders || []).map((u) => u.user_id).filter(Boolean))),
    [leaders]
  );

  const { data: profilesById } = useQuery({
    queryKey: ["explore-coquitos-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, institution_name, career")
        .in("id", userIds);

      if (error) throw error;
      const map = new Map<string, { institution_name: string | null; career: string | null }>();
      (data || []).forEach((p: any) => {
        map.set(String(p.id), {
          institution_name: p.institution_name ?? null,
          career: p.career ?? null,
        });
      });
      return map;
    },
  });

  const { data: verifiedUserIds } = useQuery({
    queryKey: ["explore-coquitos-verified", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      try {
        // Prefer RPC to bypass RLS for leaderboard views (SECURITY DEFINER function in DB)
        try {
          const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
            "get_verified_user_ids",
            { user_ids: userIds }
          );
          if (rpcError) throw rpcError;
          return new Set<string>((rpcData || []).map((r: any) => String(r.user_id)));
        } catch (rpcErr: any) {
          const rpcMsg = String(rpcErr?.message || "").toLowerCase();
          if (rpcMsg.includes("get_verified_user_ids") || rpcMsg.includes("does not exist") || rpcMsg.includes("function")) {
            // Fallback to direct table read when RPC isn't present
            const { data, error } = await (supabase as any)
              .from("university_verifications")
              .select("user_id")
              .in("user_id", userIds)
              .eq("is_verified", true);

            if (error) throw error;
            return new Set<string>((data || []).map((r: any) => String(r.user_id)));
          }
          throw rpcErr;
        }
      } catch (err: any) {
        const message = String(err?.message || "").toLowerCase();
        if (
          message.includes("does not exist") ||
          message.includes("relation") ||
          message.includes("university_verifications") ||
          message.includes("row-level security") ||
          message.includes("permission")
        ) {
          return new Set<string>();
        }
        throw err;
      }
    },
  });

  const filtered = useMemo(() => {
    const qGlobal = normalizeText(searchQuery);
    const qCareer = normalizeText(careerQuery);
    const inst = normalizeText(institution);

    return (leaders || []).filter((u) => {
      const p = profilesById?.get(String(u.user_id));
      const institutionName = String(p?.institution_name || "");
      const career = String(p?.career || u.career || "");
      const username = String(u.username || "");

      const institutionNorm = normalizeText(institutionName);
      const careerNorm = normalizeText(career);
      const usernameNorm = normalizeText(username);

      if (inst) {
        if (!institutionNorm) return false;
        const matchesInstitution = institutionNorm.includes(inst);
        if (!matchesInstitution) return false;
      }

      const matchesGlobal = !qGlobal
        ? true
        : usernameNorm.includes(qGlobal) || careerNorm.includes(qGlobal);

      const matchesCareer = !qCareer
        ? true
        : usernameNorm.includes(qCareer) || careerNorm.includes(qCareer);

      return matchesGlobal && matchesCareer;
    });
  }, [careerQuery, institution, leaders, profilesById, searchQuery]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <InstitutionCombobox
          value={institution}
          onChange={setInstitution}
          className="h-10 rounded-lg"
          allLabel="Todas las universidades"
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={careerQuery}
            onChange={(e) => setCareerQuery(e.target.value)}
            placeholder="Buscar carrera o usuario..."
            className="pl-9 h-10 rounded-lg"
          />
        </div>
      </div>

      {filtered?.map((leader) => {
        const p = profilesById?.get(String(leader.user_id));
        const institutionName = String(p?.institution_name || "");
        const career = String(p?.career || leader.career || "Usuario destacado");
        const isVerified = verifiedUserIds?.has(String(leader.user_id)) || false;

        return (
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">
                      {leader.username || "Usuario"}
                    </h3>
                    {isVerified && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center" aria-label="Usuario verificado">
                              <VerifiedBadge />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Esta persona está verificada como estudiante o profesional en una universidad
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {career}
                  </p>
                  {institutionName && (
                    <p className="text-xs text-muted-foreground truncate">
                      {institutionName}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
