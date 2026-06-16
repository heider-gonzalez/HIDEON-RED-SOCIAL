import React, { useState, useRef, useEffect } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MediaRenderer } from "@/components/media/MediaRenderer";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { 
  Heart, 
  MessageCircle, 
  Eye, 
  Users, 
  Calendar,
  ExternalLink,
  Github,
  Globe,
  Mail,
  Send,
  X,
  User,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { PROJECT_STATUS_CONFIG, type Project } from '@/types/project';
import { useProjectViews, useProjectComments } from '@/hooks/projects';
import { usePostReactions } from '@/hooks/posts/use-post-reactions';
import { ReactionType } from '@/types/database/social.types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useFullscreenVideo } from '@/components/video/FullscreenVideoContext';

interface ProjectModalProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectModal({ project, open, onOpenChange }: ProjectModalProps) {
  const [newComment, setNewComment] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);
  const navigate = useNavigate();
  const fullscreenVideo = useFullscreenVideo();
  const videoRef = useRef<HTMLVideoElement>(null);
  const didPushHistoryRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMutedLocal, setIsMutedLocal] = useState(true);
  const [volumeLocal, setVolumeLocal] = useState(1);

  // Helper function to get the first media URL (video or image)
  const getPrimaryMediaUrl = (): string | undefined => {
    // Check media_urls array first
    if (project.media_urls && project.media_urls.length > 0) {
      return project.media_urls[0];
    }
    // Fallback to image_url
    return project.image_url;
  };

  const primaryMediaUrl = getPrimaryMediaUrl();
  const isVideo = primaryMediaUrl ? /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(primaryMediaUrl) : false;
  const statusConfig = PROJECT_STATUS_CONFIG[project.status];

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  const openFullscreenFromModal = (v?: HTMLVideoElement | null) => {
    const video = v ?? videoRef.current;
    if (!primaryMediaUrl) return;
    try {
      video?.pause();
    } catch {
      // ignore
    }
    fullscreenVideo.open({
      initialUrl: primaryMediaUrl,
      initialTime: video?.currentTime ?? 0,
      muted: video?.muted ?? true,
    });
  };

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (v.paused) {
        await v.play();
      } else {
        v.pause();
      }
    } catch {
      // ignore
    }
  };

  const toggleMuteLocal = () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = !v.muted;
      setIsMutedLocal(v.muted);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoadedMetadata = () => {
      setDuration(Number.isFinite(v.duration) ? v.duration : 0);
    };
    const onTimeUpdate = () => setCurrentTime(v.currentTime || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => {
      setIsMutedLocal(Boolean(v.muted));
      setVolumeLocal(typeof v.volume === 'number' ? v.volume : 1);
    };

    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('volumechange', onVolumeChange);

    onLoadedMetadata();
    onTimeUpdate();
    onVolumeChange();

    return () => {
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('volumechange', onVolumeChange);
    };
  }, [primaryMediaUrl]);

  useEffect(() => {
    if (!open) {
      didPushHistoryRef.current = false;
      return;
    }

    try {
      if (!didPushHistoryRef.current) {
        window.history.pushState({ __hsocial_project_modal: true }, "");
        didPushHistoryRef.current = true;
      }
    } catch {
      // ignore
    }

    const onPopState = () => {
      onOpenChange(false);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [open, onOpenChange]);
  
  // Hooks for views, reactions, and comments
  const { viewsCount, viewers } = useProjectViews(project.id, project.author_id);
  const { userReaction, onReaction } = usePostReactions(project.id);
  const { comments, submitComment, isSubmitting } = useProjectComments(project.id);

  const trackProjectEvent = async (eventType: 'project_click_demo' | 'project_click_contact') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any).rpc('track_analytics_event', {
        p_event_type: eventType,
        p_entity_type: 'post',
        p_entity_id: project.id,
        p_owner_id: project.author_id,
        p_is_anonymous: !user,
        p_metadata: {}
      });
    } catch {
      // ignore
    }
  };

  // Count total reactions (from posts table if available)
  const reactionsCount = project.likes_count || 0;

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      submitComment(newComment, {
        onSuccess: () => {
          setNewComment('');
        }
      });
    }
  };

  const handleReaction = () => {
    onReaction(project.id, 'love' as ReactionType);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="p-0 fixed inset-0 w-screen h-screen max-w-none border-none rounded-none bg-black overflow-hidden"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            transform: 'none',
            maxWidth: 'none'
          }}
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 left-4 z-[10002] rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors p-2"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] h-screen min-h-0">
            {/* Left: Media */}
            <div className="relative flex items-center justify-center bg-black min-h-0 w-full">
              {primaryMediaUrl && (
                <div className="relative w-full h-full flex items-center justify-center">
                  <MediaRenderer
                    url={primaryMediaUrl}
                    alt={project.title}
                    className={isVideo ? "w-full h-full object-contain" : "w-full h-full object-contain"}
                    autoPlay={false}
                    muted
                    loop
                    playsInline
                    controls={false}
                    videoRef={videoRef}
                    onClick={() => {
                      if (!isVideo) return;
                      openFullscreenFromModal(videoRef.current);
                    }}
                  />

                  {isVideo && (
                    <div
                      className="absolute left-0 right-0 bottom-0 z-40 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="h-8 w-8 inline-flex items-center justify-center text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            void togglePlay();
                          }}
                          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                        >
                          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </button>

                        <div className="text-xs text-white tabular-nums min-w-[84px]">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </div>

                        <input
                          type="range"
                          min={0}
                          max={duration || 0}
                          step={0.1}
                          value={Math.min(currentTime, duration || 0)}
                          onChange={(e) => {
                            const v = videoRef.current;
                            if (!v) return;
                            const t = Number(e.target.value);
                            try {
                              v.currentTime = t;
                              setCurrentTime(t);
                            } catch {
                              // ignore
                            }
                          }}
                          className="flex-1 h-1 accent-white"
                        />

                        <button
                          type="button"
                          className="h-8 w-8 inline-flex items-center justify-center text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMuteLocal();
                          }}
                          aria-label={isMutedLocal ? 'Activar sonido' : 'Silenciar'}
                        >
                          {isMutedLocal || volumeLocal === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                        </button>

                        <button
                          type="button"
                          className="h-8 w-8 inline-flex items-center justify-center text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFullscreenFromModal(videoRef.current);
                          }}
                          aria-label="Pantalla completa"
                        >
                          <Maximize className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Content */}
            <div className="bg-background h-full min-h-0 overflow-y-auto">
              <div className="p-4 border-b">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">{project.title}</DialogTitle>
                </DialogHeader>
              </div>

              <div className="p-4 space-y-6">
                {/* Status and Stats */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Badge className={`${statusConfig.color} text-white px-3 py-1`}>
                      {statusConfig.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Categoría: {project.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {/* Reaction Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReaction}
                      className={`flex items-center gap-1 ${userReaction ? 'text-red-500' : 'text-muted-foreground'} hover:text-red-500`}
                    >
                      <Heart size={16} fill={userReaction ? 'currentColor' : 'none'} />
                      <span>{reactionsCount}</span>
                    </Button>
                    
                    {/* Comments Count */}
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MessageCircle size={16} />
                      <span>{comments.length}</span>
                    </div>
                    
                    {/* Views with hover card showing viewers */}
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center gap-1 text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                          <Eye size={16} />
                          <span>{viewsCount}</span>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Visto por</h4>
                          {viewers.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {viewers.map((viewer) => (
                                <div key={viewer.viewer_id} className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={viewer.avatar_url || undefined} />
                                    <AvatarFallback>
                                      {viewer.username?.charAt(0).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {viewer.username || 'Usuario'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(viewer.viewed_at), {
                                        addSuffix: true,
                                        locale: es
                                      })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Aún no hay visualizaciones
                            </p>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                </div>

                {/* Author and Professor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <Users size={14} />
                      Autor del Proyecto
                    </p>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={project.author?.avatar_url} />
                        <AvatarFallback>
                          {project.author?.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{project.author?.username}</p>
                        <p className="text-xs text-muted-foreground">Desarrollador Principal</p>
                      </div>
                    </div>
                  </div>

                  {project.professor && (
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <Users size={14} />
                        Profesor a Cargo
                      </p>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>
                            {project.professor.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{project.professor}</p>
                          <p className="text-xs text-muted-foreground">Supervisor Académico</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* University and Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar size={14} />
                      Fecha de Creación
                    </p>
                    <p className="font-medium">
                      {new Date(project.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  {project.duration && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Universidad</p>
                      <p className="font-medium">Universidad Reformada</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-2">Descripción</h3>
                  <p className="text-muted-foreground leading-relaxed">{project.description}</p>
                </div>

                {/* Objectives */}
                {project.objectives && (
                  <div>
                    <h3 className="font-semibold mb-2">Objetivos</h3>
                    <p className="text-muted-foreground leading-relaxed">{project.objectives}</p>
                  </div>
                )}

                {/* Technologies */}
                <div>
                  <h3 className="font-semibold mb-2">Tecnologías</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Team Members */}
                {project.team_members && project.team_members.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Miembros del Equipo</h3>
                    <div className="flex flex-wrap gap-2">
                      {project.team_members.map((member, index) => (
                        <Badge key={index} variant="outline" className="px-3 py-1">
                          {member}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Team Button */}
                <div className="flex gap-3">
                  <Button 
                    onClick={() => {
                      trackProjectEvent('project_click_contact');
                      setShowContactModal(true);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                  >
                    <Mail size={16} />
                    Contactar Equipo
                  </Button>
                  {project.github_url && project.github_url.trim() && (
                    <Button variant="outline" className="flex items-center gap-2" asChild>
                      <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                        <Github size={16} />
                        Ver Código
                      </a>
                    </Button>
                  )}
                  {project.demo_url && project.demo_url.trim() && (
                    <Button variant="outline" className="flex items-center gap-2" asChild>
                      <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={16} />
                        Demo en Vivo
                      </a>
                    </Button>
                  )}
                </div>

                {/* Support Project Section */}
                <div className="bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-2xl">💰</div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Apoya este Proyecto</h3>
                      <p className="text-sm text-muted-foreground">
                        Las donaciones monetarias estarán disponibles próximamente.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Button variant="outline" disabled className="border-2 border-gray-300 text-gray-400 cursor-not-allowed opacity-50">
                      $10
                    </Button>
                    <Button variant="outline" disabled className="border-2 border-gray-300 text-gray-400 cursor-not-allowed opacity-50">
                      $25
                    </Button>
                    <Button variant="outline" disabled className="border-2 border-gray-300 text-gray-400 cursor-not-allowed opacity-50">
                      $50
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Próximamente
                  </p>
                </div>

                {/* Demo and Documentation Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {project.demo_url && project.demo_url.trim() && (
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 justify-center"
                      onClick={() => trackProjectEvent('project_click_demo')}
                      asChild
                    >
                      <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={16} />
                        Demo en Vivo
                      </a>
                    </Button>
                  )}
                  {project.documentation_url && (
                    <Button variant="outline" className="flex items-center gap-2 justify-center" asChild>
                      <a href={project.documentation_url} target="_blank" rel="noopener noreferrer">
                        <Globe size={16} />
                        Documentación
                      </a>
                    </Button>
                  )}
                </div>

                {/* Comments Section */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MessageCircle size={18} />
                    Comentarios ({comments.length})
                  </h3>

                  {/* Comment Form */}
                  <form onSubmit={handleSubmitComment} className="mb-6">
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Escribe un comentario..."
                          className="min-h-[80px] resize-none"
                          disabled={isSubmitting}
                        />
                        <div className="flex justify-end mt-2">
                          <Button 
                            type="submit" 
                            size="sm" 
                            className="flex items-center gap-1"
                            disabled={isSubmitting || !newComment.trim()}
                          >
                            <Send size={14} />
                            {isSubmitting ? 'Enviando...' : 'Comentar'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>

                  {/* Comments List */}
                  <div className="space-y-4">
                    {comments.length > 0 ? (
                      comments.map((comment: any) => (
                        <div key={comment.id} className="flex gap-3">
                          <Link to={`/profile/${comment.user_id}`}>
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarImage src={comment.profiles?.avatar_url} />
                              <AvatarFallback>
                                {comment.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex-1">
                            <div className="bg-muted rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Link to={`/profile/${comment.user_id}`} className="font-medium text-sm hover:underline">
                                  {comment.profiles?.username || 'Usuario'}
                                </Link>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.created_at), { 
                                    addSuffix: true,
                                    locale: es
                                  })}
                                </span>
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Sé el primero en comentar este proyecto
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogDescription className="sr-only">Descripción del diálogo</DialogDescription>
</DialogContent>
      </Dialog>

      {/* Contact Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contactar al Creador</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Creator Info */}
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <Avatar className="w-12 h-12">
                <AvatarImage src={project.author?.avatar_url} />
                <AvatarFallback>
                  {project.author?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{project.author?.username}</p>
                <p className="text-sm text-muted-foreground">Creador del proyecto</p>
              </div>
            </div>

            {/* Contact Options */}
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  // Navigate to chat with the project author
                  navigate(`/chat?user=${project.author_id}`);
                  setShowContactModal(false);
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                <Mail size={16} />
                Enviar Mensaje
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  // Navigate to author's profile
                  navigate(`/profile/${project.author_id}`);
                  setShowContactModal(false);
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                <User size={16} />
                Ver Perfil
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Puedes contactar al creador para colaborar, hacer preguntas o dar feedback sobre el proyecto.
            </p>
          </div>
          <DialogDescription className="sr-only">Descripción del diálogo</DialogDescription>
</DialogContent>
      </Dialog>
    </>
  );
}