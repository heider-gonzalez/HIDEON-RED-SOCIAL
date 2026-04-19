import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Bell, MessageCircle, Compass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigation } from "./use-navigation";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useState, useEffect, useReducer } from "react";
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
import { CreateContentMenu } from "./CreateContentMenu";

interface TopNavigationProps {
  pendingRequestsCount: number;
}

type TopNavigationState = {
  isAuthenticated: boolean;
  userProfile: any;
};

type TopNavigationAction =
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_USER_PROFILE'; payload: any };

function topNavigationReducer(state: TopNavigationState, action: TopNavigationAction): TopNavigationState {
  switch (action.type) {
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    case 'SET_USER_PROFILE':
      return { ...state, userProfile: action.payload };
    default:
      return state;
  }
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
  const isMobile = useIsMobile();
  const [state, dispatch] = useReducer(topNavigationReducer, {
    isAuthenticated: false,
    userProfile: null,
  });

  const { isAuthenticated, userProfile } = state;
  const [showFullScreenSearch, setShowFullScreenSearch] = useState(false);
  const [showContentMenu, setShowContentMenu] = useState(false);
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
      const isAuthenticated = !!session;
      
      let userProfile = null;
      if (session?.user) {
        // Get user profile
        const { data } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', session.user.id)
          .single();
        userProfile = data;
      }
      
      // Consolidate state updates
      dispatch({ type: 'SET_AUTHENTICATED', payload: isAuthenticated });
      dispatch({ type: 'SET_USER_PROFILE', payload: userProfile });
    };
    
    checkAuth();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isAuthenticated = !!session;
      
      let userProfile = null;
      if (session?.user) {
        // Get user profile on auth change
        const { data } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', session.user.id)
          .single();
        userProfile = data;
      }
      
      // Consolidate state updates
      dispatch({ type: 'SET_AUTHENTICATED', payload: isAuthenticated });
      dispatch({ type: 'SET_USER_PROFILE', payload: userProfile });
    });

    return () => {
      authListener.subscription.unsubscribe();
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

  // Mobile navigation (con barra inferior estilo redes sociales)
  if (isMobile) {
    return (
      <nav className={cn(
        "bg-background/95 backdrop-blur border-b border-border/30 fixed top-0 left-0 right-0 z-[70] shadow-none"
      )}>
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo a la izquierda */}
          <HSocialLogo
            size="lg"
            showText={true}
            variant="brand"
            onClick={() => navigate(isAuthenticated ? "/home" : "/")}
          />
          
          {/* Acciones a la derecha */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-muted/40 text-muted-foreground hover:bg-muted/60"
              onClick={() => setShowContentMenu(true)}
              aria-label="Crear"
            >
              <Plus className="h-5 w-5" strokeWidth={1.5} />
            </Button>

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
        
        {/* Full Screen Search for Mobile */}
        <FullScreenSearch 
          isOpen={showFullScreenSearch} 
          onClose={() => setShowFullScreenSearch(false)} 
        />

        {/* Create Content Menu */}
        <CreateContentMenu
          open={showContentMenu}
          onOpenChange={setShowContentMenu}
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

        <div className="flex items-center gap-3 flex-shrink-0 w-[260px]">
          <HSocialLogo
            size="md"
            showText={true}
            onClick={() => navigate(isAuthenticated ? "/home" : "/")}
          />
        </div>

        <div className="flex items-center justify-center flex-1 min-w-0">
          <div className="w-full max-w-[680px] mx-auto flex items-center justify-center">
            <FriendSearch />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 w-[300px] justify-end">
          {isAuthenticated && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-muted/40 hover:bg-muted/60 transition-colors relative text-muted-foreground"
                onClick={() => navigate("/messages")}
                title="Mensajes"
              >
                <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
                {unreadMessagesCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadMessagesCount}
                  </Badge>
                )}
              </Button>

              <NotificationDropdown
                triggerClassName="h-10 w-10 rounded-full bg-muted/40 hover:bg-muted/60 transition-colors relative shadow-none ring-1 ring-border/30"
                iconClassName="h-5 w-5"
                onOpen={handleNotificationClick}
              />

              <Button
                variant="ghost"
                className="h-10 px-3 rounded-full hover:bg-muted transition-colors"
                onClick={handleProfileClick}
                title="Perfil"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userProfile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {(userProfile?.username?.[0] ?? "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="ml-2 text-sm font-semibold text-foreground/90 max-w-20 truncate">
                  {userProfile?.username || "Usuario"}
                </span>
              </Button>

              <UserMenu />
            </>
          )}
        </div>
      </div>

      <FullScreenSearch
        isOpen={showFullScreenSearch}
        onClose={() => setShowFullScreenSearch(false)}
      />

      {/* Create Content Menu */}
      <CreateContentMenu
        open={showContentMenu}
        onOpenChange={setShowContentMenu}
      />
    </nav>
  );
}