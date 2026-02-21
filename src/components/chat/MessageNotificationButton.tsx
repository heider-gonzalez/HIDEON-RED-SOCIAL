import { useState, useEffect } from "react";
import { MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useChatSystem } from "@/hooks/use-chat-system";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { supabase } from "@/integrations/supabase/client";

interface MessageNotificationButtonProps {
  currentUserId?: string;
  className?: string;
}

export function MessageNotificationButton({ currentUserId, className }: MessageNotificationButtonProps) {
  const { openChat } = useChatSystem();
  const [showConversations, setShowConversations] = useState(false);
  const { unreadMessages, loading, getTotalUnreadCount, markAsRead } = useUnreadMessages(currentUserId);

  const totalUnread = getTotalUnreadCount();

  const handleOpenChat = (message: any) => {
    // Mark messages as read
    markAsRead(message.sender_id);
    
    // Open chat window
    openChat(message.sender_id, message.sender_username, message.sender_avatar);
    setShowConversations(false);
  };

  const handleToggleConversations = () => {
    setShowConversations(!showConversations);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleConversations}
        className={cn(
          "relative flex items-center justify-center p-2 rounded-lg transition-colors hover:bg-muted/50",
          className
        )}
        aria-label="Mensajes"
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </Badge>
        )}
      </Button>

      {/* Floating Conversations List */}
      {showConversations && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setShowConversations(false)}
          />
          
          {/* Conversations Panel */}
          <Card className="absolute top-12 right-0 w-80 max-h-96 z-40 shadow-lg border border-border">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Conversaciones
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConversations(false)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 animate-pulse">
                      <div className="h-10 w-10 bg-muted rounded-full"></div>
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : unreadMessages.length > 0 ? (
                <div className="py-2">
                  {unreadMessages.map((message) => (
                    <div
                      key={message.sender_id}
                      onClick={() => handleOpenChat(message)}
                      className="flex items-center space-x-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={message.sender_avatar || undefined} />
                          <AvatarFallback>
                            {message.sender_username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {message.unread_count > 0 && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-xs text-primary-foreground font-medium">
                              {message.unread_count}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {message.sender_username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {message.message_content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay conversaciones recientes</p>
                </div>
              )}
            </div>

            <Separator />
            
            <div className="p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowConversations(false);
                  // Could navigate to full messages page if needed
                }}
                className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10"
              >
                <Users className="h-4 w-4 mr-2" />
                Ver chat grupal
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}