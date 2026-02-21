import { Link, useNavigate } from "react-router-dom";
import { Home, Search, Users, PlaySquare, Plus, Bell, MessageCircle, Compass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigation } from "./use-navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { FriendSearch } from "@/components/FriendSearch";
import { FullScreenSearch } from "@/components/search/FullScreenSearch";
import { UserMenu } from "@/components/user-menu/UserMenu";
import { HSocialLogo } from "./HSocialLogo";
import { useUser } from "@/hooks/use-user";
import ModalPublicacionWeb from "@/components/ModalPublicacionWeb";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";

interface TopNavigationProps {
  pendingRequestsCount: number;
}

export function TopNavigation({ pendingRequestsCount }: TopNavigationProps) {
  const {
    currentUserId,
    newPosts,
    handleHomeClick,
    handleNotificationClick,
    location
  } = useNavigation();
  
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showFullScreenSearch, setShowFullScreenSearch] = useState(false);
  const isMobile = useIsMobile();
  const [showPostModal, setShowPostModal] = useState(false);
  const { user } = useUser();

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
      icon: Home,
      label: "Inicio",
      path: "/home",
      onClick: handleHomeClick,
      badge: newPosts > 0 ? newPosts : null,
      isActive: location.pathname === "/home"
    },
    {
      icon: Users,
      label: "Amigos",
      path: "/friends",
      isActive: location.pathname.startsWith('/friends')
    },
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
      isActive: location.pathname.startsWith('/messages')
    },
    {
      icon: PlaySquare,
      label: "Reels",
      path: "/reels",
      isActive: location.pathname.startsWith('/reels')
    },
    {
      icon: Bell,
      label: "Notificaciones",
      path: "/notifications",
      isActive: location.pathname.startsWith('/notifications')
    }
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
        "bg-background/95 backdrop-blur border-b border-border fixed top-0 left-0 right-0 z-[70] shadow-sm"
      )}>
        <div className="flex flex-col">
          <div className="flex items-center justify-between h-12 px-3">
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
                className="h-10 w-10 rounded-full bg-muted/70 text-foreground hover:bg-muted"
                onClick={() => setShowPostModal(true)}
                aria-label="Crear"
              >
                <Plus className="h-6 w-6" />
              </Button>

              {/* Search button (abre buscador de pantalla completa) */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-muted/70 text-foreground hover:bg-muted"
                onClick={() => setShowFullScreenSearch(true)}
                aria-label="Buscar"
              >
                <Search className="h-6 w-6" />
              </Button>

              <UserMenu
                triggerClassName="h-10 w-10 rounded-full bg-muted/70 text-foreground hover:bg-muted"
                iconClassName="h-6 w-6"
              />
            </div>
          </div>

          <div className="flex items-center h-12 px-1">
            {centerNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => {
                  if (item.onClick) {
                    e.preventDefault();
                    item.onClick();
                  }
                }}
                className={cn(
                  "relative flex-1 flex items-center justify-center h-full rounded-lg transition-colors",
                  item.isActive ? "text-primary" : "text-muted-foreground hover:bg-muted/60"
                )}
                aria-label={item.label}
              >
                <item.icon className="h-6 w-6" strokeWidth={item.isActive ? 2 : 1.5} />
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

        <ModalPublicacionWeb
          isVisible={showPostModal}
          onClose={() => setShowPostModal(false)}
          initialPostType={null}
          userAvatar={userProfile?.avatar_url || user?.user_metadata?.avatar_url}
        />

        {/* Full Screen Search for Mobile */}
        <FullScreenSearch 
          isOpen={showFullScreenSearch} 
          onClose={() => setShowFullScreenSearch(false)} 
        />
      </nav>
    );
  }

  // Desktop navigation (Facebook style)
  return (
    <nav className="bg-card border-b border-border h-14 fixed top-0 left-0 right-0 z-[70]">
      <div className="w-full flex items-center justify-between h-full px-2 lg:px-4">
        {/* Logo and Search - Left */}
        <div className="flex items-center gap-4 flex-shrink-0 w-80">
          <HSocialLogo
            size="md"
            showText={true}
            onClick={() => navigate(isAuthenticated ? "/home" : "/")}
          />
          
          {/* Search bar - desktop inline search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <div className="w-full">
              <FriendSearch />
            </div>
          </div>
        </div>

        {/* Center Navigation - Facebook Icons */}
        <div className="flex items-center justify-center flex-1 max-w-2xl">
          <div className="flex items-center gap-2">
            {centerNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={item.onClick}
                className={cn(
                  "flex items-center justify-center h-12 w-32 rounded-xl transition-colors duration-200 relative group",
                  item.isActive ? "bg-primary/10" : "hover:bg-muted"
                )}
              >
                {(() => {
                  const style = getCenterIconStyle(item.path);
                  const bubbleClassName = cn(
                    "h-10 w-10 rounded-full flex items-center justify-center transition-colors ring-1 ring-border/60 group-hover:shadow-sm",
                    item.isActive ? style.activeBg : style.bg
                  );
                  const iconClassName = cn(
                    "h-6 w-6 transition-colors",
                    item.isActive ? style.activeFg : style.fg
                  );
                  return (
                    <span className={bubbleClassName}>
                      <item.icon className={iconClassName} strokeWidth={item.isActive ? 2 : 1.5} />
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
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-primary rounded-t-full"></div>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Right Section - User Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 w-80 justify-end">
          {isAuthenticated && (
            <>
              {/* Profile */}
              <Button
                variant="ghost"
                className="h-10 px-3 rounded-full hover:bg-muted transition-colors"
                onClick={handleProfileClick}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userProfile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {(userProfile?.username?.[0] ?? "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="ml-2 text-sm font-bold text-[#050505] dark:text-white max-w-20 truncate">
                  {userProfile?.username || 'Usuario'}
                </span>
              </Button>

              {/* Plus Menu */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                title="Crear"
                onClick={() => setShowPostModal(true)}
              >
                <Plus className="h-5 w-5" />
              </Button>

              {/* Messenger */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 transition-colors relative"
                onClick={() => navigate("/messages")}
                title="Mensajes"
              >
                <MessageCircle className="h-5 w-5" />
                {pendingRequestsCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {pendingRequestsCount}
                  </Badge>
                )}
              </Button>

              {/* Notifications */}
              <NotificationDropdown
                triggerClassName="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 transition-colors relative shadow-sm ring-1 ring-black/5 hover:shadow-md"
                iconClassName="h-5 w-5"
                onOpen={handleNotificationClick}
              />

              {/* User Menu */}
              <UserMenu />
            </>
          )}
        </div>
      </div>

      {/* Full Screen Search for Desktop */}
      <FullScreenSearch 
        isOpen={showFullScreenSearch} 
        onClose={() => setShowFullScreenSearch(false)} 
      />
      <ModalPublicacionWeb
        isVisible={showPostModal}
        onClose={() => setShowPostModal(false)}
        initialPostType={null}
        userAvatar={userProfile?.avatar_url || user?.user_metadata?.avatar_url}
      />
    </nav>
  );
}