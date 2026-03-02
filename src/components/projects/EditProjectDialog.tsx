import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { X, Plus } from "lucide-react";

interface EditProjectDialogProps {
  projectId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (projectData: any) => void;
}

export function EditProjectDialog({ projectId, isOpen, onOpenChange, onSave }: EditProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [projectData, setProjectData] = useState({
    title: "",
    description: "",
    objectives: "",
    technologies: [] as string[],
    demo_url: "",
    github_url: "",
    project_status: "idea" as "idea" | "in_progress" | "completed",
    seeking_collaborators: false
  });
  const [techInput, setTechInput] = useState("");

  useEffect(() => {
    if (isOpen && projectId) {
      const loadProject = async () => {
        try {
          setIsLoading(true);
          const { data } = await (supabase as any)
            .from("posts")
            .select(`
              content,
              post_metadata,
              project_status,
              demo_url,
              github_url,
              author_id,
              profiles!posts_author_id_fkey (
                username,
                full_name,
                avatar_url
              )
            `)
            .eq("id", projectId)
            .single();
          
          if (data) {
            // Extraer datos del post_metadata si existe
            const metadata = data.post_metadata as any || {};
            const proyecto = metadata.proyecto || metadata.project || {};
            
            console.log('Datos del proyecto cargados:', {
              metadata,
              proyecto,
              data
            });
            
            setProjectData({
              title: proyecto.title || data.content?.split('\n')[0] || "",
              description: proyecto.description || data.content || "",
              objectives: proyecto.objectives || "",
              technologies: Array.isArray(proyecto.technologies) ? proyecto.technologies : 
                         Array.isArray(proyecto.required_skills) ? proyecto.required_skills : [],
              demo_url: data.demo_url || proyecto.demo_url || "",
              github_url: data.github_url || proyecto.github_url || "",
              project_status: data.project_status || proyecto.status || "idea",
              seeking_collaborators: proyecto.seeking_collaborators || false
            });
          }
        } catch (error) {
          console.error("Error loading project:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadProject();
    }
  }, [isOpen, projectId]);

  const handleAddTech = () => {
    if (techInput.trim() && !projectData.technologies.includes(techInput.trim())) {
      setProjectData(prev => ({
        ...prev,
        technologies: [...prev.technologies, techInput.trim()]
      }));
      setTechInput("");
    }
  };

  const handleRemoveTech = (techToRemove: string) => {
    setProjectData(prev => ({
      ...prev,
      technologies: prev.technologies.filter(tech => tech !== techToRemove)
    }));
  };

  const handleSave = () => {
    onSave(projectData);
    onOpenChange(false);
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando proyecto...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Proyecto</DialogTitle>
          <DialogDescription>
            Modifica la información de tu proyecto.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Título */}
          <div>
            <label className="text-sm font-medium mb-2 block">Título del Proyecto</label>
            <Input
              value={projectData.title}
              onChange={(e) => setProjectData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ingresa el título de tu proyecto"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-sm font-medium mb-2 block">Descripción</label>
            <Textarea
              value={projectData.description}
              onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe tu proyecto en detalle"
              className="min-h-[120px]"
            />
          </div>

          {/* Objetivos */}
          <div>
            <label className="text-sm font-medium mb-2 block">Objetivos</label>
            <Textarea
              value={projectData.objectives}
              onChange={(e) => setProjectData(prev => ({ ...prev, objectives: e.target.value }))}
              placeholder="¿Qué objetivos quieres alcanzar con este proyecto?"
              className="min-h-[100px]"
            />
          </div>

          {/* Estado del Proyecto */}
          <div>
            <label className="text-sm font-medium mb-2 block">Estado del Proyecto</label>
            <Select
              value={projectData.project_status}
              onValueChange={(value: "idea" | "in_progress" | "completed") => 
                setProjectData(prev => ({ ...prev, project_status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="idea">Idea</SelectItem>
                <SelectItem value="in_progress">En Desarrollo</SelectItem>
                <SelectItem value="completed">Terminado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tecnologías */}
          <div>
            <label className="text-sm font-medium mb-2 block">Tecnologías</label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  placeholder="Agregar tecnología"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTech())}
                />
                <Button type="button" onClick={handleAddTech} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {projectData.technologies.map((tech) => (
                  <Badge key={tech} variant="secondary" className="flex items-center gap-1">
                    {tech}
                    <button
                      type="button"
                      onClick={() => handleRemoveTech(tech)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* URLs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">URL de Demo</label>
              <Input
                value={projectData.demo_url}
                onChange={(e) => setProjectData(prev => ({ ...prev, demo_url: e.target.value }))}
                placeholder="https://demo.ejemplo.com"
                type="url"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">URL de GitHub</label>
              <Input
                value={projectData.github_url}
                onChange={(e) => setProjectData(prev => ({ ...prev, github_url: e.target.value }))}
                placeholder="https://github.com/usuario/repo"
                type="url"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
