import { useState, useEffect } from "react";
import { Briefcase, ExternalLink, Users, Target, Calendar, MessageCircle, Pin, PinOff } from "lucide-react";
import type { Idea } from "@/types/post";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { usePremium } from "@/hooks/use-premium";
import { usePinnedProjects } from "@/hooks/use-pinned-projects";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ProjectContentProps {
  idea: Idea;
  postId: string;
  postOwnerId: string;
  projectStatus?: 'idea' | 'in_progress' | 'completed' | null;
  technologies?: string[] | null;
  demoUrl?: string | null;
}

export function ProjectContent({ idea, postId, postOwnerId, projectStatus, technologies, demoUrl }: ProjectContentProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { isPremium } = usePremium();
  const { pinnedProjects } = usePinnedProjects(currentUserId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const effectiveTechnologies = (technologies && technologies.length > 0)
    ? technologies
    : (idea.resources_needed || []);
  const effectiveDemoUrl = demoUrl || idea.demo_url || null;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  const isOwner = currentUserId === postOwnerId;
  const isPinned = pinnedProjects.some(p => p.id === postId);

  const handlePinProject = async () => {
    if (!isPremium) {
      toast({
        variant: "destructive",
        title: "Solo Premium",
        description: "Solo usuarios Premium pueden fijar proyectos.",
      });
      return;
    }

    try {
      const action = isPinned ? 'unpin' : 'pin';
      const { data, error } = await (supabase as any).rpc(`${action}_project`, {
        user_id_param: currentUserId,
        project_id_param: postId,
      });

      if (error) throw error;

      toast({
        title: isPinned ? "Proyecto des fijado" : "Proyecto fijado",
        description: isPinned ? "El proyecto ya no está en tus destacados" : "El proyecto ahora está en tus destacados",
      });

      // Refrescar los datos
      queryClient.invalidateQueries({ queryKey: ["pinned-projects", currentUserId] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'idea': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <>
      <div className="px-0 md:px-4 pb-2">
        {/* Header del proyecto */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="h-5 w-5 text-blue-500" />
              <Badge variant="secondary" className="text-xs font-medium">Proyecto</Badge>
              {projectStatus && (
                <Badge variant="outline" className={getStatusColor(projectStatus)}>
                  {projectStatus === 'completed' ? 'Terminado' : 
                   projectStatus === 'in_progress' ? 'En desarrollo' : 'Idea'}
                </Badge>
              )}
            </div>
            
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{idea.title}</h3>
            
            {idea.participants && idea.participants.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Users className="h-4 w-4" />
                <span>{idea.participants.length} participante{idea.participants.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Botón de pin para usuarios Premium */}
          {isOwner && isPremium && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePinProject}
              className="ml-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isPinned ? (
                <PinOff className="h-4 w-4" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Información adicional del proyecto - Diseño mejorado */}
        {((effectiveTechnologies && effectiveTechnologies.length > 0) || idea.estimated_duration || idea.expected_impact) && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {effectiveTechnologies && effectiveTechnologies.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Target className="h-4 w-4 text-blue-500" />
                    Tecnologías
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {effectiveTechnologies.slice(0, 3).map((tech, index) => (
                      <Badge key={index} variant="outline" className="text-xs bg-white dark:bg-gray-800">
                        {tech}
                      </Badge>
                    ))}
                    {effectiveTechnologies.length > 3 && (
                      <Badge variant="outline" className="text-xs bg-white dark:bg-gray-800">
                        +{effectiveTechnologies.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {idea.expected_impact && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">Impacto esperado</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{idea.expected_impact}</p>
                </div>
              )}

              {idea.estimated_duration && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Duración estimada
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{idea.estimated_duration}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botones de acción - Diseño mejorado */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <Button asChild variant="outline" className="w-full">
            <Link to={`/project/${postId}`}>
              Ver proyecto completo
            </Link>
          </Button>

          {(effectiveDemoUrl || idea.contact_link) && (
            <div className="flex gap-3">
              {idea.contact_link ? (
                <>
                  {effectiveDemoUrl && (
                    <Button asChild variant="outline" className="flex-1">
                      <a href={effectiveDemoUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Vista previa
                      </a>
                    </Button>
                  )}

                  <Button asChild variant="default" className="flex-1">
                    <a href={idea.contact_link} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contactar
                    </a>
                  </Button>
                </>
              ) : (
                <Button asChild variant="default" className="flex-1">
                  <a href={effectiveDemoUrl || "#"} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Vista previa
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
