import { Link, NavLink } from "react-router-dom";

import {
  Bookmark,
  Briefcase,
  Home,
  Lightbulb,
  Plus,
  PlaySquare,
  TrendingUp,
  Users,
  HelpCircle,
  User,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useNavigation } from "@/components/navigation/use-navigation";
import { cn } from "@/lib/utils";
import { Fragment, useMemo } from "react";
import { useGroupsOverview } from "@/hooks/groups/use-groups-overview";
import { useAuth } from "@/providers/AuthProvider";

interface LeftSidebarProps {
  currentUserId?: string | null;
}

type SidebarItem = {
  icon: any;
  label: string;
  path: string;
  onClick?: () => void;
  badge?: string;
  dot?: boolean;
};

export function LeftSidebar({ currentUserId }: LeftSidebarProps = {}): JSX.Element {
  const { handleHomeClick } = useNavigation();
  const { user } = useAuth();
  const { data, isLoading: groupsLoading } = useGroupsOverview({ publicLimit: 12 });

  const { myGroups, recommendedGroups } = useMemo(() => {
    const rows = (data?.groups ?? []) as any[];
    const myIds = new Set((data?.myGroupIds ?? []).map((x) => String(x)));
    const mine = rows.filter((g) => myIds.has(String((g as any)?.id))).slice(0, 6);
    const recs = rows.filter((g) => !myIds.has(String((g as any)?.id))).slice(0, 6);
    return { myGroups: mine, recommendedGroups: recs };
  }, [data]);

  const menuItems: SidebarItem[] = [
    { icon: Home, label: "Feed", path: "/home", onClick: handleHomeClick },
    { icon: Lightbulb, label: "Ideas", path: "/ideas" },
    { icon: Briefcase, label: "Proyectos", path: "/projects" },
    { icon: Users, label: "Grupos", path: "/groups" },
    { icon: Bookmark, label: "Guardados", path: "/saved" },
  ];

  const quickActions: SidebarItem[] = [
    { icon: PlaySquare, label: "Reels", path: "/reels", badge: "Nuevo" },
    { icon: TrendingUp, label: "Tendencias", path: "/explore" },
    { icon: Users, label: "Personas", path: "/leaderboard" },
  ];

  const bottomItems: SidebarItem[] = [
    { icon: HelpCircle, label: "Ayuda", path: "/help" },
  ];

  const userAvatar = (user?.user_metadata as any)?.avatar_url;
  const userName = (user?.user_metadata as any)?.full_name || user?.email?.split('@')[0] || 'Usuario';

  return (
    <aside className="h-full w-[360px] bg-background/70 backdrop-blur flex flex-col">
      {/* User Profile Section */}
      <div className="px-4 pt-4 pb-3">
        <Link
          to="/profile"
          className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted/30 transition-colors"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={userAvatar || undefined} />
            <AvatarFallback>
              {userName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground">@{userName.toLowerCase().replace(/\s+/g, '')}</p>
          </div>
        </Link>
      </div>

      <Separator className="mx-4 opacity-50" />

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-3">
        {menuItems.map((item, index) => (
          <Fragment key={item.path}>
            <NavLink
              to={item.path}
              onClick={item.onClick}
              className={({ isActive }) =>
                cn(
                  "relative group flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-muted/30 text-foreground/80 font-medium"
                )
              }
            >
              {({ isActive }) => {
                const iconClassName = cn(
                  "h-5 w-5 transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                );
                return (
                  <>
                    <item.icon className={iconClassName} />
                    <span className="flex-1">{item.label}</span>
                  </>
                );
              }}
            </NavLink>

            {index < menuItems.length - 1 && <Separator className="my-1 opacity-0" />}
          </Fragment>
        ))}

        <Separator className="my-3 opacity-50" />

        {/* Quick Actions Section */}
        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide mb-2">
            Acciones Rápidas
          </p>
        </div>

        {quickActions.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={item.onClick}
            className={({ isActive }) =>
              cn(
                "relative group flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/30 text-foreground/80 font-medium"
              )
            }
          >
            {({ isActive }) => {
              const iconClassName = cn(
                "h-5 w-5 transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              );
              return (
                <>
                  <item.icon className={iconClassName} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        "text-[10px] leading-none px-2 py-0.5 rounded-full font-semibold",
                        item.badge === "Nuevo" ? "bg-primary/10 text-primary" : "bg-red-500 text-white"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              );
            }}
          </NavLink>
        ))}

        {/* Create Group Button */}
        <NavLink
          to="/groups/create"
          className={() =>
            cn(
              "group flex items-center gap-3 px-3 py-2.5 rounded-lg mt-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            )
          }
        >
          <Plus className="h-5 w-5" />
          <span className="flex-1">Crear grupo</span>
        </NavLink>

        <Separator className="my-3 opacity-50" />

        {/* Groups Section */}
        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide mb-2">
            Tus Grupos
          </p>
        </div>

        {groupsLoading ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">Cargando...</div>
        ) : myGroups.length > 0 ? (
          <div className="space-y-1">
            {myGroups.filter((g) => Boolean(g?.id)).map((g, idx) => (
              <Link
                key={String(g.id) || `my-group-${idx}`}
                to={`/groups/${g.slug || g.id}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={g.avatar_url || undefined} />
                  <AvatarFallback>{String(g.name || "G").slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-sm font-medium text-foreground/90">
                  {g.name}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <>
            <div className="px-3 py-2 text-sm text-muted-foreground">Aún no estás en ningún grupo</div>
            {recommendedGroups.length > 0 && (
              <>
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide">
                    Sugerencias
                  </p>
                </div>
                <div className="space-y-1">
                  {recommendedGroups.filter((g) => Boolean(g?.id)).map((g, idx) => (
                    <Link
                      key={String(g.id) || `rec-group-${idx}`}
                      to={`/groups/${g.slug || g.id}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={g.avatar_url || undefined} />
                        <AvatarFallback>{String(g.name || "G").slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate text-sm font-medium text-foreground/90">
                        {g.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <Separator className="my-3 opacity-50" />

        {/* Bottom Items */}
        {bottomItems.map((item, index) => (
          <Fragment key={item.path}>
            <NavLink
              to={item.path}
              onClick={item.onClick}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/30 text-foreground/80 font-medium"
                )
              }
            >
              {({ isActive }) => {
                const iconClassName = cn(
                  "h-5 w-5 transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                );
                return (
                  <>
                    <item.icon className={iconClassName} />
                    <span className="flex-1">{item.label}</span>
                  </>
                );
              }}
            </NavLink>

            {index < bottomItems.length - 1 && <Separator className="my-1 opacity-0" />}
          </Fragment>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-4 mt-auto">
        <div className="text-xs text-muted-foreground text-center">
          <Link to="/privacy" className="hover:underline">Privacidad</Link>
          <span className="mx-1">·</span>
          <Link to="/terms" className="hover:underline">Términos</Link>
          <span className="mx-1">·</span>
          <span>HIDEON 2026</span>
        </div>
      </div>
    </aside>
  );
}