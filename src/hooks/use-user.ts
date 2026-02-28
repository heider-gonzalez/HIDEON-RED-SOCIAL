import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  signOut: () => Promise<{ error: Error | null }>;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Obtener la sesión actual al cargar el hook
    const getInitialSession = async () => {
      try {
        setIsLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('Error al obtener la sesión:', err);
        setError(err instanceof Error ? err : new Error('Error al obtener la sesión'));
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        // Limpiar errores cuando hay un cambio de autenticación exitoso
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          setError(null);
        }
      }
    );

    // Limpiar la suscripción al desmontar el componente
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async (): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Limpiar el estado local
      setUser(null);
      return { error: null };
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      const error = err instanceof Error ? err : new Error('Error al cerrar sesión');
      setError(error);
      return { error };
    }
  };

  return {
    user,
    isLoading,
    error,
    signOut,
  };
}
