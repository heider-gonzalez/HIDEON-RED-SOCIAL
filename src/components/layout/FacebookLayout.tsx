import { ReactNode } from 'react';
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
        
        {/* Main Content Area - Facebook 3-column layout */}
        <div className="pt-16 h-svh w-full">
          <div className="flex h-[calc(100svh-4rem)] w-full overflow-hidden">
          {/* Left Sidebar - Fixed width on desktop only */}
          {!hideLeftSidebar && (
            <div className="hidden lg:block fixed left-0 top-16 bottom-0 w-[280px] z-10">
              <LeftSidebar currentUserId={currentUserId} pendingRequestsCount={pendingRequestsCount} />
            </div>
          )}
          
          {/* Center Content - Full width estilo LinkedIn */}
          <main
            className={`flex-1 h-full w-full overflow-y-auto ${!hideLeftSidebar ? 'lg:ml-[280px]' : ''} ${!hideRightSidebar ? 'xl:mr-[320px]' : ''}`}
          >
            <div className="w-full min-h-full bg-muted/10">
              <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-10 py-4 lg:py-7">
                {currentUserId && <NotificationPermissionBanner />}
                {children}
                <AppLegalFooter />
              </div>
            </div>
          </main>
          
          {/* Right Sidebar - Fixed width on desktop only */}
          {!hideRightSidebar && (
            <div className="hidden xl:block fixed right-0 top-16 bottom-0 w-[320px] z-10">
              <RightSidebar currentUserId={currentUserId} />
            </div>
          )}
          </div>
        </div>
        
        {/* Chat System - Bottom right */}
        {currentUserId && <ChatSystem />}
      </div>
    </ChatSystemProvider>
  );
}