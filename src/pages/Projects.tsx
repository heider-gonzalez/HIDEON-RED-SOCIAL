import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectModal } from '@/components/projects/ProjectModal';
import { Layout } from '@/components/layout';
import { PROJECT_CATEGORIES, type Project } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ModalPublicacionWeb from '@/components/ModalPublicacionWeb';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

export default function Projects() {
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Proyecto eliminado",
        description: "El proyecto ha sido eliminado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['project-posts'] });
      setDeleteConfirmProject(null);
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el proyecto. Intenta de nuevo.",
        variant: "destructive",
      });
      console.error('Delete project error:', error);
    }
  });

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowPostModal(true);
  };

  const handleDeleteProject = (projectId: string) => {
    setDeleteConfirmProject(projectId);
  };

  const confirmDeleteProject = () => {
    if (deleteConfirmProject) {
      deleteProjectMutation.mutate(deleteConfirmProject);
    }
  };

  // Query para obtener SOLO publicaciones tipo proyecto
  const { data: projectPosts = [], isLoading } = useQuery({
    queryKey: ['project-posts', selectedStatus],
    queryFn: async () => {
      console.log('🔍 Debug: Starting projects query...');
      
      let projectsQuery = supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq('post_type', 'project')
        .order('updated_at', { ascending: false });

      if (selectedStatus !== 'all') {
        projectsQuery = projectsQuery.eq('project_status', selectedStatus);
      }

      const result = await projectsQuery;
      console.log('🔍 Debug: Query result:', { 
        data: result.data, 
        error: result.error,
        count: result.data?.length 
      });
      
      if (result.error) {
        console.error('🔍 Debug: Query error:', result.error);
        throw result.error;
      }
      
      // Get reactions separately for each post
      const posts = result.data || [];
      const postIds = posts.map((p: any) => p.id);
      
      if (postIds.length === 0) return [];
      
      const { data: reactionsData } = await (supabase as any)
        .from('reactions')
        .select('post_id, id, user_id, reaction_type, created_at')
        .in('post_id', postIds);
      
      // Get comments count for each post
      const { data: commentsData } = await supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds);
      
      // Group reactions by post_id
      const reactionsByPost = reactionsData?.reduce((acc: any, reaction: any) => {
        if (!acc[reaction.post_id]) {
          acc[reaction.post_id] = [];
        }
        acc[reaction.post_id].push(reaction);
        return acc;
      }, {}) || {};
      
      // Count comments by post_id
      const commentsCountByPost = commentsData?.reduce((acc: any, comment: any) => {
        acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
        return acc;
      }, {}) || {};
      
      // Attach reactions and comments count to posts
      const postsWithReactions = posts.map((post: any) => ({
        ...post,
        reactions: reactionsByPost[post.id] || [],
        comments_count: commentsCountByPost[post.id] || 0
      }));
      
      return postsWithReactions as any[];
    }
  });

  // Convertir posts a formato Project (solo post_type=project)
  const projects: Project[] = useMemo(() => {
    console.log('🔍 Debug: projectPosts received:', projectPosts.length);
    
    // Si no hay proyectos, mostrar mensaje de debug
    if (!projectPosts || projectPosts.length === 0) {
      console.log('🔍 Debug: No projects found, adding demo projects...');
      // Añadir proyectos de demo para testing
      return [
        {
          id: 'demo-project-1',
          title: 'Proyecto Demo 1 - Red Social Universitaria',
          description: 'Una plataforma innovadora para conectar estudiantes universitarios con intereses similares y facilitar la colaboración en proyectos académicos.',
          short_description: 'Plataforma para conectar estudiantes universitarios',
          objectives: 'Crear una red social que permita a los estudiantes colaborar en proyectos, compartir recursos y formar grupos de estudio',
          status: 'development' as const,
          category: 'Desarrollo Web',
          technologies: ['React', 'Node.js', 'TypeScript', 'Tailwind CSS'],
          tags: [],
          is_open_source: true,
          seeking_collaborators: true,
          author_id: 'demo-user-1',
          author: {
            id: 'demo-user-1',
            username: 'DemoStudent',
            avatar_url: null
          },
          team_members: ['Ana García', 'Carlos Rodríguez'],
          contact_email: 'demo@hsocial.com',
          additional_links: [],
          likes_count: 42,
          comments_count: 15,
          views_count: 128,
          image_url: undefined,
          media_urls: [],
          video_url: undefined,
          demo_url: 'https://demo.hsocial.com',
          github_url: 'https://github.com/demo/hsocial',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_reaction: null
        },
        {
          id: 'demo-project-2',
          title: 'Proyecto Demo 2 - App de Gestión de Tareas',
          description: 'Aplicación móvil para ayudar a los estudiantes a organizar sus tareas académicas, fechas de entrega y recordatorios importantes.',
          short_description: 'App móvil para gestión de tareas académicas',
          objectives: 'Desarrollar una aplicación intuitiva que ayude a los estudiantes a mejorar su productividad y organización académica',
          status: 'planning' as const,
          category: 'Aplicaciones Móviles',
          technologies: ['React Native', 'Firebase', 'Redux', 'Expo'],
          tags: [],
          is_open_source: false,
          seeking_collaborators: true,
          author_id: 'demo-user-2',
          author: {
            id: 'demo-user-2',
            username: 'TechStudent',
            avatar_url: null
          },
          team_members: ['María López'],
          contact_email: 'demo2@hsocial.com',
          additional_links: [],
          likes_count: 28,
          comments_count: 8,
          views_count: 95,
          image_url: undefined,
          media_urls: [],
          video_url: undefined,
          demo_url: 'https://demo-tasks.hsocial.com',
          github_url: 'https://github.com/demo/task-manager',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_reaction: null
        }
      ];
    }
    
    console.log('🔍 Debug: sample post data:', projectPosts.slice(0, 2).map((p: any) => ({
      id: p.id,
      post_type: p.post_type,
      idea: p.idea,
      project_showcases: p.project_showcases,
      media_urls: p.media_urls,
      profiles: p.profiles
    })));
    
    return (projectPosts as any[]).map((post: any) => {
      const idea = post.idea || {};
      
      // Find user's reaction for this post
      const userReaction = post.reactions?.find((reaction: any) => reaction.user_id === user?.id)?.reaction_type || null;
      
      // Count total reactions
      const reactionCount = post.reactions?.length || 0;
      
      console.log('🔍 Debug: Post reactions:', {
        postId: post.id,
        reactions: post.reactions,
        reactionCount,
        userReaction,
        currentUserId: user?.id
      });
      
      // Extraer video_url de project_showcases
      const projectShowcase = post.project_showcases && post.project_showcases[0];
      const videoUrl = projectShowcase?.video_url || post.video_url;
      
      return {
        id: post.id,
        title: idea.title || 'Sin título',
        description: idea.description || post.content || '',
        short_description: idea.description?.substring(0, 150) || '',
        objectives: idea.expected_impact || '',
        status: post.project_status === 'in_progress' ? 'development' : 
                post.project_status === 'completed' ? 'completed' : 'planning',
        category: idea.category || 'Otro',
        technologies: idea.resources_needed || [],
        tags: [],
        is_open_source: false,
        seeking_collaborators: post.project_status === 'in_progress',
        author_id: post.user_id,
        author: post.profiles ? {
          id: post.profiles.id,
          username: post.profiles.username || 'Usuario',
          avatar_url: post.profiles.avatar_url
        } : undefined,
        team_members: [],
        contact_email: '',
        additional_links: [],
        likes_count: reactionCount,
        comments_count: post.comments_count || 0,
        views_count: 0,
        image_url: post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : undefined,
        media_urls: post.media_urls || [],
        video_url: videoUrl, // Agregar video_url
        demo_url: projectShowcase?.demo_url, // Agregar demo_url
        github_url: projectShowcase?.github_url, // Agregar github_url
        created_at: post.created_at,
        updated_at: post.updated_at,
        user_reaction: userReaction, // Add user reaction
        reactions: post.reactions || [] // Add reactions array for ReactionButtons!
      };
    });
  }, [projectPosts, user]);

  const filteredProjects = projects?.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.technologies.some(tech => tech.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }) || [];

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Proyectos Universitarios - HIDEON</title>
          <meta name="description" content="Explora e inspírate con ideas innovadoras de proyectos universitarios" />
        </Helmet>

        {/* Header Section */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="text-center lg:text-left">
                <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                  Proyectos Universitarios
                </h1>
                <p className="text-lg opacity-90">
                  Explora e inspírate con ideas innovadoras
                </p>
              </div>
              <Button
                onClick={() => setShowPostModal(true)}
                className="bg-white text-primary hover:bg-gray-100 font-semibold px-6 py-3 rounded-lg flex items-center gap-2 self-center lg:self-auto"
              >
                <Plus size={20} />
                Crear
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-card border-b border-border text-foreground dark:text-foreground">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  placeholder="Buscar proyectos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 py-3 rounded-lg border-2 focus:border-primary bg-background text-foreground"
                />
              </div>
              
              {/* Category Filter */}
              <div className="flex items-center gap-2 md:w-64">
                <Filter className="text-muted-foreground" size={20} />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="rounded-lg border-2">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {PROJECT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 md:w-48">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="rounded-lg border-2">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="in_progress">🚀 En Desarrollo</SelectItem>
                    <SelectItem value="completed">✅ Completados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Projects List - Single Column */}
        <div className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="max-w-5xl mx-auto space-y-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted rounded-xl h-56"></div>
                </div>
              ))}
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="max-w-5xl mx-auto space-y-6">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => setSelectedProject(project)}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteProject}
                  expanded={true} // Show expanded view by default
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No se encontraron proyectos
              </h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory !== 'all' 
                  ? 'Intenta ajustar tus filtros de búsqueda'
                  : 'Sé el primero en compartir un proyecto innovador'
                }
              </p>
            </div>
          )}
        </div>

        {/* Modals */}
        <ModalPublicacionWeb
          isVisible={showPostModal}
          onClose={() => {
            setShowPostModal(false);
            setEditingProject(null);
          }}
          initialPostType={'proyecto'}
          editingProject={editingProject}
        />
        
        {selectedProject && (
          <ProjectModal
            project={selectedProject}
            open={!!selectedProject}
            onOpenChange={(open) => !open && setSelectedProject(null)}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmProject} onOpenChange={(open) => !open && setDeleteConfirmProject(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar proyecto?</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer. El proyecto será eliminado permanentemente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmProject(null)}
                disabled={deleteProjectMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteProject}
                disabled={deleteProjectMutation.isPending}
              >
                {deleteProjectMutation.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}