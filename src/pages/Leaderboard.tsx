import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { InstitutionCombobox } from "@/components/filters/InstitutionCombobox";
import { VerifiedBadge } from "@/components/profile/VerifiedBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CoquitosRow = Database["public"]["Functions"]["get_coquitos_leaderboard"]["Returns"][number];

type PeopleRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  career: string | null;
  institution_name: string | null;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [institution, setInstitution] = useState("");
  const [careerQuery, setCareerQuery] = useState("");
  const [showAllPeople, setShowAllPeople] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const hasFilters = Boolean(institution.trim() || careerQuery.trim());
  const peopleMode = hasFilters || showAllPeople;
  const PEOPLE_PAGE_SIZE = 50;
  
  const { data: topUsers, isLoading } = useQuery<CoquitosRow[]>({
    queryKey: ["coquitos-leaderboard", 50, 30],
    enabled: !peopleMode,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_coquitos_leaderboard", {
        limit_count: 50,
        window_days: 30,
      });
      
      if (error) throw error;
      return data || [];
    }
  });

  const {
    data: peopleResultsPages,
    isLoading: isPeopleLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PeopleRow[]>({
    queryKey: ["people-search", institution, careerQuery],
    enabled: peopleMode,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const inst = institution.trim();
      const q = careerQuery.trim();

      const instNorm = normalizeText(inst);
      const instTokens = instNorm
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t.length >= 5)
        .slice(-4);

      const pageIndex = Number(pageParam || 0);
      const from = pageIndex * PEOPLE_PAGE_SIZE;
      const to = from + PEOPLE_PAGE_SIZE - 1;

      let query = supabase
        .from("profiles")
        .select("id, username, avatar_url, career, institution_name")
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (inst) {
        if (instTokens.length > 0) {
          const orExpr = instTokens
            .map((t) => `institution_name.ilike.%${t}%`)
            .join(",");
          query = query.or(orExpr);
        } else {
          query = query.ilike("institution_name", `%${inst}%`);
        }
      }

      if (q) {
        query = query.or(`username.ilike.%${q}%,career.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const qNorm = normalizeText(q);
      return (data || []).filter((row: any) => {
        const rowInstNorm = normalizeText(String(row.institution_name || ""));
        const rowCareerNorm = normalizeText(String(row.career || ""));
        const rowUsernameNorm = normalizeText(String(row.username || ""));

        if (instNorm) {
          if (!rowInstNorm) return false;
          if (!rowInstNorm.includes(instNorm)) return false;
        }

        if (qNorm) {
          return rowUsernameNorm.includes(qNorm) || rowCareerNorm.includes(qNorm);
        }

        return true;
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < PEOPLE_PAGE_SIZE) return undefined;
      return allPages.length;
    },
  });

  const peopleResults = useMemo(() => {
    return (peopleResultsPages?.pages || []).flat();
  }, [peopleResultsPages?.pages]);

  useEffect(() => {
    if (!peopleMode) return;
    if (!hasNextPage) return;

    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "350px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, peopleMode]);

  const userIds = useMemo(
    () => {
      if (peopleMode) {
        return Array.from(new Set((peopleResults || []).map((u) => u.id).filter(Boolean)));
      }
      return Array.from(new Set((topUsers || []).map((u) => u.user_id).filter(Boolean)));
    },
    [peopleMode, peopleResults, topUsers]
  );

  const { data: profilesById } = useQuery({
    queryKey: ["coquitos-leaderboard-profiles", userIds],
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
    queryKey: ["coquitos-leaderboard-verified", userIds],
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
    const qCareer = normalizeText(careerQuery);
    const inst = normalizeText(institution);

    return (topUsers || []).filter((u) => {
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

      if (!qCareer) return true;
      return (
        usernameNorm.includes(qCareer) ||
        careerNorm.includes(qCareer)
      );
    });
  }, [careerQuery, institution, profilesById, topUsers]);

  const displayRows = useMemo(() => {
    if (peopleMode) {
      return (peopleResults || []).map((p) => {
        return {
          user_id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
          career: p.career,
        };
      });
    }
    return filtered;
  }, [filtered, peopleMode, peopleResults]);

  if (isLoading || isPeopleLoading) {
    return (
      <LoadingSpinner />
    );
  }

  return (
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <InstitutionCombobox
          value={institution}
          onChange={setInstitution}
          className="h-11 rounded-lg"
          allLabel="Todas las universidades"
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={careerQuery}
            onChange={(e) => setCareerQuery(e.target.value)}
            placeholder="Buscar por carrera o usuario..."
            className="pl-9 h-11 rounded-lg"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {!peopleMode && (
          <button
            type="button"
            className="w-full h-10 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/30 transition-colors"
            onClick={() => setShowAllPeople(true)}
          >
            Ver más personas
          </button>
        )}
        {peopleMode && !hasFilters && (
          <button
            type="button"
            className="w-full h-10 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/30 transition-colors"
            onClick={() => setShowAllPeople(false)}
          >
            Volver al top
          </button>
        )}
      </div>

      <div className="space-y-3">
        {displayRows?.map((user: any) => {
          const p = profilesById?.get(String(user.user_id));
          const institutionName = String(p?.institution_name || "");
          const career = String(p?.career || user.career || "Sin carrera");
          const isVerified = verifiedUserIds?.has(String(user.user_id)) || false;

          return (
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
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h3 className="font-semibold truncate">@{user.username || "usuario"}</h3>
                    {isVerified && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="inline-flex items-center"
                              aria-label="Usuario verificado"
                            >
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
                  <p className="text-sm text-muted-foreground truncate">
                    {career}
                  </p>
                  {institutionName && (
                    <p className="text-xs text-muted-foreground truncate">
                      {institutionName}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {peopleMode && (
        <div className="mt-4">
          <div ref={loadMoreRef} />
          <button
            type="button"
            className="w-full h-10 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/30 transition-colors disabled:opacity-60 disabled:hover:bg-card"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage || !hasNextPage}
          >
            {isFetchingNextPage
              ? "Cargando..."
              : hasNextPage
                ? "Ver más"
                : "No hay más resultados"}
          </button>
        </div>
      )}
    </div>
  );
}
