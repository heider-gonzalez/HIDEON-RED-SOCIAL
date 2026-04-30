import type { Project } from '@/types/project';
import { ProjectCard } from '@/components/projects/ProjectCard';

type ProjectsListSectionProps = {
  isLoading: boolean;
  skeletonKeys: string[];
  filteredProjects: Project[];
  searchQuery: string;
  selectedCategory: string;
  onSelectProject: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
};

export function ProjectsListSection({
  isLoading,
  skeletonKeys,
  filteredProjects,
  searchQuery,
  selectedCategory,
  onSelectProject,
  onEdit,
  onDelete,
}: ProjectsListSectionProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 py-12">
      {isLoading ? (
        <div className="space-y-6">
          {skeletonKeys.map((key) => (
            <div key={key} className="animate-pulse">
              <div className="bg-muted rounded-xl h-56"></div>
            </div>
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="space-y-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onSelectProject(project)}
              onEdit={onEdit}
              onDelete={onDelete}
              expanded={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No se encontraron proyectos</h3>
          <p className="text-muted-foreground">
            {searchQuery || selectedCategory !== 'all'
              ? 'Intenta ajustar tus filtros de búsqueda'
              : 'Sé el primero en compartir un proyecto innovador'}
          </p>
        </div>
      )}
    </div>
  );
}
