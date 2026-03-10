
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditPostDialog } from "@/components/post/dialogs/EditPostDialog";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

interface AuthorPostOptionsMenuProps {
  postId: string;
  postType?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

export function AuthorPostOptionsMenu({ postId, postType, onEdit, onDelete, canDelete = true }: AuthorPostOptionsMenuProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleDeletePost = async () => {
    if (!canDelete) return;
    try {
      const { deletePost } = await import('@/lib/api');
      await deletePost(postId);
      
      toast({
        title: "Post eliminado",
        description: "Tu post ha sido eliminado exitosamente",
      });
      
      // Notify parent if provided, otherwise navigate home
      if (onDelete) {
        onDelete();
      } else {
        navigate("/");
      }

      queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["personalized-feed"] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["project-posts"] });
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el post. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  const handleEditPost = async (content?: string, projectData?: any) => {
    try {
      const { updatePost } = await import("@/lib/api/posts");
      
      const params: any = { postId };
      if (content) params.content = content;
      if (projectData) params.projectData = projectData;
      
      const result = await updatePost(params);
      
      if (result.success) {
        toast({
          title: postType === 'project' || postType === 'proyecto' ? "Proyecto actualizado" : "Publicación actualizada",
          description: postType === 'project' || postType === 'proyecto' 
            ? "Tu proyecto ha sido actualizado exitosamente."
            : "Tu publicación ha sido actualizada exitosamente.",
        });
        setEditDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
        queryClient.invalidateQueries({ queryKey: ["ideas"] });
        queryClient.invalidateQueries({ queryKey: ["project-posts"] });
        if (onEdit) {
          onEdit();
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo actualizar la publicación. Inténtalo de nuevo.",
        });
      }
    } catch (error) {
      console.error("Error updating post:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la publicación. Inténtalo de nuevo.",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </DropdownMenuItem>
          {canDelete && (
            <DropdownMenuItem onClick={handleDeletePost}>
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Show appropriate dialog based on post type */}
      {postType === 'project' || postType === 'proyecto' ? (
        <EditProjectDialog
          projectId={postId}
          isOpen={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={(projectData) => handleEditPost(undefined, projectData)}
        />
      ) : (
        <EditPostDialog
          postId={postId}
          isOpen={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={(content) => handleEditPost(content)}
        />
      )}
    </>
  );
}

