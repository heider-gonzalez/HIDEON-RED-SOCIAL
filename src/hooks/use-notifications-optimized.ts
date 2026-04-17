import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { NotificationWithSender, NotificationType } from "@/types/notifications";
import { fetchNotifications } from "@/lib/notifications/fetch-notifications";
import { 
  handleFriendRequest as handleFriendRequestAction,
  markNotificationsAsRead,
  clearAllNotifications as clearAllNotificationsAction,
  removeNotification as removeNotificationAction
} from "@/lib/notifications/notification-actions";
import { useRealtimeManager } from "./use-realtime-manager";
import { formatNotificationMessage } from "@/lib/notifications/format-message";
import { notificationCache, cacheUtils, useSuperCache } from "./use-super-cache";
import { requireAuthUser } from "@/lib/auth/auth-store";

const INSTANT_CACHE_TTL = 30 * 1000; // 30 seconds for instant feel
const PRELOAD_LIMIT = 50; // Preload first 50 notifications

export const useNotificationsOptimized = () => {
  const [notifications, setNotifications] = useState<NotificationWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const { get, set, invalidate, preload } = useSuperCache({ 
    ttl: INSTANT_CACHE_TTL,
    maxSize: 200,
    persistToStorage: true,
    storageKey: 'notifications-instant'
  });
  const isMountedRef = useRef(true);
  const userIdRef = useRef<string | null>(null);

  const isFriendsNotification = (type: NotificationType) => {
    return type === 'friend_request' || type === 'friend_accepted';
  };

  // Instant cache check
  const getCachedNotifications = useCallback(async (userId: string) => {
    const cacheKey = cacheUtils.notificationKey(userId);
    const cached = get(cacheKey);
    
    if (cached) {
      const cachedArray = cached as NotificationWithSender[];
      setNotifications(cachedArray);
      setUnreadCount(cachedArray.filter(n => !n.read).length);
      return cachedArray;
    }
    
    return null;
  }, [get]);

  const loadNotifications = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    
    try {
      const user = requireAuthUser();
      if (!user || !isMountedRef.current) return;

      userIdRef.current = user.id;

      // Try cache first unless force refresh
      if (!forceRefresh) {
        const cached = await getCachedNotifications(user.id);
        if (cached) {
          setIsLoading(false);
          return;
        }
      }

      // Fetch from server
      const notificationsData = await fetchNotifications();
      
      if (!isMountedRef.current) return;
      
      const filteredNotifications = (notificationsData || [])
        .filter(n => !isFriendsNotification(n.type))
        .slice(0, PRELOAD_LIMIT);

      // Update cache instantly
      const cacheKey = cacheUtils.notificationKey(user.id);
      set(cacheKey, filteredNotifications, INSTANT_CACHE_TTL);
      
      // Update state
      setNotifications(filteredNotifications);
      setUnreadCount(filteredNotifications.filter(n => !n.read).length);
      
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [getCachedNotifications, set]);

  // Preload notifications on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      loadNotifications();
    }, 50); // Very small delay for instant feel

    return () => clearTimeout(timer);
  }, [loadNotifications]);

  // Realtime subscription with instant updates
  useEffect(() => {
    isMountedRef.current = true;
    const { subscribe } = useRealtimeManager();

    const unsubscribe = subscribe(
      `notifications:${userIdRef.current}`,
      (payload: any) => {
        if (!isMountedRef.current || !userIdRef.current) return;

        // Create notification object from payload
        const newNotification: NotificationWithSender = {
          id: payload.id || `temp-${Date.now()}`,
          type: payload.type as NotificationType,
          created_at: payload.created_at || new Date().toISOString(),
          message: payload.message,
          post_id: payload.post_id,
          comment_id: payload.comment_id,
          read: payload.read || false,
          sender_id: payload.sender_id || 'unknown',
          receiver_id: userIdRef.current,
          sender: {
            id: payload.sender?.id || payload.sender_id || 'unknown',
            username: payload.sender?.username || 'Usuario',
            avatar_url: payload.sender?.avatar_url || null,
            full_name: undefined
          },
          post_content: payload.post_content,
          post_media: payload.post_media,
          comment_content: payload.comment_content
        };

        if (isFriendsNotification(newNotification.type)) {
          return;
        }

        // Update cache instantly
        const cacheKey = cacheUtils.notificationKey(userIdRef.current);
        const cached = get(cacheKey) as NotificationWithSender[];
        
        if (cached) {
          const updatedCache = [newNotification, ...cached].slice(0, PRELOAD_LIMIT);
          set(cacheKey, updatedCache, INSTANT_CACHE_TTL);
        }

        // Update state instantly
        setNotifications((prev: NotificationWithSender[]) => [newNotification, ...prev].slice(0, PRELOAD_LIMIT));
        setUnreadCount((prev: number) => prev + (newNotification.read ? 0 : 1));
      },
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `receiver_id=eq.${userIdRef.current}`
      }
    );

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [get, set]);

  const handleFriendRequest = async (notificationId: string, senderId: string, accept: boolean) => {
    try {
      const success = await handleFriendRequestAction(notificationId, senderId, accept);
      
      if (success) {
        toast({
          title: accept ? "Solicitud aceptada" : "Solicitud rechazada",
          description: accept ? "Ahora son amigos" : "Has rechazado la solicitud de amistad",
        });
        
        // Remove from cache and state instantly
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        // Update cache
        if (userIdRef.current) {
          const cacheKey = cacheUtils.notificationKey(userIdRef.current);
          const cached = get(cacheKey) as NotificationWithSender[];
          if (cached) {
            const updatedCache = cached.filter(n => n.id !== notificationId);
            set(cacheKey, updatedCache, INSTANT_CACHE_TTL);
          }
        }
      } else {
        throw new Error("No se pudo procesar la solicitud");
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar la solicitud",
      });
    }
  };

  const markAsRead = async (notificationIds?: string[]) => {
    try {
      // Update state instantly for immediate feedback
      setNotifications(prev => 
        prev.map(notification => 
          notificationIds 
            ? notificationIds.includes(notification.id) 
              ? { ...notification, read: true } 
              : notification
            : { ...notification, read: true }
        )
      );
      
      // Update unread count instantly
      const markedAsRead = notificationIds 
        ? notifications.filter(n => notificationIds.includes(n.id) && !n.read).length
        : notifications.filter(n => !n.read).length;
      setUnreadCount(prev => Math.max(0, prev - markedAsRead));

      // Update cache instantly
      if (userIdRef.current) {
        const cacheKey = cacheUtils.notificationKey(userIdRef.current);
        const cached = get(cacheKey) as NotificationWithSender[];
        if (cached) {
          const updatedCache = cached.map(notification => 
            notificationIds 
              ? notificationIds.includes(notification.id) 
                ? { ...notification, read: true } 
                : notification
              : { ...notification, read: true }
          );
          set(cacheKey, updatedCache, INSTANT_CACHE_TTL);
        }
      }

      // Server call
      const success = await markNotificationsAsRead(notificationIds);
      
      if (!success) {
        throw new Error("No se pudieron marcar las notificaciones como leídas");
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron marcar las notificaciones como leídas",
      });
      
      // Reload on error to ensure consistency
      loadNotifications(true);
    }
  };

  const removeNotification = async (notificationId: string) => {
    try {
      // Update state instantly
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count
      const removedNotification = notifications.find(n => n.id === notificationId);
      if (removedNotification && !removedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Update cache instantly
      if (userIdRef.current) {
        const cacheKey = cacheUtils.notificationKey(userIdRef.current);
        const cached = get(cacheKey) as NotificationWithSender[];
        if (cached) {
          const updatedCache = cached.filter(n => n.id !== notificationId);
          set(cacheKey, updatedCache, INSTANT_CACHE_TTL);
        }
      }

      // Server call
      const success = await removeNotificationAction(notificationId);
      
      if (success) {
        toast({
          title: "Notificación eliminada",
          description: "La notificación ha sido eliminada",
        });
      } else {
        throw new Error("No se pudo eliminar la notificación");
      }
    } catch (error) {
      console.error('Error removing notification:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la notificación",
      });
      
      // Reload on error to ensure consistency
      loadNotifications(true);
    }
  };

  const clearAllNotifications = async () => {
    try {
      // Update state instantly
      setNotifications([]);
      setUnreadCount(0);

      // Update cache instantly
      if (userIdRef.current) {
        const cacheKey = cacheUtils.notificationKey(userIdRef.current);
        set(cacheKey, [], INSTANT_CACHE_TTL);
      }

      // Server call
      const success = await clearAllNotificationsAction();
      
      if (success) {
        toast({
          title: "Notificaciones eliminadas",
          description: "Todas las notificaciones han sido eliminadas",
        });
      } else {
        throw new Error("No se pudieron eliminar las notificaciones");
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron eliminar las notificaciones",
      });
      
      // Reload on error to ensure consistency
      loadNotifications(true);
    }
  };

  // Preload more notifications when scrolling
  const loadMoreNotifications = useCallback(async () => {
    if (!userIdRef.current || isLoading) return;

    try {
      const allNotifications = await fetchNotifications();
      const filtered = (allNotifications || [])
        .filter(n => !isFriendsNotification(n.type))
        .slice(notifications.length, notifications.length + 20);

      if (filtered.length > 0) {
        setNotifications(prev => [...prev, ...filtered]);
        
        // Update cache with new data
        const cacheKey = cacheUtils.notificationKey(userIdRef.current!);
        const cached = get(cacheKey) as NotificationWithSender[];
        if (cached) {
          const updatedCache = [...cached, ...filtered];
          set(cacheKey, updatedCache, INSTANT_CACHE_TTL);
        }
      }
    } catch (error) {
      console.error('Error loading more notifications:', error);
    }
  }, [notifications.length, isLoading, get, set]);

  return {
    notifications,
    isLoading,
    unreadCount,
    refresh: () => loadNotifications(true),
    handleFriendRequest,
    markAsRead,
    removeNotification,
    clearAllNotifications,
    loadMoreNotifications,
    // New instant methods
    markAllAsRead: () => markAsRead(),
    getCachedCount: () => {
      if (!userIdRef.current) return 0;
      const cached = get(cacheUtils.notificationKey(userIdRef.current)) as NotificationWithSender[];
      return cached ? cached.filter(n => !n.read).length : 0;
    }
  };
};

// Hook for instant notification badge
export const useNotificationBadge = () => {
  const { get } = useSuperCache();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const user = requireAuthUser();
      if (!user) return;

      const cached = get(cacheUtils.notificationKey(user.id));
      if (cached) {
        setCount((cached as any[]).filter(n => !n.read).length);
      }
    };

    updateCount();
    
    // Update count every 10 seconds from cache
    const interval = setInterval(updateCount, 10000);
    
    return () => clearInterval(interval);
  }, [get]);

  return count;
};

// Preload notifications for instant access
export const usePreloadNotifications = (userId: string | null) => {
  const { preload } = useSuperCache();

  useEffect(() => {
    if (!userId) return;

    // Preload notifications in background
    const timer = setTimeout(() => {
      preload([{
        key: cacheUtils.notificationKey(userId),
        fetcher: async () => {
          const data = await fetchNotifications();
          return data?.filter(n => !['friend_request', 'friend_accepted'].includes(n.type)) || [];
        },
        ttl: INSTANT_CACHE_TTL
      }]);
    }, 100); // Very small delay

    return () => clearTimeout(timer);
  }, [userId, preload]);
};
