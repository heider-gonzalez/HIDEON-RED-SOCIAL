import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Lightbulb, Rocket, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { usePostComposer } from "@/providers/PostComposerProvider";

export function QuickPostBox({ initialContent = '', initialMedia = null, initialMediaType = null }: { initialContent?: string; initialMedia?: File | null; initialMediaType?: string | null } = {}) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ avatar_url: string | null; username: string } | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { open } = usePostComposer();

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    setError(false);
    const fetchProfile = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('avatar_url, username, created_at')
          .eq('id', user.id)
          .single();
        if (data) {
          setProfile(data);
          // Check if user is new (less than 24 hours old)
          const createdAt = new Date((data as any).created_at);
          const now = new Date();
          const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          setIsNewUser(hoursDiff < 24);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id]);


  if (!user) return null;

  // Fallback si falla la carga del perfil
  if (error || !profile) {
    return (
      <div className="mx-auto w-full max-w-[680px]">
        <Card className="mb-3 overflow-hidden w-full rounded-16px border border-border/30 bg-card shadow-md transition-colors duration-200 ease-out hover:bg-muted/[0.18] dark:border-white/10 relative">
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-muted text-muted-foreground font-medium">?</AvatarFallback>
            </Avatar>
            <button
              className="flex-1 px-4 py-2.5 text-left rounded-full border border-border bg-muted/30 text-muted-foreground text-sm cursor-not-allowed"
              disabled
            >
              ¿Qué idea tienes en mente?
            </button>
            <Button size="sm" variant="ghost" className="h-8 px-3 rounded-full text-xs opacity-60" disabled>
              <Lightbulb className="h-3 w-3 mr-1" /> Idea
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-3 rounded-full text-xs opacity-60" disabled>
              <Rocket className="h-3 w-3 mr-1" /> Proyecto
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="mx-auto w-full max-w-[680px]">
        <Card className="mb-3 overflow-hidden w-full rounded-16px border border-border/30 bg-card shadow-md transition-colors duration-200 ease-out hover:bg-muted/[0.18] dark:border-white/10 relative">
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
                onClick={() => open({
                  userAvatar: profile.avatar_url || undefined,
                  initialContent,
                  initialMedia,
                  initialMediaType,
                })}
                className="flex-1 px-4 py-2.5 text-left rounded-full border border-border hover:bg-muted/50 transition-colors text-muted-foreground text-sm"
              >
                ¿Qué idea tienes en mente?
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
            <Button
              onClick={() => open({
                userAvatar: profile.avatar_url || undefined,
                initialPostType: 'idea',
                initialContent,
                initialMedia,
                initialMediaType,
              })}
              size="sm"
              variant="ghost"
              className="h-8 px-3 rounded-full text-xs"
            >
              <Lightbulb className="h-3 w-3 mr-1" />
              Idea
            </Button>
            <Button
              onClick={() => open({
                userAvatar: profile.avatar_url || undefined,
                initialPostType: 'proyecto',
                initialContent,
                initialMedia,
                initialMediaType,
              })}
              size="sm"
              variant="ghost"
              className="h-8 px-3 rounded-full text-xs"
            >
              <Rocket className="h-3 w-3 mr-1" />
              Proyecto
            </Button>
          </div>
          </div>
        </Card>
        
      </div>
    </TooltipProvider>
  );
}
