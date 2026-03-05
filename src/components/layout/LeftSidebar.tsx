import { Link, NavLink } from "react-router-dom";
import {
  Bookmark,
  Briefcase,
  Home,
  Lightbulb,
  MessageCircle,
  Bell,
  Plus,
  PlaySquare,
  TrendingUp,
  User,
  UserPlus,
  Users,
  Settings,
  HelpCircle,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useNavigation } from "@/components/navigation/use-navigation";
import { cn } from "@/lib/utils";
import { Fragment, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LeftSidebarProps {
  currentUserId: string | null;
}

type SidebarItem = {
  icon: any;
  label: string;
  path: string;
  onClick?: () => void;
};

export function LeftSidebar({ currentUserId }: LeftSidebarProps) {
  useNavigation();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [recommendedGroups, setRecommendedGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const iconStyles: Record<string, { bg: string; fg: string; activeBg: string; activeFg: string }> = {};

  const defaultIconStyle = {
    bg: "bg-transparent",
    fg: "text-muted-foreground",
    activeBg: "bg-primary",
    activeFg: "text-primary-foreground",
  };

  const getIconStyle = (path: string) => iconStyles[path] ?? defaultIconStyle;

  const menuItems: SidebarItem[] = [
    { icon: Home, label: "Feed", path: "/home" },
    { icon: Lightbulb, label: "Ideas", path: "/ideas" },
    { icon: Briefcase, label: "Proyectos", path: "/projects" },
    { icon: UserPlus, label: "Amigos", path: "/friends" },
    { icon: Users, label: "Grupos", path: "/groups" },
    { icon: Bookmark, label: "Guardados", path: "/saved" },
  ];

  const quickActions: SidebarItem[] = [
    { icon: PlaySquare, label: "Reels", path: "/reels" },
    { icon: TrendingUp, label: "Tendencias", path: "/explore" },
    { icon: Bell, label: "Notificaciones", path: "/notifications" },
    { icon: MessageCircle, label: "Mensajes", path: "/messages" },
  ];

  const bottomItems: SidebarItem[] = [
    { icon: Settings, label: "Configuración", path: "/settings" },
    { icon: HelpCircle, label: "Ayuda", path: "/help" },
  ];

  // Load user profile
  useEffect(() => {
    if (!currentUserId) return;

    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', currentUserId)
        .single();
      setUserProfile(data);
    };

    loadProfile();
  }, [currentUserId]);

  useEffect(() => {
    let cancelled = false;

    const loadGroups = async () => {
      setGroupsLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        const [mine, publicGroups] = await Promise.all([
          userId
            ? (supabase as any).rpc("get_user_groups", { user_id_param: userId })
            : Promise.resolve({ data: [], error: null } as any),
          (supabase as any).rpc("get_public_groups", { limit_count: 12 }),
        ]);

        if (mine?.error) throw mine.error;
        if (publicGroups?.error) throw publicGroups.error;
        if (cancelled) return;

        const mineRows = (mine?.data ?? []) as any[];
        const publicRows = (publicGroups?.data ?? []) as any[];

        setMyGroups(mineRows.slice(0, 6));
        const mineIds = new Set(mineRows.map((g) => String(g?.id)).filter(Boolean));
        const recs = publicRows.filter((g) => !mineIds.has(String(g?.id))).slice(0, 6);
        setRecommendedGroups(recs);
      } catch {
        if (cancelled) return;
        setMyGroups([]);
        setRecommendedGroups([]);
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    };

    loadGroups();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  return (
    <aside className="h-full bg-muted/10 border-r border-border/20 overflow-y-auto custom-scrollbar">
      <div className="px-3 pt-4 pb-2">
        <div className="px-2 pb-2">
          <Link to={currentUserId ? "/home" : "/"} className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold">
              H
            </span>
            <span className="text-lg font-extrabold tracking-[0.22em] text-primary">HIDEON</span>
          </Link>
        </div>
        {currentUserId && userProfile && (
          <Link
            to={`/profile/${currentUserId}`}
            className="flex items-center space-x-3 p-2.5 rounded-2xl hover:bg-muted/40 transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile?.avatar_url || undefined} />
              <AvatarFallback>
                {userProfile?.username?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground/90">{userProfile?.username || "Mi perfil"}</p>
            </div>
          </Link>
        )}
      </div>

      <nav className="flex-1 px-3">
        {menuItems.map((item, index) => (
          <Fragment key={item.path}>
            <NavLink
              to={item.path}
              onClick={item.onClick}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-1.5 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? "bg-background/70 ring-1 ring-border/20"
                    : "hover:bg-background/50"
                )
              }
            >
              {({ isActive }) => {
                const style = getIconStyle(item.path);
                const iconWrapperClassName = cn(
                  "h-9 w-9 rounded-full flex items-center justify-center transition-colors duration-200 ease-out ring-1 ring-border/20",
                  isActive ? style.activeBg : style.bg
                );
                const iconClassName = cn(
                  "h-[18px] w-[18px] transition-colors duration-200",
                  isActive ? style.activeFg : style.fg
                );
                const labelClassName = cn(
                  "flex-1 truncate",
                  isActive
                    ? "text-foreground font-semibold"
                    : "text-foreground/80 font-medium"
                );
                return (
                  <>
                    <span className={iconWrapperClassName}>
                      <item.icon className={iconClassName} />
                    </span>
                    <span className={labelClassName}>{item.label}</span>
                  </>
                );
              }}
            </NavLink>
            {index < menuItems.length - 1 && <Separator className="my-2 opacity-0" />}
          </Fragment>
        ))}
        <Separator className="my-3 opacity-0" />

        <div className="px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">ACCIONES RÁPIDAS</p>
        </div>

        {quickActions.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={item.onClick}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-1.5 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive ? "bg-background/70 ring-1 ring-border/20" : "hover:bg-background/50"
              )
            }
          >
            {({ isActive }) => {
              const style = getIconStyle(item.path);
              const iconWrapperClassName = cn(
                "h-9 w-9 rounded-full flex items-center justify-center transition-colors duration-200 ease-out ring-1 ring-border/20",
                isActive ? style.activeBg : style.bg
              );
              const iconClassName = cn(
                "h-[18px] w-[18px] transition-colors duration-200",
                isActive ? style.activeFg : style.fg
              );
              const labelClassName = cn(
                "flex-1 truncate",
                isActive ? "text-foreground font-semibold" : "text-foreground/80 font-medium"
              );
              return (
                <>
                  <span className={iconWrapperClassName}>
                    <item.icon className={iconClassName} />
                  </span>
                  <span className={labelClassName}>{item.label}</span>
                </>
              );
            }}
          </NavLink>
        ))}

        <NavLink
          to="/groups/create"
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isActive ? "bg-muted/50" : "hover:bg-background/50"
            )
          }
        >
          {({ isActive }) => {
            const style = getIconStyle("/groups/create");
            const labelClassName = cn(
              "truncate",
              isActive
                ? "text-foreground font-semibold"
                : "text-foreground/80 font-medium"
            );
            return (
              <>
                <span
                  className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center transition-colors duration-200 ease-out ring-1 ring-border/20",
                    isActive ? style.activeBg : style.bg
                  )}
                >
                  <Plus
                    className={cn(
                      "h-[18px] w-[18px] transition-colors duration-200",
                      isActive ? style.activeFg : style.fg
                    )}
                  />
                </span>
                <span className={labelClassName}>Crear grupo</span>
              </>
            );
          }}
        </NavLink>

        <div className="h-px bg-border/0 my-2" />

        <div className="px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Mis grupos</p>
        </div>

        {groupsLoading ? (
          <div className="px-4 py-2 text-sm text-muted-foreground">Cargando...</div>
        ) : myGroups.length > 0 ? (
          <div className="mb-2">
            {myGroups.map((g) => (
              <Link
                key={String(g.id)}
                to={`/groups/${g.slug || g.id}`}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-background/50 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={g.avatar_url || undefined} />
                  <AvatarFallback>{String(g.name || "G").slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-sm font-medium text-foreground/85">
                  {g.name}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <>
            <div className="px-4 py-2 text-sm text-muted-foreground">Aún no estás en ningún grupo</div>
            {recommendedGroups.length > 0 && (
              <>
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">Sugerencias</p>
                </div>
                <div className="mb-2">
                  {recommendedGroups.map((g) => (
                    <Link
                      key={String(g.id)}
                      to={`/groups/${g.slug || g.id}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-background/50 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={g.avatar_url || undefined} />
                        <AvatarFallback>{String(g.name || "G").slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate text-sm font-medium text-foreground/85">
                        {g.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        <Separator className="my-3 opacity-0" />

        {bottomItems.map((item, index) => (
          <Fragment key={item.path}>
            <NavLink
              to={item.path}
              onClick={item.onClick}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-1.5 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive ? "bg-background/70 ring-1 ring-border/20" : "hover:bg-background/50"
                )
              }
            >
              {({ isActive }) => {
                const style = getIconStyle(item.path);
                const iconWrapperClassName = cn(
                  "h-9 w-9 rounded-full flex items-center justify-center transition-colors duration-200 ease-out ring-1 ring-border/20",
                  isActive ? style.activeBg : style.bg
                );
                const iconClassName = cn(
                  "h-[18px] w-[18px] transition-colors duration-200",
                  isActive ? style.activeFg : style.fg
                );
                const labelClassName = cn(
                  "flex-1 truncate",
                  isActive ? "text-foreground font-semibold" : "text-foreground/80 font-medium"
                );
                return (
                  <>
                    <span className={iconWrapperClassName}>
                      <item.icon className={iconClassName} />
                    </span>
                    <span className={labelClassName}>{item.label}</span>
                  </>
                );
              }}
            </NavLink>
            {index < bottomItems.length - 1 && <Separator className="my-2 opacity-0" />}
          </Fragment>
        ))}
      </nav>
    </aside>
  );
}