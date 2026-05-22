
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Check, Search, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAcceptIdeaRequest, useRejectIdeaRequest } from "@/hooks/ideas/use-idea-requests";

const Notifications = () => {
  const { notifications, markAsRead, clearAllNotifications, removeNotification, isLoading } = useNotifications();
  const navigate = useNavigate();
  const acceptIdeaRequest = useAcceptIdeaRequest();
  const rejectIdeaRequest = useRejectIdeaRequest();
  
  // Agrupar notificaciones por fecha
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  const groupedNotifications = notifications.reduce((acc, notification) => {
    const date = new Date(notification.created_at).toDateString();
    
    let group = "older";
    if (date === today) group = "today";
    else if (date === yesterday) group = "yesterday";
    
    if (!acc[group]) acc[group] = [];
    acc[group].push(notification);
    
    return acc;
  }, { today: [], yesterday: [], older: [] });

  const handleIdeaRequest = async (notification: any, accept: boolean) => {
    try {
      if (!notification?.post_id || !notification?.sender?.id) return;

      const rawMessage: string = notification.message || '';
      const professionMatch = rawMessage.match(/Habilidad\/Profesión:\s*(.*)$/i);
      const profession = professionMatch?.[1]?.trim() || null;

      if (accept) {
        await acceptIdeaRequest.mutateAsync({
          postId: notification.post_id,
          userId: notification.sender.id,
          profession,
        });
      } else {
        await rejectIdeaRequest.mutateAsync({
          postId: notification.post_id,
          userId: notification.sender.id,
        });
      }

      markAsRead([notification.id]);
    } catch (e) {
      console.error('Error handling idea request:', e);
    }
  };

  const handleOpenChat = (senderId: string) => {
    navigate(`/messages?user=${senderId}`);
  };
  
  const filteredNotifications = notifications.filter(
    (n: any) => !['friend_request', 'friend_accepted'].includes(n.type)
  );
  const hasUnread = filteredNotifications.some((n: any) => !n.read);

  const handleNotificationClick = (notification: any) => {
    if (notification.post_id && notification.comment_id) {
      navigate(`/post/${notification.post_id}?comment=${notification.comment_id}`);
    } else if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    }
    
    if (!notification.read) {
      markAsRead([notification.id]);
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-2xl mx-auto px-4">
        <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Cerrar"
                onClick={() => navigate("/")}
              >
                <X className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Novedades</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buscar">
                <Search className="h-5 w-5" />
              </Button>
              {hasUnread && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => markAsRead()}
                >
                  <Check className="h-4 w-4" />
                  <span className="hidden sm:inline">Marcar como vistas</span>
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 text-destructive hover:text-destructive"
                  onClick={() => clearAllNotifications()}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Limpiar todo</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <Card className="mt-3">
          <ScrollArea className="h-[calc(100vh-220px)] md:h-[calc(100vh-240px)]">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Cuando haya algo nuevo, lo verás por aquí.
              </div>
            ) : (
              <>
                {groupedNotifications.today.length > 0 && (
                  <>
                    <div className="p-2 bg-muted/50 text-sm font-medium">
                      Hoy
                    </div>
                    {groupedNotifications.today
                      .filter((n: any) => !['friend_request', 'friend_accepted'].includes(n.type))
                      .map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onClick={() => handleNotificationClick(notification)}
                          onMarkAsRead={() => markAsRead([notification.id])}
                          onRemove={() => removeNotification(notification.id)}
                          onHandleIdeaRequest={(notificationId, senderId, accept) => handleIdeaRequest(notification, accept)}
                          onOpenChat={handleOpenChat}
                        />
                      ))}
                  </>
                )}

                {groupedNotifications.yesterday.length > 0 && (
                  <>
                    <div className="p-2 bg-muted/50 text-sm font-medium">
                      Ayer
                    </div>
                    {groupedNotifications.yesterday
                      .filter((n: any) => !['friend_request', 'friend_accepted'].includes(n.type))
                      .map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onClick={() => handleNotificationClick(notification)}
                          onMarkAsRead={() => markAsRead([notification.id])}
                          onRemove={() => removeNotification(notification.id)}
                        />
                      ))}
                  </>
                )}

                {groupedNotifications.older.length > 0 && (
                  <>
                    <div className="p-2 bg-muted/50 text-sm font-medium">
                      Anteriores
                    </div>
                    {groupedNotifications.older
                      .filter((n: any) => !['friend_request', 'friend_accepted'].includes(n.type))
                      .map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onClick={() => handleNotificationClick(notification)}
                          onMarkAsRead={() => markAsRead([notification.id])}
                          onRemove={() => removeNotification(notification.id)}
                          onHandleIdeaRequest={(notificationId, senderId, accept) => handleIdeaRequest(notification, accept)}
                          onOpenChat={handleOpenChat}
                        />
                      ))}
                  </>
                )}
              </>
            )}
          </ScrollArea>
        </Card>
      </div>
    </Layout>
  );
};

export default Notifications;

export default Notifications;
