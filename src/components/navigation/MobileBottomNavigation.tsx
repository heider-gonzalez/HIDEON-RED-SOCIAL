import { Home, Users, PlusSquare, FolderOpen, Compass } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { supabase } from "@/integrations/supabase/client";
import { usePostComposer } from "@/providers/PostComposerProvider";

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

  const { open: openComposer } = usePostComposer();

  const iconStyles: Record<string, { bg: string; fg: string; activeBg: string; activeFg: string }> = {
    "/": { bg: "bg-muted", fg: "text-muted-foreground", activeBg: "bg-primary/10", activeFg: "text-primary" },
    "/home": { bg: "bg-muted", fg: "text-muted-foreground", activeBg: "bg-primary/10", activeFg: "text-primary" },
    "/groups": { bg: "bg-muted", fg: "text-muted-foreground", activeBg: "bg-primary/10", activeFg: "text-primary" },
    "/projects": { bg: "bg-muted", fg: "text-muted-foreground", activeBg: "bg-primary/10", activeFg: "text-primary" },
    "/explore": { bg: "bg-muted", fg: "text-muted-foreground", activeBg: "bg-primary/10", activeFg: "text-primary" },
    "__action__": { bg: "bg-primary/10", fg: "text-primary", activeBg: "bg-primary/20", activeFg: "text-primary" },
  };

  const defaultIconStyle = { bg: "bg-muted", fg: "text-foreground", activeBg: "bg-muted", activeFg: "text-foreground" };

  const getIconStyle = (path: string, isAction?: boolean) => {
    if (isAction) return iconStyles["__action__"];
    return iconStyles[path] ?? defaultIconStyle;
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfileAvatar = async () => {
      if (!currentUserId) {
        if (isMounted) setProfileAvatarUrl(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", currentUserId)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setProfileAvatarUrl(null);
        return;
      }

      setProfileAvatarUrl((data as any)?.avatar_url ?? null);
    };

    loadProfileAvatar();

    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  const navItems = [
    {
      icon: Home,
      label: "Inicio",
      path: "/",
      badge: newPosts > 0 ? newPosts : null,
    },
    {
      icon: Users,
      label: "Grupos",
      path: "/groups",
      badge: null,
    },
    {
      icon: PlusSquare,
      label: "Publicar",
      path: "/",
      badge: null,
      isAction: true,
    },
    {
      icon: FolderOpen,
      label: "Proyectos",
      path: "/projects",
      badge: null,
    },
    {
      icon: Compass,
      label: "Explorar",
      path: "/explore",
      badge: null,
    }
  ];

  return (
    <>
      <nav className={cn(
          "fixed bottom-0 left-0 right-0 bg-background border-t border-border z-[60] md:hidden transition-transform duration-300 pb-2",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}>
        <div className="grid grid-cols-5 items-center h-14">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.label === "Grupos" && location.pathname.startsWith('/groups')) ||
              (item.label === "Proyectos" && location.pathname.startsWith('/projects')) ||
              (item.label === "Explorar" && location.pathname.startsWith('/explore'));
            
            const Icon = item.icon;
            const style = getIconStyle(item.path, item.isAction);
            
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.isAction) {
                    // Show the publication modal directly
                    openComposer({
                      userAvatar: profileAvatarUrl || undefined,
                    });
                  } else {
                    if (item.path === "/") {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      window.dispatchEvent(new Event('hsocial:home_refresh'));
                    }
                    navigate(item.path);
                  }
                }}
                className="group flex flex-col items-center justify-center h-full relative gap-0.5"
              >
                <div className="relative">
                  {(() => {
                    const bubbleClassName = cn(
                      "h-10 w-10 rounded-full flex items-center justify-center transition-colors shadow-sm ring-1 ring-black/5 dark:ring-white/10 group-hover:shadow-md",
                      isActive ? style.activeBg : style.bg
                    );
                    const iconClassName = cn("h-6 w-6 transition-colors", isActive ? style.activeFg : style.fg);
                    return (
                      <span className={bubbleClassName}>
                        <span className={cn(item.label === "Explorar" && !isActive && "explore-attention")}>
                          <Icon className={iconClassName} strokeWidth={isActive ? 2 : 1.5} />
                        </span>
                      </span>
                    );
                  })()}
                  {item.badge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                </div>
                <span className={cn(
                  "text-[10px]",
                  isActive ? cn(style.activeFg, "font-medium") : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        </nav>
    </>
  );
}
