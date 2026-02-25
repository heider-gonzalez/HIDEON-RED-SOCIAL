import { useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationDropdownHeader } from "./NotificationDropdownHeader";
import { NotificationGroups } from "./NotificationGroups";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface NotificationDropdownProps {
  triggerClassName?: string;
  iconClassName?: string;
  onOpen?: () => void;
}

export function NotificationDropdown({ triggerClassName, iconClassName, onOpen }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const { notifications, markAsRead, removeNotification, isLoading } = useNotifications();
  const [hasUnread, setHasUnread] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const filteredNotifications = notifications.filter((notification) => {
    if (["friend_request", "friend_accepted"].includes(notification.type)) return false;
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

  const unreadCount = notifications.filter(
    (n) => !n.read && !["friend_request", "friend_accepted"].includes(n.type)
  ).length;

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

  const handleMobileNavigate = () => {
    navigate("/notifications");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      onOpen?.();
    }
  };

  const isActive = open || (isMobile && location.pathname.startsWith("/notifications"));

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "relative rounded-full shadow-sm ring-1 ring-black/5 hover:shadow-md transition-all duration-200",
        isActive
          ? "bg-blue-100 text-blue-600 ring-blue-200 dark:bg-blue-900/25 dark:text-blue-300 dark:ring-blue-800 shadow-lg"
          : "text-foreground hover:bg-muted",
        triggerClassName
      )}
      onClick={isMobile ? handleMobileNavigate : undefined}
    >
      <Bell className={cn(iconClassName ?? "h-5 w-5", isActive && "text-blue-600 dark:text-blue-300")} />
      {hasUnread && (
        <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-medium animate-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );

  const content = (
    <>
      <NotificationDropdownHeader
        hasUnread={hasUnread}
        onMarkAllAsRead={handleMarkAllAsRead}
        onViewAll={handleViewAll}
        onClose={handleClose}
      />

      <ScrollArea className={"max-h-[calc(80vh-120px)]"}>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            Tienes todo al día por ahora
          </div>
        ) : (
          <NotificationGroups
            groupedNotifications={groupedNotifications}
            handleFriendRequest={() => {}}
            markAsRead={markAsRead}
            removeNotification={removeNotification}
            setOpen={setOpen}
          />
        )}
      </ScrollArea>
    </>
  );

  if (isMobile) {
    return trigger;
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        ref={popoverRef}
        className="w-96 p-0 fixed right-4 top-[56px] z-50 max-h-[80vh] overflow-hidden"
        align="end"
        sideOffset={4}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
