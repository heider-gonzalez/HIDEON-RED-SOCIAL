import { ReactNode, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TopNavigation } from '@/components/navigation/TopNavigation';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { ChatSystem } from './ChatSystem';

import { useIsMobile } from '@/hooks/use-mobile';
import { ChatSystemProvider } from '@/hooks/use-chat-system';
import { NotificationPermissionBanner } from '@/components/notifications/NotificationPermissionBanner';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { forceUnlockBodyScroll } from '@/utils/scroll-lock';

const FACEBOOK_LAYOUT_GUARD_KEY = "__HSOCIAL_FACEBOOK_LAYOUT_MOUNTED__";

interface FacebookLayoutProps {
  children: ReactNode;
  hideLeftSidebar?: boolean;
  hideRightSidebar?: boolean;
  hideNavigation?: boolean;
}

function AppLegalFooter() {
  return (
    <footer className="w-full px-4 py-6 text-xs text-muted-foreground">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-2">
        <Link to="/privacy" className="hover:underline">Política de Privacidad</Link>
        <span>·</span>
        <Link to="/terms" className="hover:underline">Términos y Condiciones</Link>
      </div>
    </footer>
  );
}

export function FacebookLayout({ 
  children, 
  hideLeftSidebar = false, 
  hideRightSidebar = false,
  hideNavigation = false 
}: FacebookLayoutProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [newPosts, setNewPosts] = useState<number>(0);

  const ownsLayoutGuardRef = useRef(false);
  const shouldBypassLayout = (() => {
    if (typeof window === "undefined") return false;
    const w = window as any;
    if (ownsLayoutGuardRef.current) return false;
    if (w[FACEBOOK_LAYOUT_GUARD_KEY] === true) return true;
    w[FACEBOOK_LAYOUT_GUARD_KEY] = true;
    ownsLayoutGuardRef.current = true;
    return false;
  })();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ownsLayoutGuardRef.current) return;
    const w = window as any;
    return () => {
      w[FACEBOOK_LAYOUT_GUARD_KEY] = false;
    };
  }, []);

  if (shouldBypassLayout) {
    return <>{children}</>;
  }

  const isWideCenterPage =
    location.pathname.startsWith("/ideas") ||
    location.pathname.startsWith("/projects") ||
    location.pathname.startsWith("/project") ||
    location.pathname.startsWith("/profile") ||
    location.pathname.startsWith("/groups") ||
    location.pathname.startsWith("/saved") ||
    location.pathname.startsWith("/reels") ||
    location.pathname.startsWith("/explore") ||
    location.pathname.startsWith("/notifications") ||
    location.pathname.startsWith("/messages") ||
    location.pathname.startsWith("/settings") ||
    location.pathname.startsWith("/help") ||
    location.pathname.startsWith("/friends") ||
    location.pathname.startsWith("/followers") ||
    location.pathname.startsWith("/discover") ||
    location.pathname.startsWith("/analytics") ||
    location.pathname.startsWith("/company") ||
    location.pathname.startsWith("/leaderboard");

  useEffect(() => {
    if (!isMobile) return;
    forceUnlockBodyScroll();
  }, [isMobile, location.pathname]);

  // Get current user and pending requests count
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    
    getCurrentUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load notifications and new posts (friends/requests not used)
  useEffect(() => {
    if (!currentUserId) return;
    
    const loadCounts = async () => {
      try {
        // Friends/requests disabled (Instagram-style followers)
        setPendingRequestsCount(0);

        // Load unread notifications
        setUnreadNotifications(0); // Simplified for now

        // For new posts, we'll keep it simple for now
        setNewPosts(0);
      } catch (error) {
        console.error('Error loading counts:', error);
      }
    };
    
    loadCounts();

    const notificationsChannel = supabase
      .channel('notifications_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUserId}`,
      }, () => {
        loadCounts();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, [currentUserId]);

  // Mobile layout
  if (isMobile) {
    return (
      <ChatSystemProvider>
        <div className="h-svh w-full bg-background text-foreground overflow-x-hidden flex flex-col">
          {!hideNavigation && (
            <div className="fixed top-0 left-0 right-0 z-50 w-full">
              <TopNavigation pendingRequestsCount={pendingRequestsCount} />
            </div>
          )}
          
          <main
            className={`flex-1 min-h-0 w-full bg-background ${!hideNavigation ? 'pt-[96px] pb-0' : 'py-4 pb-0'} overflow-y-auto overscroll-contain`}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="w-full px-0 mx-auto max-w-full">
              {currentUserId && <NotificationPermissionBanner />}
              {children}
              <AppLegalFooter />
            </div>
          </main>
          
          {currentUserId && <ChatSystem />}
        </div>
      </ChatSystemProvider>
    );
  }

  // Desktop layout - Facebook style
  return (
    <ChatSystemProvider>
      <div className="h-svh overflow-hidden bg-background text-foreground">
        {/* Fixed Top Navigation */}
        {!hideNavigation && (
          <div className="fixed top-0 left-0 right-0 z-50">
            <TopNavigation pendingRequestsCount={pendingRequestsCount} />
          </div>
        )}
        
        {/* Main Content Area - 3-column grid layout */}
        <div className="pt-16 h-svh w-full">
          <div
            className="grid h-[calc(100svh-4rem)] w-full overflow-hidden"
            style={{ gridTemplateColumns: "260px 1fr 300px" }}
          >
            {/* Left Sidebar */}
            <aside className="hidden lg:block h-full">
              {!hideLeftSidebar && (
                <div className="sticky top-16 h-[calc(100svh-4rem)] overflow-y-auto scrollbar-hide overscroll-contain">
                  <LeftSidebar currentUserId={currentUserId} />
                </div>
              )}
            </aside>

            {/* Center Content */}
            <main className="h-full overflow-y-auto scrollbar-hide bg-muted/10">
              <div className="w-full min-h-full px-3 sm:px-6 py-4 lg:py-7">
                <div className={isWideCenterPage ? "mx-auto w-full max-w-[1400px]" : "mx-auto w-full max-w-[900px]"}>
                  {currentUserId && <NotificationPermissionBanner />}
                  {children}
                  <AppLegalFooter />
                </div>
              </div>
            </main>

            {/* Right Sidebar */}
            <aside className="hidden xl:block h-full">
              {!hideRightSidebar && (
                <div className="sticky top-16 h-[calc(100svh-4rem)] overflow-y-auto custom-scrollbar overscroll-contain">
                  <RightSidebar currentUserId={currentUserId} />
                </div>
              )}
            </aside>
          </div>
        </div>
        
        {/* Chat System - Bottom right */}
        {currentUserId && <ChatSystem />}
      </div>
    </ChatSystemProvider>
  );
}