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
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useNavigation } from "@/components/navigation/use-navigation";
import { cn } from "@/lib/utils";
import { Fragment, useMemo } from "react";
import { useGroupsOverview } from "@/hooks/groups/use-groups-overview";

interface LeftSidebarProps {
  currentUserId: string | null;
}

type SidebarItem = {
  icon: any;
  label: string;
  path: string;
  onClick?: () => void;
  badge?: string;
  dot?: boolean;
};

export function LeftSidebar({}: LeftSidebarProps) {
  const { handleHomeClick } = useNavigation();
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

  return (
    <aside className="h-full w-[300px] bg-background/70 backdrop-blur flex flex-col">
      <div className="px-3 pt-4 pb-2">
        <Link to="/home" className="flex items-center gap-3 px-2 pb-4">
        </Link>
        <Separator className="opacity-0" />
      </div>

      <nav className="flex-1 px-3">
        {menuItems.map((item, index) => (
          <Fragment key={item.path}>
            <NavLink
              to={item.path}
              onClick={item.onClick}
              className={({ isActive }) =>
                cn(
                  "relative group flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-1.5 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? "bg-blue-50 border border-blue-100"
                    : "hover:bg-muted/30"
                )
              }
            >
              {({ isActive }) => {
                const iconClassName = cn(
                  "h-[18px] w-[18px] transition-colors duration-200",
                  isActive ? "text-blue-600" : "text-muted-foreground"
                );
                const labelClassName = cn(
                  "flex-1 truncate",
                  isActive
                    ? "text-blue-600 font-semibold"
                    : "text-foreground/80 font-medium"
                );
                return (
                  <>
                    <item.icon className={iconClassName} />
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
          <p className="text-xs font-medium text-foreground/70">ACCIONES RÁPIDAS</p>
        </div>

        {quickActions.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={item.onClick}
            className={({ isActive }) =>
              cn(
                "relative group flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-1.5 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive ? "bg-blue-50 border border-blue-100" : "hover:bg-muted/30"
              )
            }
          >
            {({ isActive }) => {
              const iconClassName = cn(
                "h-[18px] w-[18px] transition-colors duration-200",
                isActive ? "text-blue-600" : "text-muted-foreground"
              );
              const labelClassName = cn(
                "flex-1 truncate",
                isActive
                  ? "text-blue-600 font-semibold"
                  : "text-foreground/80 font-medium"
              );
              return (
                <>
                  <item.icon className={iconClassName} />
                  <span className={labelClassName}>{item.label}</span>
                  {item.dot && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                  )}
                  {item.badge && (
                    <span
                      className={cn(
                        "ml-auto text-[11px] leading-none px-2 py-1 rounded-full font-semibold",
                        item.badge === "Nuevo"
                          ? "bg-blue-600/10 text-blue-600"
                          : "bg-red-500 text-white"
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

        <NavLink
          to="/groups/create"
          className={() =>
            cn(
              "group flex items-center gap-3 px-4 py-3 rounded-2xl mb-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-sm hover:shadow-md",
              "bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-600 hover:to-violet-600"
            )
          }
        >
          <Plus className="h-[18px] w-[18px] text-white" />
          <span className="truncate font-semibold text-white">Crear grupo</span>
        </NavLink>

        {groupsLoading ? (
          <div className="px-4 py-2 text-sm text-muted-foreground">Cargando...</div>
        ) : myGroups.length > 0 ? (
          <div className="mb-2">
            {myGroups.filter((g) => Boolean(g?.id)).map((g, idx) => (
              <Link
                key={String(g.id) || `my-group-${idx}`}
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
                  {recommendedGroups.filter((g) => Boolean(g?.id)).map((g, idx) => (
                    <Link
                      key={String(g.id) || `rec-group-${idx}`}
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
                  isActive ? "bg-blue-50 border border-blue-100" : "hover:bg-muted/30"
                )
              }
            >
              {({ isActive }) => {
                const iconClassName = cn(
                  "h-[18px] w-[18px] transition-colors duration-200",
                  isActive ? "text-blue-600" : "text-muted-foreground"
                );
                const labelClassName = cn(
                  "flex-1 truncate",
                  isActive ? "text-blue-600 font-semibold" : "text-foreground/80 font-medium"
                );
                return (
                  <>
                    <item.icon className={iconClassName} />
                    <span className={labelClassName}>{item.label}</span>
                  </>
                );
              }}
            </NavLink>

            {index < bottomItems.length - 1 && <Separator className="my-2 opacity-0" />}
          </Fragment>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 mt-auto">
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