
import React, { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { useServiceWorker } from "@/hooks/use-service-worker";
import { useNotificationQueue } from "@/hooks/use-notification-queue";
import { useNotificationCleanup } from "@/hooks/use-notification-cleanup";

// Critical pages loaded immediately
import Index from "./pages/Index";
import Auth from "@/pages/Auth";

// Essential pages lazy loaded
const Friends = React.lazy(() => import("@/pages/Friends"));
const FollowersPage = React.lazy(() => import("@/pages/FollowersPage"));
const Notifications = React.lazy(() => import("@/pages/Notifications"));
const Profile = React.lazy(() => import("@/pages/Profile"));
const Projects = React.lazy(() => import("@/pages/Projects"));
const Teams = React.lazy(() => import("@/pages/Teams"));
const Ideas = React.lazy(() => import("@/pages/Ideas"));
const Events = React.lazy(() => import("@/pages/Events"));
const Messages = React.lazy(() => import("@/pages/Messages"));
const GlobalChatPage = React.lazy(() => import("@/pages/GlobalChat"));
const PasswordReset = React.lazy(() => import("@/pages/PasswordReset"));
const Explore = React.lazy(() => import("@/pages/Explore"));
const Leaderboard = React.lazy(() => import("@/pages/Leaderboard"));
const Saved = React.lazy(() => import("@/pages/Saved"));
const Reels = React.lazy(() => import("@/pages/Reels"));
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
const PostDetail = React.lazy(() => import("@/pages/PostDetail"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes - increased for better caching
      retry: 1,
      refetchOnWindowFocus: false, // Reduce unnecessary network calls
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
  const { requestNotificationPermission, subscribeToPushNotifications } = useServiceWorker();
  const { triggerProcessing, isProcessing, currentInterval } = useNotificationQueue({
    interval: 30000, // 30 seconds
    batchSize: 10,
    maxRetries: 3,
    backoffMultiplier: 2
  });
  const { cleanupOldNotifications } = useNotificationCleanup();

  React.useEffect(() => {
    if (user?.id) {
      // Request notification permission on login
      requestNotificationPermission().then((granted) => {
        if (granted) {
          console.log('🔔 Notification permissions granted');
          // Subscribe to push notifications
          subscribeToPushNotifications();
        } else {
          console.warn('🔔 Notification permissions denied by user');
          // Could show a toast or banner here to explain why notifications are important
          // For now, just log the denial
        }
      }).catch((error) => {
        console.error('🔔 Error requesting notification permissions:', error);
      });
    }
  }, [user?.id, requestNotificationPermission, subscribeToPushNotifications]);

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

const App = () => {
  // Initialize portal container on app start
  useEffect(() => {
    initializePortalContainer();
  }, []);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <Toaster />
            <BrowserRouter>
              <AuthProvider>
                <RecoveryTokenHandler />
                <RealtimeNotificationsRoot />
                <ServiceWorkerRegistration />
              <Routes>
              {/* Critical pages - no lazy loading */}
              <Route path="/auth" element={<Auth />} />
              
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
              </Routes>
              </AuthProvider>
            </BrowserRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
