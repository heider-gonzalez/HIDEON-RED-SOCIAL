import React, { useState } from 'react';
import { Eye, Heart, MessageCircle, Users, Calendar, X, ChevronLeft, ChevronRight, Edit, Trash2, MoreHorizontal, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { PROJECT_STATUS_CONFIG, type Project } from '@/types/project';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ReactionButtons } from '@/components/post/ReactionButtons';
import { useQueryClient } from '@tanstack/react-query';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onEdit?: (project: Project) => void;
  onDelete?: (projectId: string) => void;
  expanded?: boolean; // New prop to show expanded view
}

export function ProjectCard({ project, onClick, onEdit, onDelete, expanded }: ProjectCardProps) {
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const statusConfig = PROJECT_STATUS_CONFIG[project.status];
  
  const isOwner = user?.id === project.author_id;

  // Get all images from media_urls or use image_url as fallback, but filter out videos
  const isVideoUrl = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.m4v'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext)) || 
           lowerUrl.includes('video') || 
           lowerUrl.includes('stream');
  };

  // Priorizar demo_url si existe, luego filtrar media_urls para separar imágenes de videos
  const videoUrl = project.demo_url;
  const allMediaUrls = project.media_urls || [];
  
  // Separar imágenes y videos
  const imageUrls = allMediaUrls.filter(url => !isVideoUrl(url));
  const videoUrls = allMediaUrls.filter(url => isVideoUrl(url));
  
  // Usar video_url principal si existe, o el primer video de media_urls
  const primaryVideoUrl = videoUrl || videoUrls[0];
  
  // Para imágenes: usar image_url si no hay imágenes en media_urls
  const projectImages = imageUrls.length > 0 
    ? imageUrls 
    : project.image_url 
      ? [project.image_url] 
      : [];

  // Debug: Log media data to understand what's being received
  console.log('🎬 ProjectCard Debug - Media Data:', {
    projectTitle: project.title,
    demo_url: project.demo_url,
    image_url: project.image_url,
    media_urls: project.media_urls,
    allMediaUrls: allMediaUrls,
    imageUrls: imageUrls,
    videoUrls: videoUrls,
    primaryVideoUrl: primaryVideoUrl,
    projectImages: projectImages
  });
  
  const displayTechs = project.technologies.slice(0, 4);
  const remainingTechsCount = project.technologies.length - 4;

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Si hay video principal, no abrir galería (los videos se reproducen en el card)
    if (primaryVideoUrl) return;
    
    if (projectImages.length > 0) {
      setShowImageGallery(true);
      setCurrentImageIndex(0);
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + projectImages.length) % projectImages.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % projectImages.length);
  };

  return (
    <>
      <Card 
        className="group cursor-pointer overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 bg-card border-border/50"
        onClick={onClick}
      >
        {/* Horizontal Layout: Image Left, Content Right */}
        <div className="flex flex-col md:flex-row">
          {/* Project Image/Video - Left Side */}
          <div className="relative md:w-2/5 aspect-[16/9] md:aspect-auto bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden">
            {primaryVideoUrl ? (
              <>
                <video
                  src={primaryVideoUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="relative z-10 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-pointer"
                  onClick={handleImageClick}
                />
                
                {/* Video indicator overlay */}
                <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="text-center">
                    <div className="text-white text-lg font-semibold mb-1">
                      ▶️ Video
                    </div>
                    {projectImages.length > 0 && (
                      <div className="text-white text-sm bg-white/20 backdrop-blur-md rounded-full px-4 py-2 border border-white/30">
                        Ver galería ({projectImages.length} imágenes)
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : projectImages.length > 0 ? (
              <>
                <img
                  src={projectImages[0]}
                  alt={project.title}
                  className="relative z-10 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-pointer"
                  onClick={handleImageClick}
                />
                
                {/* Image counter and "Ver más" overlay for multiple images */}
                {projectImages.length > 1 && (
                  <div 
                    className="absolute inset-0 z-20 bg-black/40 backdrop-blur-sm flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    onClick={handleImageClick}
                  >
                    <div className="text-center">
                      <div className="text-white text-lg font-semibold mb-1">
                        +{projectImages.length - 1} imágenes
                      </div>
                      <div className="text-white text-sm bg-white/20 backdrop-blur-md rounded-full px-4 py-2 border border-white/30">
                        Ver más
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-6xl opacity-20">📁</div>
              </div>
            )}
          
          {/* Gradient overlay for better badge visibility */}
          <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />
          
          {/* Status Badge - Top Left */}
          <div className="absolute top-3 left-3 z-30">
            <Badge 
              className={`${statusConfig.color} text-white font-bold px-3 py-1.5 text-xs uppercase tracking-wide shadow-lg backdrop-blur-sm`}
            >
              {statusConfig.label}
            </Badge>
          </div>

          {/* Collaboration Badge - Top Right */}
          {project.seeking_collaborators && (
            <div className="absolute top-3 right-3 z-30">
              <Badge className="bg-emerald-500 text-white font-bold px-3 py-1.5 text-xs shadow-lg backdrop-blur-sm">
                🤝 Busca colaboradores
              </Badge>
            </div>
          )}

          {/* Owner Actions - Top Right (only for project owners) */}
          {isOwner && (
            <div className="absolute top-3 right-3 z-40">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white rounded-full"
                  >
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(project);
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Edit size={14} />
                    <span>Editar proyecto</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(project.id);
                    }}
                    className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 size={14} />
                    <span>Eliminar proyecto</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Views count overlay - Bottom Right */}
          <div className="absolute bottom-3 right-3 z-30">
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-3 py-1.5 text-white text-xs font-medium">
              <Eye size={12} className="opacity-80" />
              <span>{project.views_count.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Content - Right Side */}
        <div className="flex-1 p-6 space-y-4">
          {/* Title */}
          <h3 className="font-bold text-2xl text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-300 leading-tight">
            {project.title}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground text-sm leading-relaxed">
            {expanded ? project.description : (project.short_description || project.description)}
          </p>

          {/* Expanded Information */}
          {expanded && (
            <div className="space-y-4 border-t pt-4">
              {/* Objectives */}
              {project.objectives && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Objetivos</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{project.objectives}</p>
                </div>
              )}

              {/* Full Technologies List */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">Tecnologías</h4>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10 hover:border-primary/20 transition-all px-3 py-1 text-xs font-semibold rounded-full"
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Team Members */}
              {project.team_members && project.team_members.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Miembros del Equipo</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.team_members.map((member, index) => (
                      <Badge key={index} variant="outline" className="px-3 py-1 text-xs">
                        {member}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                {project.demo_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    asChild
                  >
                    <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={14} />
                      Demo
                    </a>
                  </Button>
                )}
                {project.github_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    asChild
                  >
                    <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                      <Users size={14} />
                      GitHub
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Technologies Preview (collapsed view) */}
          {!expanded && (
            <div className="flex flex-wrap gap-2">
              {displayTechs.map((tech, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10 hover:border-primary/20 transition-all px-3 py-1 text-xs font-semibold rounded-full"
                >
                  {tech}
                </Badge>
              ))}
              {remainingTechsCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="bg-muted/50 text-muted-foreground hover:bg-muted transition-all px-3 py-1 text-xs font-semibold rounded-full"
                >
                  +{remainingTechsCount}
                </Badge>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border/50" />

          {/* Author and Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-primary/10 shadow-md transition-all group-hover:ring-primary/30">
                <AvatarImage src={project.author?.avatar_url} />
                <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                  {project.author?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {project.author?.username || 'Usuario'}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar size={11} className="opacity-60" />
                  <span>
                    {formatDistanceToNow(new Date(project.created_at), { 
                      addSuffix: true,
                      locale: es
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Interaction Footer - Like PostCard */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                {/* Reactions - Like PostCard ReactionButtons */}
                <div className="flex-1 justify-start">
                  <ReactionButtons post={{
                    ...project,
                    user_id: project.author_id,
                    visibility: 'public' as const,
                    reactions: project.reactions || []
                  }} />
                </div>
                
                {/* Comments */}
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-1"
                  onClick={() => setShowComments(!showComments)}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm">
                    {project.comments_count > 0 ? project.comments_count : ''} Comentar
                  </span>
                  {showComments ? (
                    <ChevronUp className="h-4 w-4 ml-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>

    {/* Image Gallery Dialog */}
    <Dialog open={showImageGallery} onOpenChange={setShowImageGallery}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <div className="relative">
          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowImageGallery(false);
            }}
            className="absolute top-4 right-4 z-50 bg-black/50 backdrop-blur-sm rounded-full p-2 text-white hover:bg-black/70 transition-colors"
          >
            <X size={20} />
          </button>

          {/* Image display */}
          <div className="relative bg-black">
            <img
              src={projectImages[currentImageIndex]}
              alt={`${project.title} - Imagen ${currentImageIndex + 1}`}
              className="w-full h-auto max-h-[80vh] object-contain"
            />

            {/* Navigation buttons */}
            {projectImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm rounded-full p-3 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm rounded-full p-3 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Image counter */}
            {projectImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm">
                {currentImageIndex + 1} / {projectImages.length}
              </div>
            )}
          </div>

          {/* Image thumbnails */}
          {projectImages.length > 1 && (
            <div className="p-4 bg-gray-100 dark:bg-gray-900 border-t">
              <div className="flex gap-2 overflow-x-auto">
                {projectImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(index);
                    }}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-primary ring-2 ring-primary/50'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
