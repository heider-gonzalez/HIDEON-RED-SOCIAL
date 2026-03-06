import { useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationDropdownHeader } from "./NotificationDropdownHeader";
import { NotificationGroups } from "./NotificationGroups";
import { NotificationTabs } from "./NotificationTabs";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface NotificationDropdownProps {
  triggerClassName?: string;
  iconClassName?: string;
  onOpen?: () => void;
}

export function NotificationDropdown({ triggerClassName, iconClassName, onOpen }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const { notifications, markAsRead, removeNotification } = useNotifications();
  const [hasUnread, setHasUnread] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (activeTab === 'friends') {
      setActiveTab('all');
    }
  }, [activeTab]);

  // Filter notifications by active tab
  const filteredNotifications = notifications.filter((notification) => {
    // Friends/requests removed globally
    if (["friend_request", "friend_accepted"].includes(notification.type)) return false;
    if (activeTab === "all") return true;
    if (activeTab === "comments") {
      return ["post_comment", "comment_reply", "mention"].includes(notification.type);
    }
    if (activeTab === "reactions") {
      return ["post_like", "story_reaction", "comment_like"].includes(notification.type);
    }
    return true;
  });

  // Group notifications by date
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const groupedNotifications = filteredNotifications.reduce(
    (acc, notification) => {
      const date = new Date(notification.created_at).toDateString();

      let group = "older";
      if (date === today) group = "today";
      else if (date === yesterday) group = "yesterday";

      if (!acc[group]) acc[group] = [];
      acc[group].push(notification);

      return acc;
    },
    { today: [], yesterday: [], older: [] },
  );

  // Calculate tab counts
  const tabCounts = {
    all: notifications.filter((n) => !n.read && !["friend_request", "friend_accepted"].includes(n.type)).length,
    comments: notifications.filter(
      (n) => !n.read && ["post_comment", "comment_reply", "mention"].includes(n.type)
    ).length,
    reactions: notifications.filter(
      (n) => !n.read && ["post_like", "story_reaction", "comment_like"].includes(n.type)
    ).length,
  };

  useEffect(() => {
    const hasUnreadNotifications = notifications.some(
      (notification) => !notification.read && !["friend_request", "friend_accepted"].includes(notification.type)
    );
    setHasUnread(hasUnreadNotifications);

    // Handle click outside to close dropdown if stuck
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifications, open]);

  const handleMarkAllAsRead = () => {
    markAsRead();
    setHasUnread(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate("/notifications");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      onOpen?.();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "relative rounded-full shadow-sm ring-1 ring-black/5 hover:shadow-md transition-all duration-200",
            open 
              ? "bg-blue-100 text-blue-600 ring-blue-200 dark:bg-blue-900/25 dark:text-blue-300 dark:ring-blue-800 shadow-lg" 
              : "text-foreground hover:bg-muted",
            triggerClassName
          )}
        >
          <Bell className={cn(
            iconClassName ?? "h-5 w-5", 
            open && "text-blue-600 dark:text-blue-300"
          )} />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-medium animate-pulse">
              {tabCounts.all > 9 ? "9+" : tabCounts.all}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      {/* Panel optimizado para móvil y desktop */}
      <PopoverContent
        ref={popoverRef}
        className={cn(
          "p-0 max-h-[80vh] overflow-hidden flex flex-col",
          // Desktop: posicionado a la derecha
          !isMobile && "w-96 fixed right-4 top-[56px] z-50",
          // Mobile: centrado en pantalla con márgenes seguros
          isMobile && "w-[calc(100vw-2rem)] fixed left-4 right-4 top-[60px] z-50 max-w-[400px]"
        )}
        align={isMobile ? "center" : "end"}
        sideOffset={isMobile ? 8 : 4}
        avoidCollisions={true}
      >
        <NotificationDropdownHeader
          hasUnread={hasUnread}
          onMarkAllAsRead={handleMarkAllAsRead}
          onViewAll={handleViewAll}
          onClose={handleClose}
        />
        
        <div className="px-3 py-2">
          <NotificationTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={tabCounts}
          />
        </div>

        <ScrollArea
          className={cn(
            "flex-1 h-[calc(80vh-120px)]",
            isMobile && "h-[calc(100vh-200px)]"
          )}
        >
          {filteredNotifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <Bell className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm">
                  {activeTab === "all" 
                    ? "Tienes todo al día por ahora" 
                    : `Por ahora no hay novedades de ${
                        activeTab === "comments" ? "comentarios" :
                        "reacciones"
                      }`
                  }
                </p>
              </div>
            </div>
          ) : (
            <>
              <NotificationGroups
                groupedNotifications={groupedNotifications}
                handleFriendRequest={() => {}}
                markAsRead={markAsRead}
                removeNotification={removeNotification}
                setOpen={setOpen}
              />
            </>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
