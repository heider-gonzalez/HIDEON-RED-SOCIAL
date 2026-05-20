import { Home, Compass, MessageCircle, Bell, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { supabase } from "@/integrations/supabase/client";
import { usePostComposer } from "@/providers/PostComposerProvider";
import { useUnreadMessages } from "@/hooks/use-unread-messages";

interface MobileBottomNavigationProps {
  currentUserId: string | null;
  unreadNotifications: number;
  newPosts: number;
  pendingRequestsCount: number;
}

export function MobileBottomNavigation({
  currentUserId,
  unreadNotifications,
  newPosts,
  pendingRequestsCount
}: MobileBottomNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const isVisible = useScrollDirection();

  const { open: openComposer, isOpen: isComposerOpen } = usePostComposer();
  const { unreadMessages } = useUnreadMessages(currentUserId || undefined);
  const unreadMessagesCount = unreadMessages.reduce((total, msg) => total + msg.unread_count, 0);

  const navItems = [
    {
      icon: Home,
      label: "Inicio",
      path: "/home",
      badge: null,
    },
    {
      icon: Compass,
      label: "Explorar",
      path: "/explore",
      badge: null,
    },
    {
      icon: MessageCircle,
      label: "Mensajes",
      path: "/messages",
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
    },
    {
      icon: Bell,
      label: "Notificaciones",
      path: "/notifications",
      badge: unreadNotifications > 0 ? unreadNotifications : null,
    },
    {
      icon: User,
      label: "Perfil",
      path: currentUserId ? `/profile/${currentUserId}` : "/auth",
      badge: null,
    }
  ];

  return (
    <>
      <nav className={cn(
          "fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border/30 z-[60] md:hidden transition-transform duration-300",
          isVisible && !isComposerOpen ? "translate-y-0" : "translate-y-full"
        )}>
        <div className="grid grid-cols-5 items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.label === "Explorar" && location.pathname.startsWith('/explore')) ||
              (item.label === "Mensajes" && location.pathname.startsWith('/messages')) ||
              (item.label === "Notificaciones" && location.pathname.startsWith('/notifications')) ||
              (item.label === "Perfil" && location.pathname.startsWith('/profile') && currentUserId && location.pathname.includes(currentUserId));
            
            const Icon = item.icon;
            
            return (
              <button
                key={item.label}
                onClick={() => {
                  navigate(item.path);
                }}
                className="group flex flex-col items-center justify-center h-full relative gap-1 py-2"
              >
                <div className="relative">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                    isActive 
                      ? "bg-primary/20 text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}>
                    <Icon 
                      className="h-6 w-6" 
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  {item.badge && item.badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full p-0 flex items-center justify-center text-[10px] font-medium"
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
