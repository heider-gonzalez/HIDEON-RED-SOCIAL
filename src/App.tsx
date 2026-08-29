
import React, { Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/providers/AuthProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RecoveryTokenHandler } from "@/components/auth/RecoveryTokenHandler";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { initializePortalContainer } from "@/utils/portal-container";
import { RealtimeNotificationHandler } from "@/components/notifications/RealtimeNotificationHandler";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServiceWorker } from "@/hooks/use-service-worker";
import { useNotificationQueue } from "@/hooks/use-notification-queue";
import { useNotificationCleanup } from "@/hooks/use-notification-cleanup";
import { useSessionCleanup } from "@/hooks/use-session-cleanup";
import { FullscreenVideoProvider } from "@/components/video/FullscreenVideoContext";
import { FullscreenVideoRoot } from "@/components/video/FullscreenVideoRoot";
import { PerformanceOptimizer } from "@/components/performance/PerformanceOptimizer";
import { PostComposerProvider } from "@/providers/PostComposerProvider";
import { FacebookLayout } from "@/components/layout/FacebookLayout";
import { ProfileCompletionModal } from "@/components/onboarding/ProfileCompletionModal";
import { useToast } from "@/hooks/use-toast";
import { usePerformanceMonitor } from "@/utils/performance-monitor";
import { getAnimationQuality } from "@/utils/performance";

// Critical pages loaded immediately
import Index from "./pages/Index";
import Auth from "@/pages/Auth";

// Essential pages lazy loaded with chunk names for better splitting
const Friends = React.lazy(() => import(/* webpackChunkName: "friends" */ "@/pages/Friends"));
const FollowersPage = React.lazy(() => import(/* webpackChunkName: "followers" */ "@/pages/FollowersPage"));
const Notifications = React.lazy(() => import(/* webpackChunkName: "notifications" */ "@/pages/Notifications"));
const Profile = React.lazy(() => import(/* webpackChunkName: "profile" */ "@/pages/Profile"));
const Projects = React.lazy(() => import(/* webpackChunkName: "projects" */ "@/pages/Projects"));
const Teams = React.lazy(() => import(/* webpackChunkName: "teams" */ "@/pages/Teams"));
const Ideas = React.lazy(() => import(/* webpackChunkName: "ideas" */ "@/pages/Ideas"));
const Events = React.lazy(() => import(/* webpackChunkName: "events" */ "@/pages/Events"));
const Messages = React.lazy(() => import(/* webpackChunkName: "messages" */ "@/pages/Messages"));
const GlobalChatPage = React.lazy(() => import(/* webpackChunkName: "global-chat" */ "@/pages/GlobalChat"));
const PasswordReset = React.lazy(() => import(/* webpackChunkName: "auth" */ "@/pages/PasswordReset"));
const Explore = React.lazy(() => import(/* webpackChunkName: "explore" */ "@/pages/Explore"));
const Leaderboard = React.lazy(() => import(/* webpackChunkName: "leaderboard" */ "@/pages/Leaderboard"));
const Saved = React.lazy(() => import(/* webpackChunkName: "saved" */ "@/pages/Saved"));
const Reels = React.lazy(() => import(/* webpackChunkName: "reels" */ "@/pages/Reels"));
// Opportunities removed
const Groups = React.lazy(() => import("@/pages/Groups"));
const GroupDetail = React.lazy(() => import("@/pages/GroupDetail"));
const CreateGroup = React.lazy(() => import("@/pages/CreateGroup"));
const Companies = React.lazy(() => import("@/pages/Companies"));
const CompanyDetail = React.lazy(() => import("@/pages/CompanyDetail"));
const TermsOfService = React.lazy(() => import("@/pages/TermsOfService"));
const PrivacyPolicy = React.lazy(() => import("@/pages/PrivacyPolicy"));
const Settings = React.lazy(() => import("@/pages/settings/Settings"));
const AccountSettings = React.lazy(() => import("@/pages/settings/AccountSettings"));
const PersonalizationSettings = React.lazy(() => import("@/pages/settings/PersonalizationSettings"));
const PrivacySettings = React.lazy(() => import("@/pages/settings/PrivacySettings"));
const SecuritySettings = React.lazy(() => import("@/pages/settings/SecuritySettings"));
const NotificationSettings = React.lazy(() => import("@/pages/NotificationSettings"));
const StatisticsSettings = React.lazy(() => import("@/pages/settings/StatisticsSettings"));
const AccessibilitySettings = React.lazy(() => import("@/pages/settings/AccessibilitySettings"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));
const IdeaParticipants = React.lazy(() => import("@/pages/IdeaParticipants"));
const IdeaChat = React.lazy(() => import("@/pages/IdeaChat"));
const ProjectDetail = React.lazy(() => import("@/pages/ProjectDetail"));
const Help = React.lazy(() => import("@/pages/Help"));
const PostDetail = React.lazy(() => import("@/pages/PostDetail"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes - increased for better caching
      retry: 1,
      refetchOnWindowFocus: false, // Reduce unnecessary network calls
      refetchOnMount: false,
    },
  },
});

function RealtimeNotificationsRoot() {
  const { user } = useAuth();
  if (!user?.id) return null;
  return <RealtimeNotificationHandler userId={user.id} />;
}

function ServiceWorkerRegistration() {
  const { user } = useAuth();
  const { isRegistered, requestNotificationPermission, subscribeToPushNotifications } = useServiceWorker();
  const { triggerProcessing, isProcessing, currentInterval } = useNotificationQueue({
    interval: 30000, // 30 seconds
    batchSize: 10,
    maxRetries: 3,
    backoffMultiplier: 2
  });
  const { cleanupOldNotifications } = useNotificationCleanup();

  React.useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const run = async () => {
      try {
        const granted = await requestNotificationPermission();
        if (!granted) {
          console.warn('🔔 Notification permissions denied by user');
          return;
        }

        console.log('🔔 Notification permissions granted');

        const trySubscribe = async () => {
          if (cancelled) return;
          const maxAttempts = 10;
          (trySubscribe as any)._attempts = ((trySubscribe as any)._attempts ?? 0) + 1;

          if ((trySubscribe as any)._attempts > maxAttempts) {
            return;
          }

          const sub = await subscribeToPushNotifications();
          if (!sub) {
            setTimeout(() => {
              void trySubscribe();
            }, 1500);
          }
        };

        if (isRegistered) {
          await trySubscribe();
        } else {
          setTimeout(() => {
            void trySubscribe();
          }, 1500);
        }
      } catch (error) {
        console.error('Error requesting notification permissions:', error);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [user?.id, isRegistered, requestNotificationPermission, subscribeToPushNotifications]);

  // Periodic cleanup of notification queue (every 6 hours)
  React.useEffect(() => {
    if (!user?.id) return;

    const cleanupInterval = setInterval(async () => {
      try {
        console.log('🧹 Running periodic notification cleanup...');
        await cleanupOldNotifications();
      } catch (error) {
        console.error('🧹 Error during periodic cleanup:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    // Also run cleanup on component mount
    cleanupOldNotifications().catch(error => {
      console.error('🧹 Error during initial cleanup:', error);
    });

    return () => {
      clearInterval(cleanupInterval);
    };
  }, [user?.id, cleanupOldNotifications]);

  // Debug logging for queue processing
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔔 Queue processor status:', {
        isProcessing,
        currentInterval: currentInterval / 1000,
        userId: user?.id
      });
    }
  }, [isProcessing, currentInterval, user?.id]);

  return null;
}

function ProfileCompletionEnforcer() {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user?.id) {
      setOpen(false);
      return;
    }
    if (location.pathname === "/auth") {
      setOpen(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setChecking(true);
      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("institution_name, career")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) return;

        const institutionName = String((data as any)?.institution_name || "").trim();
        const career = String((data as any)?.career || "").trim();
        setOpen(!institutionName || !career);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, location.pathname, user?.id]);

  if (!open) return null;

  return (
    <ProfileCompletionModal
      open={open && !checking}
      onComplete={async ({ institutionName, career }) => {
        if (!user?.id) return;
        if (saving) return;
        setSaving(true);
        try {
          const { error } = await (supabase as any)
            .from("profiles")
            .update({
              institution_name: institutionName,
              career,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

          if (error) {
            toast({
              variant: "destructive",
              title: "No se pudo guardar tu información",
              description: error.message,
            });
            return;
          }

          setOpen(false);
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}

function AppShell() {
  return (
    <FacebookLayout>
      <Outlet />
    </FacebookLayout>
  );
}

const App = () => {
  // Initialize portal container on app start
  useEffect(() => {
    initializePortalContainer();
  }, []);

  // Initialize session cleanup
  const { triggerCleanup } = useSessionCleanup();

  // Initialize performance monitoring
  const perfMonitor = usePerformanceMonitor();
  const animationQuality = getAnimationQuality();
  
  useEffect(() => {
    // Medir Web Vitals cuando la aplicación carga
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
      perfMonitor.getWebVitals().then(vitals => {
        Object.entries(vitals).forEach(([name, value]) => {
          perfMonitor.recordMetric(`web_vital_${name}`, value);
        });
      });
    }
    
    // Aplicar configuración de animaciones basada en el dispositivo
    document.documentElement.setAttribute('data-animation-quality', animationQuality);
    
    // Registrar Service Worker para PWA
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registrado con éxito:', registration);
        })
        .catch((error) => {
          console.log('Error al registrar Service Worker:', error);
        });
    }
  }, [perfMonitor, animationQuality]);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <PerformanceOptimizer>
              <Toaster />
              <BrowserRouter>
                <AuthProvider>
                  <PostComposerProvider>
                    <FullscreenVideoProvider>
                      <RecoveryTokenHandler />
                      <RealtimeNotificationsRoot />
                      <ServiceWorkerRegistration />
                      <FullscreenVideoRoot />
                      <ProfileCompletionEnforcer />
                      <Routes>
                    {/* Critical pages - no lazy loading */}
                    <Route path="/auth" element={<Auth />} />

                    <Route element={<AppShell />}>
                      <Route path="/" element={<Index />} />

                      <Route
                        path="/home"
                        element={
                          <AuthGuard>
                            <Index />
                          </AuthGuard>
                        }
                      />
                    
                    {/* Core features - lazy loaded */}
                    <Route path="/password-reset" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <PasswordReset />
                      </Suspense>
                    } />
                    <Route path="/profile/:userId" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Profile />
                        </Suspense>
                      </AuthGuard>
                    } />

                    <Route path="/post/:postId" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <PostDetail />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/friends" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Friends />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/followers" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <FollowersPage />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/notifications" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Notifications />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/messages" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Messages />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/global-chat" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <GlobalChatPage />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/projects" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Projects />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/teams" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Teams />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/ideas" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Ideas />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/events" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Events />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/explore" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Explore />
                        </Suspense>
                      </AuthGuard>
                    } />

                    <Route
                      path="/discover"
                      element={<Navigate to="/leaderboard" replace />}
                    />


                    <Route
                      path="/terms"
                      element={
                        <Suspense fallback={<LoadingSpinner />}>
                          <TermsOfService />
                        </Suspense>
                      }
                    />

                    <Route
                      path="/privacy"
                      element={
                        <Suspense fallback={<LoadingSpinner />}>
                          <PrivacyPolicy />
                        </Suspense>
                      }
                    />

                    <Route path="/groups" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Groups />
                        </Suspense>
                      </AuthGuard>
                    } />

                    <Route path="/groups/create" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <CreateGroup />
                        </Suspense>
                      </AuthGuard>
                    } />

                    <Route path="/groups/:slugOrId" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <GroupDetail />
                        </Suspense>
                      </AuthGuard>
                    } />

                    <Route path="/companies" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Companies />
                        </Suspense>
                      </AuthGuard>
                    } />

                    <Route path="/companies/:slugOrId" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <CompanyDetail />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/leaderboard" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Leaderboard />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/saved" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Saved />
                        </Suspense>
                      </AuthGuard>
                    } />

                    <Route path="/reels" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Reels />
                        </Suspense>
                      </AuthGuard>
                    } />

                    <Route path="/reels/:reelId" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Reels />
                        </Suspense>
                      </AuthGuard>
                    } />

                    <Route path="/help" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Help />
                        </Suspense>
                      </AuthGuard>
                    } />

                    {/* Settings pages */}
                    <Route path="/settings" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Settings />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/settings/account" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <AccountSettings />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/settings/personalization" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <PersonalizationSettings />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/settings/privacy" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <PrivacySettings />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/settings/security" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <SecuritySettings />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/settings/notifications" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <NotificationSettings />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/settings/statistics" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <StatisticsSettings />
                        </Suspense>
                      </AuthGuard>
                    } />
                    <Route path="/settings/accessibility" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <AccessibilitySettings />
                        </Suspense>
                      </AuthGuard>
                    } />
                    
                    {/* Idea participants page */}
                    <Route path="/idea/:postId/participants" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <IdeaParticipants />
                        </Suspense>
                      </AuthGuard>
                    } />

                    <Route path="/idea/:postId/chat" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <IdeaChat />
                        </Suspense>
                      </AuthGuard>
                    } />

                    {/* Project detail page */}
                    <Route path="/project/:postId" element={
                      <AuthGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <ProjectDetail />
                        </Suspense>
                      </AuthGuard>
                    } />
                    
                    {/* 404 fallback */}
                    <Route path="*" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <NotFound />
                      </Suspense>
                    } />
                    </Route>
                  </Routes>
                </FullscreenVideoProvider>
                </PostComposerProvider>
              </AuthProvider>
            </BrowserRouter>
          </PerformanceOptimizer>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
  );
};

export default App;
