import React, { useState, useRef, useEffect } from 'react';
import { Eye, Heart, MessageCircle, Users, Calendar, X, ChevronLeft, ChevronRight, Edit, Trash2, MoreHorizontal, ExternalLink, ChevronUp, ChevronDown, Volume2, VolumeX, Volume1, Play, Pause, Maximize } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaRenderer } from "@/components/media/MediaRenderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { PROJECT_STATUS_CONFIG, type Project } from '@/types/project';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ReactionButtons } from '@/components/post/ReactionButtons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AcademicBadge } from './AcademicBadge';
import {
  getSoundEnabled,
  setSoundEnabled,
  setNowPlayingVideoId,
  subscribeNowPlayingVideoId,
  subscribeSoundEnabled,
} from '@/lib/media/global-media';
import { useFullscreenVideo } from '@/components/video/FullscreenVideoContext';

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
  const [showViewers, setShowViewers] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const statusConfig = PROJECT_STATUS_CONFIG[project.status || 'idea'];
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const instanceIdRef = useRef<string>(
    typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function"
      ? (crypto as any).randomUUID()
      : `pc_${Math.random().toString(16).slice(2)}_${Date.now()}`
  );
  const fullscreenVideo = useFullscreenVideo();
  const [isVideoHovered, setIsVideoHovered] = useState(false);
  const [isVideoInView, setIsVideoInView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVerticalVideo, setIsVerticalVideo] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volumeLocal, setVolumeLocal] = useState(1);
  const [isMutedLocal, setIsMutedLocal] = useState(true);

  const [soundEnabled, setSoundEnabledState] = useState(() => getSoundEnabled());
  
  const isOwner = user?.id === project.author_id;

  useEffect(() => {
    return subscribeSoundEnabled((enabled) => {
      setSoundEnabledState(enabled);
      const v = videoRef.current;
      if (!v) return;
      try {
        v.muted = !enabled;
        setIsMutedLocal(v.muted);
        setVolumeLocal(typeof v.volume === 'number' ? v.volume : 1);
      } catch {
        // ignore
      }
    });
  }, []);

  const recordView = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      // Temporarily disable project views recording to avoid database errors
      console.log('Project view recording disabled temporarily');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-posts'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['project-views-count', project.id] });
    },
  });

  useEffect(() => {
    const el = cardContainerRef.current;
    if (!el) return;
    let recorded = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (recorded) return;
        recorded = true;
        recordView.mutate();
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [project.id]);

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  const openFullscreenFromCard = (v?: HTMLVideoElement | null) => {
    const video = v ?? videoRef.current;
    if (!primaryVideoUrl) return;
    try {
      video?.pause();
    } catch {
      // ignore
    }
    fullscreenVideo.open({
      initialUrl: primaryVideoUrl,
      initialTime: video?.currentTime ?? 0,
      muted: video?.muted ?? true,
    });
  };

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (v.paused) {
        setNowPlayingVideoId(`${instanceIdRef.current}:video`);
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
      setSoundEnabled(!v.muted);
    } catch {
      // ignore
    }
  };

  const increaseVolume = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = Math.min(1, (v.volume || 0) + 0.1);
    changeVolumeLocal(next);
  };

  const decreaseVolume = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = Math.max(0, (v.volume || 0) - 0.1);
    changeVolumeLocal(next);
  };

  // Get all images from media_urls or use image_url as fallback, but filter out videos
  const isVideoUrl = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.m4v'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some((ext) => lowerUrl.includes(ext));
  };

  // Priorizar demo_url si existe, luego filtrar media_urls para separar imágenes de videos
  const videoUrl = project.demo_url;
  const allMediaUrls = project.media_urls || [];
  
  // Separar imágenes y videos
  const imageUrls = allMediaUrls.filter(url => !isVideoUrl(url));
  const videoUrls = allMediaUrls.filter(url => isVideoUrl(url));
  
  // Usar video_url principal si existe, o el primer video de media_urls
  const primaryVideoUrl = videoUrl || videoUrls[0];

  const { data: viewers } = useQuery({
    queryKey: ['project-viewers', project.id],
    queryFn: async () => {
      console.log('Project viewers query disabled temporarily');
      return [];
    },
    enabled: false, // Temporarily disabled
  });
  
  // Para imágenes: usar image_url si no hay imágenes en media_urls
  const projectImages = imageUrls.length > 0 
    ? imageUrls 
    : project.image_url 
      ? [project.image_url] 
      : [];

  const changeVolumeLocal = (next: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.min(1, Math.max(0, next));
    try {
      v.volume = clamped;
      setVolumeLocal(clamped);
      if (clamped > 0 && v.muted) {
        v.muted = false;
        setIsMutedLocal(false);
        setSoundEnabled(true);
      }
      if (clamped === 0 && !v.muted) {
        v.muted = true;
        setIsMutedLocal(true);
        setSoundEnabled(false);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoadedMetadata = () => {
      setDuration(Number.isFinite(v.duration) ? v.duration : 0);
      try {
        const w = v.videoWidth || 1;
        const h = v.videoHeight || 1;
        setIsVerticalVideo(h / w >= 1.25);
      } catch {
        // ignore
      }
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
  }, [primaryVideoUrl]);

  useEffect(() => {
    return subscribeNowPlayingVideoId((id) => {
      if (!id) return;
      const prefix = `${instanceIdRef.current}:`;
      if (id.startsWith(prefix)) return;

      const v = videoRef.current;
      if (!v) return;
      try {
        v.pause();
        v.currentTime = 0;
        v.muted = true;
      } catch {
        // ignore
      }
    });
  }, []);

  const displayTechs = (project.technologies || []).slice(0, 4);
  const remainingTechsCount = (project.technologies || []).length - 4;

  // Auto-play video: in viewport (mobile/desktop) + hover (desktop)
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVideoInView(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.6 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [primaryVideoUrl]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const shouldPlay = isVideoInView || isVideoHovered;
    if (shouldPlay) {
      // Autoplay typically works only when muted
      // Start muted (autoplay-safe), then unmute after playback starts if global sound is enabled.
      el.muted = true;
      const t = window.setTimeout(() => {
        setNowPlayingVideoId(`${instanceIdRef.current}:video`);
        el
          .play()
          .then(() => {
            if (soundEnabled) {
              try {
                el.muted = false;
              } catch {
                // ignore
              }
            }
          })
          .catch(() => {});
      }, 50);
      return () => window.clearTimeout(t);
    } else {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        // ignore
      }
    }
  }, [isVideoHovered, isVideoInView, soundEnabled]);

  const toggleCardVideoMute = () => {
    const v = videoRef.current;
    const nextEnabled = !soundEnabled;
    setSoundEnabled(nextEnabled);
    if (!v) return;
    try {
      v.muted = !nextEnabled;
      if (nextEnabled) {
        setNowPlayingVideoId(`${instanceIdRef.current}:video`);
        v.play().catch(() => {});
      }
    } catch {
      // ignore
    }
  };

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
        <div ref={cardContainerRef} className="flex flex-col md:flex-row">
          {/* Project Image/Video - Left Side */}
          <div className="relative md:w-2/5 aspect-[16/9] md:aspect-auto bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden">
            {primaryVideoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={primaryVideoUrl}
                  muted
                  loop
                  playsInline
                  className={
                    isVerticalVideo
                      ? "relative z-10 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-pointer"
                      : "relative z-10 w-full h-full object-contain transition-transform duration-700 cursor-pointer"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    openFullscreenFromCard(videoRef.current);
                  }}
                  onMouseEnter={() => setIsVideoHovered(true)}
                  onMouseLeave={() => setIsVideoHovered(false)}
                />

                {/* Player bar (estilo Facebook) */}
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
                        openFullscreenFromCard(videoRef.current);
                      }}
                      aria-label="Pantalla completa"
                    >
                      <Maximize className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
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
                <MediaRenderer
                  url={projectImages[0]}
                  alt={project.title}
                  className="relative z-10 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-pointer"
                  stopPropagationOnClick
                  onClick={() => {
                    // Keep behavior identical to previous img onClick
                    if (primaryVideoUrl) return;
                    if (projectImages.length > 0) {
                      setShowImageGallery(true);
                      setCurrentImageIndex(0);
                    }
                  }}
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

          {/* Academic Badge - Top Right (below collaboration if present) */}
          {project.is_academic && (
            <div className={`absolute top-3 z-30 ${project.seeking_collaborators ? 'top-14 right-3' : 'right-3'}`}>
              <AcademicBadge />
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
          <div className={`absolute right-3 z-50 ${primaryVideoUrl ? 'bottom-14' : 'bottom-3'}`}>
            <button
              type="button"
              className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-3 py-1.5 text-white text-xs font-medium hover:bg-black/70 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowViewers(true);
              }}
            >
              <Eye size={12} className="opacity-80" />
              <span>{(project.views_count || 0).toLocaleString()}</span>
            </button>
          </div>
        </div>

        {/* Content - Right Side */}
        <div className="flex-1 p-6 space-y-4">
          {/* Title */}
          <h3 className="font-bold text-2xl text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-300 leading-tight">
            {project.title || 'Proyecto sin título'}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground text-sm leading-relaxed">
            {expanded 
              ? (project.description || 'Sin descripción disponible') 
              : (project.short_description || project.description || 'Sin descripción disponible')
            }
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
                  {(project.technologies || []).map((tech, index) => (
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
                    {(project.team_members || []).map((member, index) => (
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
                    {formatDistanceToNow(new Date(project.created_at || Date.now()), { 
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

    <Dialog open={showViewers} onOpenChange={setShowViewers}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Visto por</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {isLoadingViewers ? (
            <div className="text-sm text-muted-foreground">Cargando...</div>
          ) : viewers.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {viewers.map((viewer) => (
                <div key={viewer.viewer_id} className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={viewer.avatar_url || undefined} />
                    <AvatarFallback>
                      {viewer.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{viewer.username || 'Usuario'}</div>
                    <div className="text-xs text-muted-foreground">
                      {viewer.viewed_at
                        ? formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true, locale: es })
                        : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Aún no hay vistas registradas.</div>
          )}
        </div>
        <DialogDescription className="sr-only">Descripción del diálogo</DialogDescription>
</DialogContent>
    </Dialog>

    {/* Image Gallery Dialog */}
    <Dialog open={showImageGallery} onOpenChange={setShowImageGallery}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader>
          <DialogTitle className="sr-only">Galería de imágenes del proyecto</DialogTitle>
        </DialogHeader>
        <div className="relative">
          {/* Close button */}
          <button
            onClick={() => setShowImageGallery(false)}
            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
          >
            <X size={20} />
          </button>

          {/* Image display */}
          <div className="relative bg-black">
            <img
              src={projectImages[currentImageIndex]}
              alt={`${project.title} - Imagen ${currentImageIndex + 1}`}
              className="w-full h-auto max-h-[80vh] object-contain"
              loading="lazy"
              decoding="async"
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
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogDescription className="sr-only">Descripción del diálogo</DialogDescription>
</DialogContent>
    </Dialog>
    </>
  );
}
