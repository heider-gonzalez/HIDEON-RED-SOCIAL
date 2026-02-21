import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExternalLink, Github, MessageCircle, Target } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

type ProyectoMeta = {
  title?: string;
  description?: string;
  required_skills?: string[];
  status?: string;
  contact_link?: string;
  max_participants?: number;
  stack?: string[];
  demo_url?: string;
  github_url?: string;
  impact?: string;
};

interface ProyectoPostContentProps {
  profileId: string;
  proyecto: ProyectoMeta;
}

export function ProyectoPostContent({ profileId, proyecto }: ProyectoPostContentProps) {
  const navigate = useNavigate();

  const title = String(proyecto.title || "").trim();
  const description = String(proyecto.description || "").trim();

  const stack = useMemo(() => {
    const raw = Array.isArray(proyecto.stack) ? proyecto.stack : [];
    const fallback = Array.isArray(proyecto.required_skills) ? proyecto.required_skills : [];
    const merged = [...raw, ...fallback]
      .map((s) => String(s || "").trim())
      .filter(Boolean);

    const seen = new Set<string>();
    const uniq: string[] = [];
    for (const t of merged) {
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(t);
      if (uniq.length >= 8) break;
    }
    return uniq;
  }, [proyecto.stack, proyecto.required_skills]);

  const demoUrl = String(proyecto.demo_url || "").trim();
  const githubUrl = String(proyecto.github_url || "").trim();
  const impact = String(proyecto.impact || "").trim();

  const handleCollaborate = () => {
    const draft = `Hola, vi tu proyecto "${title || "tu proyecto"}" y me interesa colaborar. ¿Qué perfil estás buscando?`;
    navigate(`/messages?user=${profileId}&draft=${encodeURIComponent(draft)}`);
  };

  return (
    <div className="px-4 md:px-4 pb-2">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Proyecto
              </Badge>
              {impact && (
                <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[18rem]">Impacto: {impact}</span>
                </div>
              )}
            </div>

            {title && <div className="mt-2 text-base font-semibold text-foreground">{title}</div>}
            {description && (
              <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {description}
              </div>
            )}

            {stack.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {stack.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("justify-start", !demoUrl && "opacity-60")}
              disabled={!demoUrl}
              onClick={() => window.open(demoUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Demo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("justify-start", !githubUrl && "opacity-60")}
              disabled={!githubUrl}
              onClick={() => window.open(githubUrl, "_blank")}
            >
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </Button>
            <Button type="button" size="sm" onClick={handleCollaborate}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Colaborar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
