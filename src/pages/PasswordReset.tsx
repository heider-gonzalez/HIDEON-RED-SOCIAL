import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { RecoveryTokenHandler } from '@/components/auth/RecoveryTokenHandler';
import { SEOHead } from '@/utils/safe-seo';

export default function PasswordReset() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // SEO data for react-helmet-async
  const seoData = {
    title: 'Restablecer contraseña | HIDEON',
    description: 'Restablece tu contraseña en HIDEON.',
    canonical: `${window.location.origin}/password-reset`,
    robots: 'noindex,nofollow'
  };

  useEffect(() => {
    const validateToken = async () => {
      try {
        setIsValidating(true);
        
        // Get hash from URL or current location
        let hashFragment = window.location.hash;
        
        // If no hash, check if we were redirected with hash in the URL
        if (!hashFragment && window.location.href.includes('#')) {
          hashFragment = '#' + window.location.href.split('#')[1];
        }
        
        console.log('🔍 PasswordReset - Hash fragment:', hashFragment);
        console.log('🔍 PasswordReset - Full URL:', window.location.href);
        
        if (!hashFragment) {
          setError('Enlace de restablecimiento inválido. Solicita un nuevo enlace.');
          setIsValidating(false);
          return;
        }

        const params = new URLSearchParams(hashFragment.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        
        console.log('🔍 PasswordReset - Parsed tokens:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          type,
          accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'none'
        });

        if (!accessToken || type !== 'recovery') {
          setError('Enlace de restablecimiento inválido o expirado.');
          setIsValidating(false);
          return;
        }

        // Set session with the tokens
        const sessionData = refreshToken 
          ? { access_token: accessToken, refresh_token: refreshToken }
          : { access_token: accessToken, refresh_token: '' };

        const { data, error: sessionError } = await supabase.auth.setSession(sessionData);

        if (sessionError || !data.session) {
          console.error('❌ PasswordReset - Session error:', sessionError);
          setError('El enlace de restablecimiento ha expirado o es inválido.');
          setIsValidating(false);
          return;
        }

        console.log('✅ PasswordReset - Valid token, session established');
        setIsValidToken(true);
        setError(null);
        
        // Clean URL
        window.history.replaceState(null, '', window.location.pathname);
        
      } catch (err) {
        console.error('❌ PasswordReset - Validation error:', err);
        setError('Error procesando el enlace de restablecimiento.');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Las contraseñas no coinciden"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive", 
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('❌ Error actualizando contraseña:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo actualizar la contraseña. Inténtalo de nuevo."
        });
        return;
      }

      console.log('✅ Contraseña actualizada exitosamente');
      
      toast({
        title: "¡Éxito!",
        description: "Tu contraseña ha sido actualizada exitosamente"
      });

      // Cerrar sesión y redirigir
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate('/auth');
      }, 2000);

    } catch (err) {
      console.error('❌ Error inesperado:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado. Inténtalo de nuevo."
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <SEOHead {...seoData} />
        <div className="w-full max-w-md space-y-6 bg-background rounded-lg shadow-sm p-6 sm:p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Verificando enlace</h1>
              <p className="text-muted-foreground">Validando tu solicitud de restablecimiento...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <SEOHead {...seoData} />
        <div className="w-full max-w-md space-y-6 bg-background rounded-lg shadow-sm p-6 sm:p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-destructive">Enlace inválido</h1>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Volver al inicio de sesión
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (!isValidToken) {
    return null;
  }

  return (
    <>
      <SEOHead {...seoData} />
      <RecoveryTokenHandler />
      <main className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-6 bg-background rounded-lg shadow-sm p-6 sm:p-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">Nueva contraseña</h1>
          <p className="text-muted-foreground">
            Ingresa tu nueva contraseña
          </p>
        </div>

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu nueva contraseña"
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirma tu nueva contraseña"
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !password || !confirmPassword}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando contraseña...
              </>
            ) : (
              'Actualizar contraseña'
            )}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/auth')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Volver al inicio de sesión
          </Button>
        </div>
      </div>
      </main>
    </>
  );
}