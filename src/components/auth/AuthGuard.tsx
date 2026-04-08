
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
const [showFallback, setShowFallback] = useState(false);
  const [revalidating, setRevalidating] = useState(false);

  // Timeout fallback if loading takes too long
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ AuthGuard: Loading timeout reached, showing fallback');
        setShowFallback(true);
      }
    }, 3000); // 3 seconds timeout for better UX

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    if (loading || isAuthenticated || location.pathname === '/auth') return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const revalidateAndMaybeRedirect = async () => {
      try {
        setRevalidating(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (session) {
          // Session exists; let AuthProvider propagate it
          setRevalidating(false);
          return;
        }

        // Give auth listener a brief window before redirecting (mobile Safari quirks)
        timer = setTimeout(() => {
          if (!cancelled) {
            console.log('🛡️ AuthGuard: Confirmed no session, redirecting to /auth');
            navigate('/auth');
          }
        }, 500);
      } catch (e) {
        console.warn('🛡️ AuthGuard: Revalidation error, redirecting to /auth', e);
        navigate('/auth');
      } finally {
        if (!cancelled) setRevalidating(false);
      }
    };

    revalidateAndMaybeRedirect();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [loading, isAuthenticated, navigate, location.pathname]);

  if ((loading || revalidating) && !showFallback) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (showFallback && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Parece que hay un problema de conexión</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !loading && !revalidating && location.pathname !== '/auth') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
