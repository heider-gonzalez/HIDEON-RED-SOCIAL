
import { useState, useEffect } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AcademicOnboardingModal } from "@/components/onboarding/AcademicOnboardingModal";
import { CheckCircle } from "lucide-react";
import { RecoveryTokenHandler } from "@/components/auth/RecoveryTokenHandler";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SEOHead } from "@/utils/safe-seo";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { useOnboarding } from "@/hooks/use-onboarding";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();
  
  // Handle OAuth redirects and auth state changes
  useAuthRedirect();

  // Check for verification success - either from query param or from hash token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashFragment = window.location.hash;
    
    // Check if there's a signup verification token in the hash
    if (hashFragment) {
      const hashParams = new URLSearchParams(hashFragment.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      
      // If it's a signup verification token, show success message
      if (type === 'signup' && accessToken) {
        console.log('✅ Auth - Signup verification detected in hash');
        setShowVerificationSuccess(true);
        setAuthMode('login');
        // Clean the hash from URL
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
    }
    
    // Also check for legacy query param
    if (urlParams.get('verified') === 'true') {
      setShowVerificationSuccess(true);
      setAuthMode('login');
      // Remove the parameter from URL without refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Hide success message after 10 seconds
      setTimeout(() => {
        setShowVerificationSuccess(false);
      }, 10000);
    }
  }, []);

  // Fallback recovery token check
  useEffect(() => {
    const hashFragment = window.location.hash;
    if (hashFragment) {
      const params = new URLSearchParams(hashFragment.substring(1));
      const type = params.get('type');
      const accessToken = params.get('access_token');
      
      console.log('🔍 Auth Page - Recovery token fallback check:', { type, hasToken: !!accessToken });
      
      if (type === 'recovery' && accessToken) {
        console.log('🔄 Auth Page - Redirecting to password reset');
        window.location.href = `/password-reset${hashFragment}`;
      }
    }
  }, []);

  // SEO data for react-helmet-async
  const seoData = {
    title: authMode === 'login' ? 'Iniciar sesión | RED SOCIAL HSOCIAL' : 'Crear cuenta | RED SOCIAL HSOCIAL',
    description: authMode === 'login'
      ? 'Inicia sesión en RED SOCIAL HSOCIAL.'
      : 'Crea tu cuenta en RED SOCIAL HSOCIAL.',
    canonical: `${window.location.origin}/auth`,
    robots: 'index,follow'
  };


  return (
    <>
      <SEOHead {...seoData} />
      <RecoveryTokenHandler />
      <main className="min-h-screen flex items-center justify-center bg-background px-4 py-8 sm:py-12 relative" role="main">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4">
            <span className="text-6xl font-bold text-primary">H</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Conecta Ideas con Proyectos
          </p>
        </div>

        {/* Verification Success Alert */}
        {showVerificationSuccess && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              ¡Cuenta verificada exitosamente! Ya puedes iniciar sesión con tu email y contraseña.
            </AlertDescription>
          </Alert>
        )}

        {authMode === 'login' ? (
          <LoginForm loading={loading} setLoading={setLoading} />
        ) : (
          <RegisterForm 
            loading={loading} 
            setLoading={setLoading} 
            sendVerificationEmail={async (email, username) => {
              // Implementar lógica de envío si es necesario
              console.log('Verification email would be sent to:', email, username);
            }}
          />
        )}

        <div className="text-center">
          {authMode === 'login' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAuthMode('register')}
              disabled={loading}
              className="text-foreground hover:text-primary"
            >
              ¿No tienes cuenta? <span className="font-semibold ml-1">Crear cuenta</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAuthMode('login')}
              disabled={loading}
              className="text-foreground hover:text-primary"
            >
              ¿Ya tienes cuenta? <span className="font-semibold ml-1">Iniciar sesión</span>
            </Button>
          )}
        </div>
      </div>

      {/* Academic Onboarding Modal */}
      <AcademicOnboardingModal
        open={showOnboarding}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />
      </main>
    </>
  );
}
