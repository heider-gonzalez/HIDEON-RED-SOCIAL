import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Bookmark } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SavePostMenuItemProps {
  postId: string;
}

export function SavePostMenuItem({ postId }: SavePostMenuItemProps) {
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkIfSaved();
  }, [postId]);

  const checkIfSaved = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle();

      if (error) throw error;

      setIsSaved(!!data);
    } catch (error) {
      // Not saved
    }
  };

  const handleToggleSave = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Debes iniciar sesión"
        });
        return;
      }

      if (isSaved) {
        await supabase
          .from('saved_posts')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        
        setIsSaved(false);
        toast({
          title: "Publicación eliminada",
          description: "Se quitó de guardados"
        });
      } else {
        await supabase
          .from('saved_posts')
          .insert({ user_id: user.id, post_id: postId });
        
        setIsSaved(true);
        toast({
          title: "Publicación guardada",
          description: "Se guardó correctamente"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la publicación"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenuItem onClick={handleToggleSave} disabled={isLoading}>
      <Bookmark className={`mr-2 h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
      {isSaved ? 'Quitar guardado' : 'Guardar publicación'}
    </DropdownMenuItem>
  );
}
