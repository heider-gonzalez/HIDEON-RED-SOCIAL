import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getHybridUrl } from "@/lib/hybrid-url";

export function ProjectGrid({
  searchQuery,
  institutionName,
}: {
  searchQuery: string;
  institutionName?: string;
}) {
  const navigate = useNavigate();
  const [brokenMedia, setBrokenMedia] = useState<Record<string, boolean>>({});
  const [loadedMedia, setLoadedMedia] = useState<Record<string, boolean>>({});
  const normalizedQuery = useMemo(() => searchQuery.trim(), [searchQuery]);
  const isVideoUrl = (url: string) => {
    const lower = url.toLowerCase();
    return (
      lower.endsWith(".mp4") ||
      lower.endsWith(".webm") ||
      lower.endsWith(".mov") ||
      lower.endsWith(".m4v") ||
      lower.endsWith(".ogg")
    );
  };
  
  const { data: projects, isLoading } = useQuery<any[]>({
    queryKey: ['explore-projects', searchQuery, institutionName || ''],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select(`
          id,
          user_id,
          created_at,
          content,
          idea,
          project_status,
          media_url,
          media_type,
          media_urls,
          profiles:profiles(username, avatar_url, institution_name)
        `)
        .in('post_type', ['project', 'proyecto'])
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(20);

      if (institutionName) {
        query = query.eq('profiles.institution_name', institutionName);
      }
      
      if (normalizedQuery) {
        const q = normalizedQuery.replace(/,/g, ' ');
        query = query.or(`content.ilike.%${q}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {[1,2,3,4].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)}
    </div>;
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Aún no hay proyectos para mostrar</p>
        <p className="text-xs text-muted-foreground mt-1">Cuando quieras, comparte el tuyo (aunque esté en progreso).</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {projects?.map((project: any) => (
        (() => {
          const idea = (project as any)?.idea && typeof (project as any).idea === 'object' && !Array.isArray((project as any).idea)
            ? ((project as any).idea as any)
            : {};
          const title =
            (project as any)?.title?.trim() ||
            (idea?.title ? String(idea.title).trim() : "") ||
            (project as any)?.content?.trim() ||
            "Proyecto sin título";

          const phase =
            (idea?.project_phase ? String(idea.project_phase).trim() : "") ||
            ((project as any)?.project_status === 'completed'
              ? 'Completado'
              : (project as any)?.project_status === 'in_progress'
              ? 'En desarrollo'
              : 'En desarrollo');

          const phaseLabel = (phase || 'En desarrollo').toUpperCase();

          const mediaUrl =
            ((project as any).media_urls && (project as any).media_urls.length > 0
              ? (project as any).media_urls[0]
              : (project as any)?.media_url) ||
            "";
          const resolvedMediaUrl = getHybridUrl(mediaUrl);
          const isVideo = Boolean(
            ((project as any)?.media_type && String((project as any).media_type).startsWith('video')) ||
              (mediaUrl && isVideoUrl(mediaUrl))
          );
          const isBroken = Boolean(brokenMedia[project.id]);
          const isLoaded = Boolean(loadedMedia[project.id]);

          return (
        <Card 
          key={project.id} 
          className="overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 bg-card border border-border"
          onClick={() => navigate(`/project/${project.id}`)}
        >
          <div className="relative w-full h-40 bg-gradient-to-br from-blue-500 to-purple-500">
            <div className="absolute inset-0 flex items-center justify-center">
              <FolderOpen className="h-12 w-12 text-white/90" />
            </div>
            {mediaUrl && !isBroken ? (
              isVideo ? (
                <video
                  src={resolvedMediaUrl}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
                  style={{ opacity: isLoaded ? 1 : 0 }}
                  muted
                  playsInline
                  preload="metadata"
                  onLoadedData={() => setLoadedMedia((prev) => ({ ...prev, [project.id]: true }))}
                  onError={() => setBrokenMedia((prev) => ({ ...prev, [project.id]: true }))}
                />
              ) : (
                <img
                  src={resolvedMediaUrl}
                  alt={title}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
                  style={{ opacity: isLoaded ? 1 : 0 }}
                  loading="lazy"
                  onLoad={() => setLoadedMedia((prev) => ({ ...prev, [project.id]: true }))}
                  onError={() => setBrokenMedia((prev) => ({ ...prev, [project.id]: true }))}
                />
              )
            ) : null}
          </div>
          
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm line-clamp-2">
                {title}
              </h3>
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {phaseLabel}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={getHybridUrl(project.profiles?.avatar_url) || undefined} />
                <AvatarFallback className="text-xs">
                  {project.profiles?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                @{project.profiles?.username || 'usuario'}
              </span>
            </div>
          </CardContent>
        </Card>
          );
        })()
      ))}
    </div>
  );
}
