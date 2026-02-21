import { useState, useCallback, useEffect, createElement } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { normalizeReactionType, reactionIcons } from "@/components/post/reactions/ReactionIcons";
import type { ReactionType } from "@/types/database/social.types";

interface CommentReactionsProps {
  commentId: string;
  userReaction: ReactionType | null;
  reactionsCount: number;
  onReaction: (commentId: string) => void;
}

export function CommentReactions({ 
  commentId, 
  userReaction, 
  reactionsCount, 
  onReaction 
}: CommentReactionsProps) {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const normalizedUserReaction = userReaction ? normalizeReactionType(userReaction) : null;
  const iconType = normalizedUserReaction || "love";
  
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setIsAuthenticated(!!data.session);
      } catch (error) {
        console.error("Error checking authentication:", error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuthStatus();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  const checkAuth = useCallback(async () => {
    if (isAuthenticated === false) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión para reaccionar",
      });
      return false;
    }
    
    try {
      const { data } = await supabase.auth.getSession();
      const hasSession = !!data.session;
      
      if (isAuthenticated !== hasSession) {
        setIsAuthenticated(hasSession);
      }
      
      if (!hasSession) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Debes iniciar sesión para reaccionar",
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking authentication:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al verificar tu sesión. Intenta de nuevo.",
      });
      return false;
    }
  }, [isAuthenticated, toast]);
  
  const handleReactionClick = useCallback(async () => {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
      onReaction(commentId);
    }
  }, [checkAuth, commentId, onReaction]);
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-auto p-0 text-xs ${userReaction ? 'text-red-500' : 'text-muted-foreground'}`}
      onClick={handleReactionClick}
    >
      {userReaction ? 
        <div className="text-red-500">
          {createElement(reactionIcons[iconType].icon, { className: "h-3 w-3" })}
        </div> : 
        <div className="text-muted-foreground">
          {createElement(reactionIcons[iconType].icon, { className: "h-3 w-3" })}
        </div>
      }
      <span className="ml-1">{reactionsCount}</span>
    </Button>
  );
}
