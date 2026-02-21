import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Heart, MessageCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProjectPreviewCardProps {
  project: {
    id: string;
    post_id: string;
    project_title: string;
    project_description: string;
    project_status: string;
    technologies_used: string[];
    images_urls: string[];
    seeking_collaborators: boolean;
    user_id: string;
    username?: string;
    avatar_url?: string;
    views_count?: number;
    reactions_count?: number;
    comments_count?: number;
    created_at: string;
  };
}

export function ProjectPreviewCard({ project }: ProjectPreviewCardProps) {
  const statusConfig = {
    planning: { label: 'En Desarrollo', class: 'bg-yellow-500/10 text-yellow-500' },
    development: { label: 'En Desarrollo', class: 'bg-blue-500/10 text-blue-500' },
    active: { label: 'Activo', class: 'bg-green-500/10 text-green-500' },
    completed: { label: 'Completado', class: 'bg-gray-500/10 text-muted-foreground' }
  };

  const status = statusConfig[project.project_status as keyof typeof statusConfig] || statusConfig.active;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header con imagen */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5">
        {project.images_urls && project.images_urls[0] ? (
          <img
            src={project.images_urls[0]}
            alt={project.project_title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-6xl opacity-20">📚</div>
          </div>
        )}
        <div className="absolute top-4 right-4">
          <Badge className={status.class}>{status.label}</Badge>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        {/* Autor */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={project.avatar_url} />
            <AvatarFallback>{project.username?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{project.username || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(project.created_at).toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'short' 
              })}
            </p>
          </div>
        </div>

        {/* Título y Descripción */}
        <h3 className="font-bold text-xl mb-2 line-clamp-2">
          {project.project_title}
        </h3>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {project.project_description}
        </p>

        {/* Tecnologías */}
        <div className="flex flex-wrap gap-2 mb-4">
          {project.technologies_used?.slice(0, 4).map((tech, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tech}
            </Badge>
          ))}
          {project.technologies_used?.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{project.technologies_used.length - 4}
            </Badge>
          )}
        </div>

        {/* Badge de colaboradores */}
        {project.seeking_collaborators && (
          <div className="mb-4">
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <Users className="h-3 w-3 mr-1" />
              Buscando Colaboradores
            </Badge>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{project.views_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4" />
            <span>{project.reactions_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            <span>{project.comments_count || 0}</span>
          </div>
        </div>

        {/* Botón Ver Proyecto */}
        <Link to={`/project/${project.post_id}`}>
          <Button className="w-full" variant="default">
            Ver Proyecto →
          </Button>
        </Link>
      </div>
    </Card>
  );
}