import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Image, Video, PlusSquare, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ModalPublicacionWeb from "@/components/ModalPublicacionWeb";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function QuickPostBox({ initialContent = '', initialMedia = null, initialMediaType = null }: { initialContent?: string; initialMedia?: File | null; initialMediaType?: string | null } = {}) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ avatar_url: string | null; username: string } | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, username, created_at')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setProfile(data);
        // Check if user is new (less than 24 hours old)
        const createdAt = new Date(data.created_at);
        const now = new Date();
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        setIsNewUser(hoursDiff < 24);
      }
    };

    fetchProfile();
  }, [user?.id]);

  if (!user || !profile) return null;

  return (
    <TooltipProvider>
      <div className="mx-auto w-full max-w-[680px] px-2 lg:px-0">
        <Card className="mb-3 rounded-xl border border-border/60 bg-card shadow-sm relative">
          {isNewUser && (
            <div className="absolute -top-2 -right-2 z-10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-primary text-primary-foreground rounded-full p-2 animate-pulse cursor-pointer">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="font-medium">Tu primer post empieza aquí</p>
                  <p className="text-sm text-muted-foreground">Puede ser una idea, un avance o una pregunta. Sin presión.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          <div className="flex items-center gap-3 px-4 py-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="bg-muted text-muted-foreground font-medium">
              {profile.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <Tooltip open={isNewUser ? undefined : false}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowPostModal(true)}
                className="flex-1 px-4 py-2.5 text-left rounded-full border border-border hover:bg-muted/50 transition-colors text-muted-foreground text-sm"
              >
                {isNewUser 
                  ? `¿Qué quieres compartir hoy, ${profile.username}?` 
                  : `¿Qué quieres compartir hoy, ${profile.username}?`}
              </button>
            </TooltipTrigger>
            {isNewUser && (
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">Una buena forma de empezar</p>
                <p className="text-sm text-muted-foreground">Di en qué andas o qué estás buscando, y la gente te encuentra.</p>
              </TooltipContent>
            )}
          </Tooltip>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPostModal(true)}
              className="h-10 w-10 rounded-full hover:bg-muted/50 transition-colors flex items-center justify-center"
              aria-label="Video"
              title="Video"
            >
              <Video className="h-5 w-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowPostModal(true)}
              className="h-10 w-10 rounded-full hover:bg-muted/50 transition-colors flex items-center justify-center"
              aria-label="Foto"
              title="Foto"
            >
              <Image className="h-5 w-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowPostModal(true)}
              className="h-10 w-10 rounded-full hover:bg-muted/50 transition-colors flex items-center justify-center"
              aria-label="Más"
              title="Más"
            >
              <PlusSquare className="h-5 w-5 text-primary" />
            </button>
          </div>
          </div>
        </Card>
        
        {showPostModal && (
          <ModalPublicacionWeb
            isVisible={showPostModal}
            isOpen={showPostModal}
            onClose={() => setShowPostModal(false)}
            userAvatar={profile.avatar_url}
            initialContent={initialContent}
            initialMedia={initialMedia}
            initialMediaType={initialMediaType}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
