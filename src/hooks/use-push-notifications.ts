import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Verificar si el navegador soporta notificaciones
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      setIsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast({
        title: "No soportado",
        description: "Tu navegador no soporta notificaciones push",
        variant: "destructive"
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        setIsEnabled(true);
        toast({
          title: "¡Notificaciones activadas!",
          description: "Ahora recibirás notificaciones en tiempo real"
        });
        
        // Mostrar notificación de bienvenida
        showNotification(
          "H Social - Notificaciones activadas",
          "Ahora recibirás mensajes y notificaciones en tiempo real",
          "/favicon.ico"
        );
        
        return true;
      } else {
        toast({
          title: "Permisos denegados",
          description: "No podrás recibir notificaciones push",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast({
        title: "Error",
        description: "No se pudieron activar las notificaciones",
        variant: "destructive"
      });
      return false;
    }
  };

  const showNotification = (title: string, body: string, icon?: string, data?: any) => {
    if (!isEnabled || permission !== 'granted') return;

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        badge: "/favicon.ico",
        tag: data?.type || 'general',
        requireInteraction: false,
        silent: false,
        data: data
      });

      // Auto cerrar después de 5 segundos
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Manejar clicks en la notificación
      notification.onclick = () => {
        window.focus();
        
        // Navegar según el tipo de notificación
        if (data?.type === 'message') {
          // Ir a mensajes privados
          window.location.href = '/messages';
        } else if (data?.type === 'friend_request') {
          // Ir a notificaciones
          window.location.href = '/?tab=notifications';
        } else if (data?.postId) {
          // Ir al post específico
          window.location.href = `/post/${data.postId}`;
        } else if (data?.profileId) {
          // Ir al perfil
          window.location.href = `/profile/${data.profileId}`;
        }
        
        notification.close();
      };

    } catch (error) {
      console.error("Error showing notification:", error);
    }
  };

  const updateBadge = async (count: number) => {
    if ('setAppBadge' in navigator && 'clearAppBadge' in navigator) {
      try {
        if (count > 0) {
          await navigator.setAppBadge(count);
        } else {
          await navigator.clearAppBadge();
        }
      } catch (err) {
        console.warn('Badge update failed:', err);
      }
    }
  };

  const showMessageNotification = (sender: string, message: string, senderId?: string) => {
    showNotification(
      `Mensaje de ${sender}`,
      message,
      undefined,
      { type: 'message', senderId }
    );
    // Increment badge
    updateBadge(1);
  };

  const showHeartNotification = (sender: string, type: 'profile' | 'engagement', hearts?: number) => {
    const title = type === 'profile' 
      ? `${sender} te envió un corazón ❤️`
      : `¡Ganaste ${hearts} corazones! ❤️`;
      
    const body = type === 'profile'
      ? "Has recibido un nuevo corazón en tu perfil"
      : `Por tu actividad en la app`;
      
    showNotification(title, body, undefined, { type: 'heart', senderId: sender });
  };

  const showReactionNotification = (sender: string, postContent: string, postId?: string) => {
    showNotification(
      `${sender} reaccionó a tu post`,
      postContent.length > 50 ? `${postContent.substring(0, 50)}...` : postContent,
      undefined,
      { type: 'reaction', postId }
    );
  };

  const showCommentNotification = (sender: string, comment: string, postId?: string) => {
    showNotification(
      `${sender} comentó en tu post`,
      comment.length > 50 ? `${comment.substring(0, 50)}...` : comment,
      undefined,
      { type: 'comment', postId }
    );
  };

  const showFriendRequestNotification = (sender: string, senderId?: string) => {
    showNotification(
      "Nueva solicitud de amistad",
      `${sender} quiere ser tu amigo`,
      undefined,
      { type: 'friend_request', senderId }
    );
  };

  const disable = () => {
    setIsEnabled(false);
    toast({
      title: "Notificaciones desactivadas",
      description: "Ya no recibirás notificaciones push"
    });
  };

  return {
    isSupported,
    permission,
    isEnabled,
    requestPermission,
    showNotification,
    showMessageNotification,
    showHeartNotification,
    showReactionNotification,
    showCommentNotification,
    showFriendRequestNotification,
    updateBadge,
    disable
  };
}