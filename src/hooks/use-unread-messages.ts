import { useState, useEffect, useCallback } from 'react';
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

  const fetchUnreadMessages = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      // Build Supabase URL dynamically
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wgbbaxvuuinubkgffpiq.supabase.co';
      const functionUrl = `${supabaseUrl}/functions/v1/get-unread-messages`;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('🔔 No authenticated user, skipping unread messages fetch');
        return;
      }

      const accessToken = session.access_token;
      if (!accessToken) {
        console.log('🔔 No access token, skipping unread messages fetch');
        return;
      }

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const result = await response.json();
      const items = result?.unreadMessages;
      setUnreadMessages(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    fetchUnreadMessages();

    const resyncUnread = () => {
      if (!currentUserId) return;
      fetchUnreadMessages();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resyncUnread();
      }
    };

    const handleFocus = () => {
      resyncUnread();
    };

    const handleNewNotification = (event: Event) => {
      const detail = (event as CustomEvent | undefined)?.detail as any;
      const type = detail?.notification?.type ?? detail?.type;
      if (type !== 'message') return;
      resyncUnread();
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const data = (event as any)?.data;
      const type = data?.notification?.data?.type ?? data?.data?.type ?? data?.type;
      if (type !== 'message') return;
      resyncUnread();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('new-notification', handleNewNotification as EventListener);

    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `receiver_id=eq.${currentUserId}`
        },
        (payload) => {
          const newNotification = payload.new as any;

          if (newNotification?.type !== 'message') return;
          if (newNotification?.read !== false) return;
          
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `receiver_id=eq.${currentUserId}`
        },
        (payload) => {
          const updated = payload.new as any;
          const previous = payload.old as any;

          if (updated?.type !== 'message') return;

          const wasUnread = previous?.read === false;
          const isUnread = updated?.read === false;

          if (wasUnread === isUnread) return;

          // Avoid complex incremental logic; just resync for correctness.
          fetchUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('new-notification', handleNewNotification as EventListener);
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchUnreadMessages]);

  const getTotalUnreadCount = () => {
    const total = unreadMessages.reduce((total, message) => total + message.unread_count, 0);
    return total;
  };

  const markAsRead = useCallback(async (senderId: string) => {
    try {
      // Mark all messages from this sender as read
      const { error } = await (supabase
        .from('notifications') as any)
        .update({ read: true })
        .eq('receiver_id', currentUserId)
        .eq('sender_id', senderId)
        .eq('type', 'message')
        .eq('read', false);

      if (error) {
        console.error('Error marking messages as read (DB):', error);
        return;
      }

      // Update local state
      setUnreadMessages(prev => 
        prev.filter(message => message.channel_id !== senderId)
      );

      // Re-sync from server to avoid stuck counters
      await fetchUnreadMessages();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [currentUserId, fetchUnreadMessages]);

  return {
    unreadMessages,
    loading,
    getTotalUnreadCount,
    markAsRead
  };
}
