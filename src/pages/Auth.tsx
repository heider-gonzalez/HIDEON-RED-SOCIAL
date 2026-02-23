
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
    title: authMode === 'login' ? 'Iniciar sesión | HIDEON' : 'Crear cuenta | HIDEON',
    description: authMode === 'login'
      ? 'Inicia sesión en HIDEON.'
      : 'Crea tu cuenta en HIDEON.',
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
          <div className="mx-auto mb-4 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <div className="h-14 w-14 rounded-full bg-white dark:bg-[#121212] [.tech_&]:bg-background flex items-center justify-center overflow-hidden">
                <svg viewBox="700 250 1250 1400" className="w-[92%] h-[92%] block mx-auto fill-current not-italic text-primary" aria-hidden="true" focusable="false">
                  <path
                    transform="translate(0 1850) scale(1 -1)"
                    d="M820 916 c0 -295 3 -536 6 -536 4 0 78 39 165 87 207 114 207 110 16 211 -21 11 -38 24 -39 28 0 4 74 49 163 100 l164 91 3 -177 2 -178 145 -81 c79 -45 146 -81 149 -81 3 0 6 241 6 535 0 294 -2 535 -4 535 -3 0 -70 -37 -150 -81 l-146 -82 0 -168 c0 -93 -3 -169 -6 -169 -14 0 -393 222 -397 233 -7 18 -5 147 2 147 3 0 35 -17 71 -38 36 -21 91 -52 123 -70 l57 -32 0 42 -1 43 -155 85 c-85 47 -159 87 -164 88 -7 2 -10 -188 -10 -532z m156 -302 c35 -20 64 -38 64 -40 0 -4 -136 -74 -145 -74 -3 0 -5 34 -5 75 0 47 4 75 11 75 6 0 40 -16 75 -36z"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-widest text-primary">HIDEON</h1>
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
