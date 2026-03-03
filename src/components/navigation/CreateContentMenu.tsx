import { 
  Lightbulb, 
  FolderKanban, 
  Image, 
  Users, 
  Video 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/integrations/supabase/client";
import { CreatePostSheet } from "./CreatePostSheet";
import { usePostComposer } from "@/providers/PostComposerProvider";

interface CreateContentMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateContentMenu({ open, onOpenChange }: CreateContentMenuProps) {
  const navigate = useNavigate();
  const [selectedPostType, setSelectedPostType] = useState<string | null>(null);
  const { user } = useUser();
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [showPostSheet, setShowPostSheet] = useState(false);
  const { open: openComposer } = usePostComposer();

  useEffect(() => {
    let isMounted = true;

    const loadProfileAvatar = async () => {
      if (!user?.id) {
        if (isMounted) setProfileAvatarUrl(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (!isMounted) return;

      if (error) {
        setProfileAvatarUrl(null);
        return;
      }

      setProfileAvatarUrl(data?.avatar_url ?? null);
    };

    loadProfileAvatar();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleOptionClick = (option: string) => {
    onOpenChange(false);
    
    switch (option) {
      case 'media':
        setSelectedPostType(null);
        openComposer({
          userAvatar: profileAvatarUrl || (user?.user_metadata as any)?.avatar_url,
        });
        break;
      case 'idea':
        setSelectedPostType('idea');
        openComposer({
          initialPostType: 'idea' as any,
          userAvatar: profileAvatarUrl || (user?.user_metadata as any)?.avatar_url,
        });
        break;
      case 'project':
        setSelectedPostType('proyecto');
        openComposer({
          initialPostType: 'proyecto' as any,
          userAvatar: profileAvatarUrl || (user?.user_metadata as any)?.avatar_url,
        });
        break;
      case 'employment':
        setSelectedPostType('empleo');
        openComposer({
          initialPostType: 'empleo' as any,
          userAvatar: profileAvatarUrl || (user?.user_metadata as any)?.avatar_url,
        });
        break;
      case 'services':
        setSelectedPostType('servicios');
        openComposer({
          initialPostType: 'servicios' as any,
          userAvatar: profileAvatarUrl || (user?.user_metadata as any)?.avatar_url,
        });
        break;
      case 'group':
        toast({
          title: "Próximamente",
          description: "La función de crear grupos estará disponible pronto"
        });
        break;
      case 'story':
        navigate('/reels');
        toast({
          title: "Próximamente",
          description: "La función de crear historias/reels estará disponible pronto"
        });
        break;
    }
  };

  const menuOptions = [
    {
      id: 'idea',
      icon: Lightbulb,
      title: 'Compartir una idea',
      description: 'Cuéntala y encuentra gente que se sume',
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-500'
    },
    {
      id: 'project',
      icon: FolderKanban,
      title: 'Mostrar un proyecto',
      description: 'En curso o terminado, como tú quieras',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500'
    },
    {
      id: 'media',
      icon: Image,
      title: 'Foto o video',
      description: 'Comparte un momento o avance',
      iconBg: 'bg-pink-500/10',
      iconColor: 'text-pink-500'
    },
    {
      id: 'employment',
      icon: FolderKanban,
      title: 'Oferta de trabajo',
      description: 'Si estás buscando o tienes una vacante',
      iconBg: 'bg-sky-500/10',
      iconColor: 'text-sky-500'
    },
    {
      id: 'services',
      icon: Users,
      title: 'Servicios',
      description: 'Ofrece o busca ayuda puntual',
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-500'
    },
    {
      id: 'group',
      icon: Users,
      title: 'Crear Grupo',
      description: 'Arma un espacio para trabajar en equipo',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500'
    },
    {
      id: 'story',
      icon: Video,
      title: 'Crear Historia/Reel',
      description: 'Un video corto para compartir',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-500'
    }
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear contenido</DialogTitle>
            <DialogDescription>
              Elige una forma de compartir
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {menuOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                className="flex items-start p-3 rounded-lg hover:bg-accent transition-colors text-left w-full"
              >
                <div className={`p-2 rounded-lg ${option.iconBg} mr-3`}>
                  <option.icon className={`h-5 w-5 ${option.iconColor}`} />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{option.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <CreatePostSheet
        open={showPostSheet}
        onOpenChange={setShowPostSheet}
      />
    </>
  );
}
