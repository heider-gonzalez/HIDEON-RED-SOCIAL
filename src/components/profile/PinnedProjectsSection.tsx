import { Trophy, Pin, PinOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePinnedProjects } from "@/hooks/use-pinned-projects";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Project {
  id: string;
  title: string;
  description: string;
  impact?: string;
  collaborators?: number;
  completion_date?: string;
  category?: string;
  featured_image?: string;
  link?: string;
  technologies?: string[];
  role?: string;
  status?: 'completed' | 'ongoing' | 'paused';
}

interface PinnedProjectsSectionProps {
  profileId: string;
  isOwner: boolean;
  allProjects?: Project[];
}

export function PinnedProjectsSection({ profileId, isOwner, allProjects = [] }: PinnedProjectsSectionProps) {
  const { pinnedProjects, isLoading } = usePinnedProjects(profileId);
  const { toast } = useToast();

  const handlePin = async (projectId: string, action: 'pin' | 'unpin') => {
    try {
      const rpcName = action === 'pin' ? 'pin_project' : 'unpin_project';
      const { data, error } = await (supabase as any).rpc(rpcName, {
        user_id_param: profileId,
        project_id_param: projectId,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Error al fijar proyecto");
      toast({
        title: action === 'pin' ? 'Proyecto fijado' : 'Proyecto quitado',
        description: action === 'pin' ? 'Se mostrará en la sección destacada.' : 'Ya no está destacado.',
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "No se pudo completar la acción.",
      });
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'ongoing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">Cargando destacados...</div>;
  }

  if (!isOwner && pinnedProjects.length === 0) {
    return null; // No mostrar sección si no hay proyectos fijados
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pin className="h-5 w-5 text-primary" />
          Proyectos destacados
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pinnedProjects.length === 0 ? (
          <div className="text-center py-8">
            <Pin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">
              {isOwner
                ? "Aún no tienes proyectos destacados. Fija hasta 3 para mostrarlos aquí."
                : "Este usuario no tiene proyectos destacados."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pinnedProjects.map((project: any) => (
              <div key={project.id} className="border border-border rounded-lg p-4 bg-muted/20">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{project.title}</h3>
                      {project.status && (
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      )}
                    </div>
                    {project.role && <p className="text-sm text-muted-foreground">{project.role}</p>}
                  </div>
                  {isOwner && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePin(project.id, 'unpin')}
                      title="Quitar de destacados"
                    >
                      <PinOff className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                )}
                {project.link && (
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 text-sm mt-2 inline-block"
                  >
                    Ver proyecto →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
