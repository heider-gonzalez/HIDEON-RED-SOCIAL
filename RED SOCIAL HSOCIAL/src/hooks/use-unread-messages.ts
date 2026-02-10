import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnreadMessage {
  channel_id: string;
  channel_name: string;
  sender_username: string;
  sender_avatar: string | null;
  message_content: string;
  unread_count: number;
  last_message_at: string;
}

export function useUnreadMessages(currentUserId?: string) {
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchUnreadMessages = async () => {
      setLoading(true);
      try {
        // Get unread messages from notifications table
        const { data: notifications, error } = await supabase
          .from('notifications')
          .select(`
            id,
            sender_id,
            message,
            created_at,
            read,
            sender:profiles!notifications_sender_id_fkey (
              username,
              avatar_url
            )
          `)
          .eq('receiver_id', currentUserId)
          .eq('type', 'message')
          .eq('read', false)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Group notifications by sender and count unread messages
        const groupedMessages = notifications?.reduce((acc: any[], notification) => {
          const existingGroup = acc.find(group => group.sender_id === notification.sender_id);
          
          if (existingGroup) {
            existingGroup.unread_count += 1;
            existingGroup.last_message_at = notification.created_at;
            existingGroup.message_content = notification.message;
          } else {
            acc.push({
              channel_id: notification.sender_id, // For private messages, use sender_id as channel_id
              channel_name: notification.sender?.username || 'Usuario desconocido',
              sender_username: notification.sender?.username || 'Usuario desconocido',
              sender_avatar: notification.sender?.avatar_url,
              message_content: notification.message,
              unread_count: 1,
              last_message_at: notification.created_at
            });
          }
          
          return acc;
        }, []) || [];

        setUnreadMessages(groupedMessages);
      } catch (error) {
        console.error('Error fetching unread messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadMessages();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `receiver_id=eq.${currentUserId}&type=eq.message&read=eq.false`
        },
        (payload) => {
          const newNotification = payload.new as any;
          
          setUnreadMessages(prev => {
            const existingGroup = prev.find(group => group.sender_id === newNotification.sender_id);
            
            if (existingGroup) {
              // Update existing group
              return prev.map(group =>
                group.sender_id === newNotification.sender_id
                  ? {
                      ...group,
                      unread_count: group.unread_count + 1,
                      last_message_at: newNotification.created_at,
                      message_content: newNotification.message
                    }
                  : group
              );
            } else {
              // Add new group
              return [
                {
                  channel_id: newNotification.sender_id,
                  channel_name: newNotification.sender?.username || 'Usuario desconocido',
                  sender_username: newNotification.sender?.username || 'Usuario desconocido',
                  sender_avatar: newNotification.sender?.avatar_url,
                  message_content: newNotification.message,
                  unread_count: 1,
                  last_message_at: newNotification.created_at
                },
                ...prev
              ];
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const getTotalUnreadCount = () => {
    return unreadMessages.reduce((total, message) => total + message.unread_count, 0);
  };

  const markAsRead = async (senderId: string) => {
    try {
      // Mark all messages from this sender as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('receiver_id', currentUserId)
        .eq('sender_id', senderId)
        .eq('type', 'message')
        .eq('read', false);

      // Update local state
      setUnreadMessages(prev => 
        prev.filter(message => message.sender_id !== senderId)
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  return {
    unreadMessages,
    loading,
    getTotalUnreadCount,
    markAsRead
  };
}
