import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Bell, MessageCircle, Compass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigation } from "./use-navigation";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { FriendSearch } from "@/components/FriendSearch";
import { FullScreenSearch } from "@/components/search/FullScreenSearch";
import { UserMenu } from "@/components/user-menu/UserMenu";
import { HSocialLogo } from "./HSocialLogo";
import { useUser } from "@/hooks/use-user";

import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { usePostComposer } from "@/providers/PostComposerProvider";

interface TopNavigationProps {
  pendingRequestsCount: number;
}

export function TopNavigation({ pendingRequestsCount }: TopNavigationProps) {
  void pendingRequestsCount;
  const {
    currentUserId,
    handleNotificationClick,
    location,
    unreadNotifications
  } = useNavigation();
  
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showFullScreenSearch, setShowFullScreenSearch] = useState(false);
  const isMobile = useIsMobile();
  const { user } = useUser();

  const { open: openComposer } = usePostComposer();

  const { unreadMessages } = useUnreadMessages(currentUserId || undefined);
  const unreadMessagesCount = unreadMessages.reduce((total, msg) => total + msg.unread_count, 0);

  const centerIconStyles: Record<string, { bg: string; fg: string; activeBg: string; activeFg: string }> = {};

  const defaultCenterIconStyle = {
    bg: "bg-transparent",
    fg: "text-muted-foreground",
    activeBg: "bg-primary",
    activeFg: "text-primary-foreground",
  };

  const getCenterIconStyle = (path: string) => centerIconStyles[path] ?? defaultCenterIconStyle;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        // Get user profile
        const { data } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', session.user.id)
          .single();
        setUserProfile(data);
      }
    };
    
    checkAuth();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        // Get user profile on auth change
        const getProfile = async () => {
          const { data } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', session.user.id)
            .single();
          setUserProfile(data);
        };
        getProfile();
      } else {
        setUserProfile(null);
      }
    });
    
    return () => {
      if (authListener) authListener.subscription.unsubscribe();
    };
  }, []);

  // Facebook-style navigation items
  const centerNavItems = [
    {
      icon: Compass,
      label: "Explorar",
      path: "/explore",
      isActive: location.pathname.startsWith('/explore')
    },
    {
      icon: MessageCircle,
      label: "Mensajes",
      path: "/messages",
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
      isActive: location.pathname.startsWith('/messages')
    },
    {
      icon: Bell,
      label: "Notificaciones",
      path: "/notifications",
      badge: unreadNotifications > 0 ? unreadNotifications : null,
      isActive: location.pathname.startsWith('/notifications')
    },
  ];

  const handleProfileClick = async () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    if (currentUserId) {
      navigate(`/profile/${currentUserId}`);
    }
  };

  // Mobile navigation (Facebook Lite-style top bar)
  if (isMobile) {
    return (
      <nav className={cn(
        "bg-background/95 backdrop-blur border-b border-border/30 fixed top-0 left-0 right-0 z-[70] shadow-none"
      )}>
        <div className="flex flex-col">
          <div className="flex items-center justify-between h-14 px-4">
            <HSocialLogo
              size="lg"
              showText={true}
              variant="brand"
              onClick={() => navigate(isAuthenticated ? "/home" : "/")}
            />
            
            {/* Search + Actions - Right */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-muted/40 text-muted-foreground hover:bg-muted/60"
                onClick={() => openComposer({ userAvatar: userProfile?.avatar_url || user?.user_metadata?.avatar_url })}
                aria-label="Crear"
              >
                <Plus className="h-5 w-5" strokeWidth={1.5} />
              </Button>

              {/* Search button (abre buscador de pantalla completa) */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-muted/40 text-muted-foreground hover:bg-muted/60"
                onClick={() => setShowFullScreenSearch(true)}
                aria-label="Buscar"
              >
                <Search className="h-5 w-5" strokeWidth={1.5} />
              </Button>

              <UserMenu
                triggerClassName="h-10 w-10 rounded-full bg-muted/40 text-muted-foreground hover:bg-muted/60"
                iconClassName="h-5 w-5"
              />
            </div>
          </div>

          <div className="flex items-center h-12 px-2">
            {centerNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex-1 flex items-center justify-center h-full rounded-lg transition-colors",
                  item.isActive ? "text-primary" : "text-muted-foreground hover:bg-muted/60"
                )}
                aria-label={item.label}
              >
                <span
                  className={cn(
                    item.path === "/explore" && !item.isActive && "explore-attention"
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={item.isActive ? 2 : 1.5} />
                </span>
                {item.badge && item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute top-1 right-3 h-4 min-w-4 px-1 rounded-full p-0 flex items-center justify-center text-[10px]"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
                {item.isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-1 bg-primary rounded-t-full" />
                )}
              </Link>
            ))}
          </div>
        </div>
        {/* Full Screen Search for Mobile */}
        <FullScreenSearch 
          isOpen={showFullScreenSearch} 
          onClose={() => setShowFullScreenSearch(false)} 
        />
      </nav>
    );
  }

  const desktopCenterNavItems = centerNavItems.filter(
    (item) => item.path !== "/messages" && item.path !== "/notifications" && item.path !== "/explore"
  );

  // Desktop navigation (Facebook style)
  return (
    <nav className="bg-background/95 backdrop-blur border-b border-border/30 h-16 fixed top-0 left-0 right-0 z-[70]">
      <div className="w-full flex items-center justify-between h-full px-3 lg:px-6">

        {/* Logo and Search - Left */}
        <div className="flex items-center gap-4 flex-shrink-0 w-[720px]">
          <HSocialLogo
            size="md"
            showText={true}
            onClick={() => navigate(isAuthenticated ? "/home" : "/")}
          />
          
          {/* Search bar - desktop inline search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <div className="w-full">
              <FriendSearch />
            </div>
          </div>
        </div>

        {/* Center Navigation - Facebook Icons */}
        <div className="flex items-center justify-center flex-1 max-w-2xl">
          <div className="flex items-center gap-2">
            {desktopCenterNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-center h-12 w-32 rounded-xl transition-colors duration-200 relative group",
                  item.isActive ? "bg-muted/60" : "hover:bg-muted/50"
                )}
              >
                {(() => {
                  const style = getCenterIconStyle(item.path);
                  const bubbleClassName = cn(
                    "h-10 w-10 rounded-full flex items-center justify-center transition-colors ring-1 ring-border/30",
                    item.isActive ? style.activeBg : style.bg
                  );
                  const iconClassName = cn(
                    "h-[22px] w-[22px] transition-colors",
                    item.isActive ? style.activeFg : style.fg
                  );
                  return (
                    <span className={bubbleClassName}>
                      <span className={cn(item.path === "/explore" && !item.isActive && "explore-attention")}>
                        <item.icon className={iconClassName} strokeWidth={item.isActive ? 1.8 : 1.4} />
                      </span>
                    </span>
                  );
                })()}
                {item.badge && item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]"
                  >
                    {item.badge}
                  </Badge>
                )}
                {item.isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-primary rounded-t-full" />
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Right Section - Desktop Actions (solo + y menú) */}
        <div className="flex items-center gap-2 flex-shrink-0 w-80 justify-end">
          {isAuthenticated && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-muted/40 hover:bg-muted/60 transition-colors text-muted-foreground"
                title="Crear"
                onClick={() => openComposer({ userAvatar: userProfile?.avatar_url || user?.user_metadata?.avatar_url })}
              >
                <Plus className="h-5 w-5" strokeWidth={1.5} />
              </Button>

              <UserMenu
                triggerClassName="h-10 w-10 rounded-full bg-muted/40 text-muted-foreground hover:bg-muted/60"
                iconClassName="h-5 w-5"
              />
            </>
          )}
        </div>
      </div>

      {/* Full Screen Search for Desktop */}
      <FullScreenSearch
        isOpen={showFullScreenSearch}
        onClose={() => setShowFullScreenSearch(false)}
      />
    </nav>
  );
}