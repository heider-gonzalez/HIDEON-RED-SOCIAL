import { Link, NavLink } from "react-router-dom";
import {
  Bookmark,
  Briefcase,
  Lightbulb,
  Plus,
  User,
  UserPlus,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useNavigation } from "@/components/navigation/use-navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Fragment, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LeftSidebarProps {
  currentUserId: string | null;
  pendingRequestsCount?: number;
}

type SidebarItem = {
  icon: any;
  label: string;
  path: string;
  onClick?: () => void;
};

export function LeftSidebar({ currentUserId, pendingRequestsCount }: LeftSidebarProps) {
  useNavigation();
  const debug = import.meta.env.DEV;
  if (debug) console.log(' LeftSidebar - currentUserId prop:', currentUserId);
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
    { icon: Lightbulb, label: "Ideas", path: "/ideas" },
    { icon: Briefcase, label: "Proyectos", path: "/projects" },
    { icon: Users, label: "Grupos", path: "/groups" },
    { icon: Bookmark, label: "Guardados", path: "/saved" },
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
    <aside className="h-full bg-card border-r border-border overflow-y-auto custom-scrollbar">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-[#050505] dark:text-white [.tech_&]:text-white">Panel</h2>
      </div>

      <div className="px-4 pb-4">
        {currentUserId && userProfile && (
          <Link
            to={`/profile/${currentUserId}`}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile?.avatar_url || undefined} />
              <AvatarFallback>
                {userProfile?.username?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold text-[#050505] dark:text-white [.tech_&]:text-white">{userProfile?.username || "Mi perfil"}</p>
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
                  "group flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive ? "bg-primary/5" : "hover:bg-muted/50"
                )
              }
            >
              {({ isActive }) => {
                const style = getIconStyle(item.path);
                const iconWrapperClassName = cn(
                  "h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 ease-out ring-1 ring-border/60 dark:ring-border/50 group-hover:shadow-sm group-hover:scale-[1.03] group-active:scale-[0.99]",
                  isActive ? style.activeBg : style.bg
                );
                const iconClassName = cn(
                  "h-5 w-5 transition-colors duration-200 group-hover:opacity-90",
                  isActive ? style.activeFg : style.fg
                );
                const labelClassName = cn(
                  "flex-1 truncate",
                  isActive
                    ? "text-[#050505] dark:text-white [.tech_&]:text-white font-semibold"
                    : "text-[#1C1E21] dark:text-slate-200 [.tech_&]:text-slate-200 font-medium"
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
            {index < menuItems.length - 1 && <Separator className="my-3" />}
          </Fragment>
        ))}
        <Separator className="my-3" />

        <NavLink
          to="/groups/create"
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isActive ? "bg-primary/5" : "hover:bg-muted/50"
            )
          }
        >
          {({ isActive }) => {
            const style = getIconStyle("/groups/create");
            const labelClassName = cn(
              "truncate",
              isActive
                ? "text-[#050505] dark:text-white [.tech_&]:text-white font-semibold"
                : "text-[#1C1E21] dark:text-slate-200 [.tech_&]:text-slate-200 font-medium"
            );
            return (
              <>
                <span
                  className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 ease-out ring-1 ring-border/60 dark:ring-border/50 group-hover:shadow-sm group-hover:scale-[1.03] group-active:scale-[0.99]",
                    isActive ? style.activeBg : style.bg
                  )}
                >
                  <Plus
                    className={cn(
                      "h-5 w-5 transition-colors duration-200 group-hover:opacity-90",
                      isActive ? style.activeFg : style.fg
                    )}
                  />
                </span>
                <span className={labelClassName}>Crear grupo</span>
              </>
            );
          }}
        </NavLink>

        <div className="h-px bg-border my-3" />

        <div className="px-4 py-1">
          <p className="text-xs font-semibold text-muted-foreground">Grupos en los que estoy</p>
        </div>

        {groupsLoading ? (
          <div className="px-4 py-2 text-sm text-muted-foreground">Cargando...</div>
        ) : myGroups.length > 0 ? (
          <div className="mb-2">
            {myGroups.map((g) => (
              <Link
                key={String(g.id)}
                to={`/groups/${g.slug || g.id}`}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={g.avatar_url || undefined} />
                  <AvatarFallback>{String(g.name || "G").slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-sm font-medium text-[#1C1E21] dark:text-slate-200 [.tech_&]:text-slate-200">
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
                <div className="px-4 py-1">
                  <p className="text-xs font-semibold text-muted-foreground">Recomendados</p>
                </div>
                <div className="mb-2">
                  {recommendedGroups.map((g) => (
                    <Link
                      key={String(g.id)}
                      to={`/groups/${g.slug || g.id}`}
                      className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={g.avatar_url || undefined} />
                        <AvatarFallback>{String(g.name || "G").slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate text-sm font-medium text-[#1C1E21] dark:text-slate-200 [.tech_&]:text-slate-200">
                        {g.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </nav>
    </aside>
  );
}