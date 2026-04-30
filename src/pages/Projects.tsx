import React, { useMemo, useReducer } from 'react';
import { Helmet } from 'react-helmet-async';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectModal } from '@/components/projects/ProjectModal';
import { Layout } from '@/components/layout';
import { type Project } from '@/types/project';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { usePostComposer } from '@/providers/PostComposerProvider';

import { ProjectsHeaderSection } from '@/pages/projects/ProjectsHeaderSection';
import { ProjectsFiltersSection } from '@/pages/projects/ProjectsFiltersSection';
import { ProjectsListSection } from '@/pages/projects/ProjectsListSection';
import { DeleteConfirmationDialog } from '@/pages/projects/DeleteConfirmationDialog';
import { uiInitialState, uiReducer } from '@/pages/projects/projects-ui';
import { fetchProjectPosts, filterProjects, mapProjectPostsToProjects } from '@/pages/projects/projects-data';

export default function Projects() {
  const [ui, dispatch] = useReducer(uiReducer, uiInitialState);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { open: openComposer } = usePostComposer();

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await (await import('@/integrations/supabase/client')).supabase
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
      dispatch({ type: 'setDeleteConfirmProject', value: null });
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

  // Query para obtener SOLO publicaciones tipo proyecto
  const { data: projectPosts = [], isLoading } = useQuery({
    queryKey: ['project-posts', ui.selectedStatus, ui.institutionName],
    queryFn: async () => fetchProjectPosts({ selectedStatus: ui.selectedStatus, institutionName: ui.institutionName }),
  });

  // Convertir posts a formato Project (solo post_type=project)
  const projects: Project[] = useMemo(() => mapProjectPostsToProjects(projectPosts as any[], user?.id || null), [projectPosts, user?.id]);

  const filteredProjects = useMemo(
    () => filterProjects({ projects, searchQuery: ui.searchQuery, selectedCategory: ui.selectedCategory }),
    [projects, ui.searchQuery, ui.selectedCategory]
  );

  const skeletonKeys = useMemo(() => {
    return Array.from({ length: 4 }, (_v, idx) => `skeleton-${idx}`);
  }, []);

  const handleEditProject = (project: Project) => {
    dispatch({ type: 'setEditingProject', value: project });
    openComposer({ initialPostType: 'proyecto', editingProject: project });
  };

  const handleDeleteProject = (projectId: string) => {
    dispatch({ type: 'setDeleteConfirmProject', value: projectId });
  };

  const confirmDeleteProject = () => {
    if (ui.deleteConfirmProject) {
      deleteProjectMutation.mutate(ui.deleteConfirmProject);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Proyectos e Innovación - HIDEON</title>
          <meta name="description" content="Explora e inspírate con ideas innovadoras de proyectos" />
        </Helmet>

        <ProjectsHeaderSection onCreate={() => openComposer({ initialPostType: 'proyecto' })} />
        <ProjectsFiltersSection
          searchQuery={ui.searchQuery}
          institutionName={ui.institutionName}
          selectedCategory={ui.selectedCategory}
          selectedStatus={ui.selectedStatus}
          onSearchChange={(value) => dispatch({ type: 'setSearchQuery', value })}
          onInstitutionChange={(value) => dispatch({ type: 'setInstitutionName', value })}
          onCategoryChange={(value) => dispatch({ type: 'setSelectedCategory', value })}
          onStatusChange={(value) => dispatch({ type: 'setSelectedStatus', value })}
        />
        <ProjectsListSection
          isLoading={isLoading}
          skeletonKeys={skeletonKeys}
          filteredProjects={filteredProjects}
          searchQuery={ui.searchQuery}
          selectedCategory={ui.selectedCategory}
          onSelectProject={(project) => dispatch({ type: 'setSelectedProject', value: project })}
          onEdit={handleEditProject}
          onDelete={handleDeleteProject}
        />

        {/* Modals */}
        {ui.selectedProject && (
          <ProjectModal
            project={ui.selectedProject}
            open={!!ui.selectedProject}
            onOpenChange={(open) => !open && dispatch({ type: 'setSelectedProject', value: null })}
          />
        )}

        <DeleteConfirmationDialog
          open={!!ui.deleteConfirmProject}
          onOpenChange={(open) => !open && dispatch({ type: 'setDeleteConfirmProject', value: null })}
          onCancel={() => dispatch({ type: 'setDeleteConfirmProject', value: null })}
          onConfirm={confirmDeleteProject}
          isPending={deleteProjectMutation.isPending}
        />
      </div>
    </Layout>
  );
}