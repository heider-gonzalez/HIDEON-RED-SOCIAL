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
  const debug = import.meta.env.DEV;
  if (debug) console.log('🔔 useUnreadMessages HOOK MOUNTED - currentUserId:', currentUserId);
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchUnreadMessages = async () => {
      if (debug) console.log('🔔 fetchUnreadMessages - START');
      setLoading(true);
      try {
        if (debug) console.log('🔔 fetchUnreadMessages - currentUserId:', currentUserId);

        const { data, error } = await supabase.functions.invoke('get-unread-messages');
        if (error) {
          if (debug) console.error('🔔 fetchUnreadMessages invoke error:', error);
          throw error;
        }

        const items = (data as any)?.unreadMessages;
        setUnreadMessages(Array.isArray(items) ? items : []);
        if (debug) console.log('🔔 fetchUnreadMessages - STATE UPDATED');
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
            const existingGroup = prev.find(group => group.channel_id === newNotification.sender_id);
            
            if (existingGroup) {
              // Update existing group
              return prev.map(group =>
                group.channel_id === newNotification.sender_id
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
                  channel_name: `Usuario ${newNotification.sender_id?.slice(0, 8)}`,
                  sender_username: `Usuario ${newNotification.sender_id?.slice(0, 8)}`,
                  sender_avatar: null,
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
    const total = unreadMessages.reduce((total, message) => total + message.unread_count, 0);
    if (debug) console.log('🔔 useUnreadMessages - unreadMessages:', unreadMessages, 'total:', total);
    return total;
  };

  const markAsRead = async (senderId: string) => {
    try {
      // Mark all messages from this sender as read
      await (supabase
        .from('notifications') as any)
        .update({ read: true })
        .eq('receiver_id', currentUserId)
        .eq('sender_id', senderId)
        .eq('type', 'message')
        .eq('read', false);

      // Update local state
      setUnreadMessages(prev => 
        prev.filter(message => message.channel_id !== senderId)
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
