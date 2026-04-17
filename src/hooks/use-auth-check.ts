
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAuthUser } from "@/lib/auth/auth-store";

export function useAuthCheck() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const checkAuth = () => {
      const user = getAuthUser();
      setIsAuthenticated(!!user);
      
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: "Debes iniciar sesión para acceder",
        });
      }
    };
    
    checkAuth();
    
    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [toast]);
  
  return { isAuthenticated };
}
