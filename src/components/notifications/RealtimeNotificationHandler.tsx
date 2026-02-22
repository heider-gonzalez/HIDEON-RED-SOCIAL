import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { NotificationType } from "@/types/notifications";

interface RealtimeNotificationHandlerProps {
  userId?: string;
}

export function RealtimeNotificationHandler({ userId }: RealtimeNotificationHandlerProps) {
  const { toast } = useToast();
  const {
    isEnabled,
    showMessageNotification,
    showHeartNotification,
    showReactionNotification,
    showCommentNotification,
    showFriendRequestNotification,
    updateBadge,
  } = usePushNotifications();

  const toastRef = useRef(toast);
  const isEnabledRef = useRef(isEnabled);
  const pushHandlersRef = useRef({
    showMessageNotification,
    showHeartNotification,
    showReactionNotification,
    showCommentNotification,
    showFriendRequestNotification,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

  useEffect(() => {
    pushHandlersRef.current = {
      showMessageNotification,
      showHeartNotification,
      showReactionNotification,
      showCommentNotification,
      showFriendRequestNotification,
    };
  }, [
    showMessageNotification,
    showHeartNotification,
    showReactionNotification,
    showCommentNotification,
    showFriendRequestNotification,
  ]);

  const showPushNotification = useCallback((notification: any, senderName: string) => {
    const {
      showMessageNotification: showMessage,
      showHeartNotification: showHeart,
      showReactionNotification: showReaction,
      showCommentNotification: showComment,
      showFriendRequestNotification: showFriendRequest,
    } = pushHandlersRef.current;

    switch (notification.type as NotificationType) {
      case 'profile_heart_received':
        showHeart(senderName, 'profile');
        break;

      case 'engagement_hearts_earned': {
        const heartsMatch = notification.message?.match(/(\d+)/);
        const hearts = heartsMatch ? parseInt(heartsMatch[1]) : 1;
        showHeart(senderName, 'engagement', hearts);
        break;
      }

      case 'post_like':
      case 'post_comment':
        if (notification.post_id) {
          supabase
            .from('posts')
            .select('content')
            .eq('id', notification.post_id)
            .single()
            .then(({ data }) => {
              if (data) {
                const postContent = data.content || 'tu publicación';
                if (notification.type === 'post_like') {
                  showReaction(senderName, postContent, notification.post_id);
                } else {
                  showComment(senderName, notification.message || 'comentó', notification.post_id);
                }
              }
            });
        }
        break;

      case 'friend_request':
        showFriendRequest(senderName, notification.sender_id);
        break;

      case 'message':
        showMessage(senderName, notification.message || 'Te envió un mensaje', notification.sender_id);
        break;

      default:
        showMessage(senderName, notification.message || 'Nueva notificación', notification.sender_id);
        break;
    }
  }, []);

  const setupRealtimeSubscription = useCallback(() => {
    if (!userId) return;

    console.log("🔔 Setting up realtime notification handler for user:", userId);

    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          console.log("🔔 New notification received:", payload);

          const notification = payload.new as any;

          // Get sender info
          const { data: senderData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', notification.sender_id)
            .single();

          const senderName = senderData?.username || 'Usuario desconocido';

          // Show toast immediately
          const toastTitle = getToastTitle(notification.type, senderName);
          const toastDescription = notification.message || getToastDescription(notification.type, senderName);

          toastRef.current({
            title: toastTitle,
            description: toastDescription,
          });

          // Show push notification if enabled
          if (isEnabledRef.current) {
            showPushNotification(notification, senderName);
          }

          // Emit custom event to update notification counter
          window.dispatchEvent(new CustomEvent('new-notification', {
            detail: { notification, senderName }
          }));
        }
      )
      .subscribe((status) => {
        console.log("🔔 Notification subscription status:", status);

        if (status === 'SUBSCRIBED') {
          reconnectAttemptsRef.current = 0; // Reset on successful subscription
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.warn("🔔 Notification subscription closed/error, attempting reconnect...");
          attemptReconnect();
        }
      });

    return channel;
  }, [userId, showPushNotification]);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error("🔔 Max reconnection attempts reached, giving up");
      return;
    }

    const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current); // Exponential backoff
    console.log(`🔔 Attempting reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      setupRealtimeSubscription();
    }, delay);
  }, [setupRealtimeSubscription]);

  useEffect(() => {
    const channel = setupRealtimeSubscription();

    return () => {
      console.log("🔔 Cleaning up notification handler");
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [setupRealtimeSubscription]);

  const getToastTitle = (type: NotificationType, senderName: string): string => {
    switch (type) {
      case 'profile_heart_received':
        return '❤️ Nuevo corazón';
      case 'engagement_hearts_earned':
        return '❤️ Corazones ganados';
      case 'post_like':
        return '👍 Nueva reacción';
      case 'post_comment':
        return '💬 Nuevo comentario';
      case 'friend_request':
        return '👥 Solicitud de amistad';
      case 'message':
        return '📨 Nuevo mensaje';
      case 'mention':
        return '📢 Te han mencionado';
      case 'idea_request':
        return '💡 Solicitud para tu idea';
      case 'idea_accepted':
        return '✅ Solicitud aceptada';
      case 'idea_rejected':
        return '❌ Solicitud rechazada';
      default:
        return '🔔 Nueva notificación';
    }
  };

  const getToastDescription = (type: NotificationType, senderName: string): string => {
    switch (type) {
      case 'profile_heart_received':
        return `${senderName} te envió un corazón`;
      case 'engagement_hearts_earned':
        return 'Has ganado corazones por tu actividad';
      case 'post_like':
        return `${senderName} reaccionó a tu publicación`;
      case 'post_comment':
        return `${senderName} comentó en tu publicación`;
      case 'friend_request':
        return `${senderName} quiere ser tu amigo`;
      case 'message':
        return `Mensaje de ${senderName}`;
      case 'mention':
        return `${senderName} te mencionó`;
      case 'idea_request':
        return `${senderName} solicitó unirse a tu idea`;
      case 'idea_accepted':
        return `${senderName} aceptó tu solicitud`;
      case 'idea_rejected':
        return `${senderName} rechazó tu solicitud`;
      default:
        return `Notificación de ${senderName}`;
    }
  };

  return null; // Este componente no renderiza nada
}