import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

interface TypingEvent {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: number;
}

interface OnlineUser {
  userId: string;
  lastSeen: number;
  isOnline: boolean;
}

export function usePresence(conversationId?: string) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());
  const [isTyping, setIsTyping] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const presenceTimeoutRef = useRef<NodeJS.Timeout>();
  const typingSendChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const globalPresenceSendChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!conversationId) {
      if (typingSendChannelRef.current) {
        supabase.removeChannel(typingSendChannelRef.current);
        typingSendChannelRef.current = null;
      }
      return;
    }

    const channel = supabase.channel(`presence-${conversationId}`);
    typingSendChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      if (typingSendChannelRef.current === channel) {
        typingSendChannelRef.current = null;
      }
    };
  }, [conversationId]);

  useEffect(() => {
    if (!user?.id) {
      if (globalPresenceSendChannelRef.current) {
        supabase.removeChannel(globalPresenceSendChannelRef.current);
        globalPresenceSendChannelRef.current = null;
      }
      return;
    }

    const channel = supabase.channel('global-presence');
    globalPresenceSendChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      if (globalPresenceSendChannelRef.current === channel) {
        globalPresenceSendChannelRef.current = null;
      }
    };
  }, [user?.id]);

  // Broadcast typing status
  const broadcastTyping = useCallback(async (typing: boolean) => {
    if (!user?.id || !conversationId) return;

    try {
      const channel = typingSendChannelRef.current;
      if (!channel) return;

      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          conversationId,
          isTyping: typing,
          timestamp: Date.now()
        } as TypingEvent
      });
    } catch (error) {
      console.error('Error broadcasting typing status:', error);
    }
  }, [user?.id, conversationId]);

  // Start typing
  const startTyping = useCallback(() => {
    if (isTyping) return;

    setIsTyping(true);
    broadcastTyping(true);

    // Auto-stop typing after 3 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [isTyping, broadcastTyping]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (!isTyping) return;

    setIsTyping(false);
    broadcastTyping(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = undefined;
    }
  }, [isTyping, broadcastTyping]);

  // Handle typing input
  const handleTyping = useCallback(() => {
    startTyping();
  }, [startTyping]);

  // Update presence (online status)
  const updatePresence = useCallback(async () => {
    if (!user?.id) return;

    try {
      const channel = globalPresenceSendChannelRef.current;
      if (!channel) return;

      await channel.send({
        type: 'broadcast',
        event: 'presence',
        payload: {
          userId: user.id,
          lastSeen: Date.now(),
          isOnline: true
        } as OnlineUser
      });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [user?.id]);

  // Mark user as online when component mounts
  useEffect(() => {
    if (user?.id) {
      updatePresence();

      // Update presence every 30 seconds
      const interval = setInterval(updatePresence, 30000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [user?.id, updatePresence]);

  // Listen for typing events in conversation
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`presence-${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const typingEvent = payload.payload as TypingEvent;

        if (typingEvent.userId === user?.id) return; // Ignore own events

        setTypingUsers(prev => {
          const newSet = new Set(prev);

          if (typingEvent.isTyping) {
            newSet.add(typingEvent.userId);

            // Auto-remove typing status after 5 seconds
            setTimeout(() => {
              setTypingUsers(current => {
                const updated = new Set(current);
                updated.delete(typingEvent.userId);
                return updated;
              });
            }, 5000);
          } else {
            newSet.delete(typingEvent.userId);
          }

          return newSet;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  // Listen for global presence events
  useEffect(() => {
    const channel = supabase
      .channel('global-presence')
      .on('broadcast', { event: 'presence' }, (payload) => {
        const presenceEvent = payload.payload as OnlineUser;

        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(presenceEvent.userId, presenceEvent);

          // Auto-mark as offline after 60 seconds of inactivity
          setTimeout(() => {
            setOnlineUsers(current => {
              const updated = new Map(current);
              const userPresence = updated.get(presenceEvent.userId);
              if (userPresence && Date.now() - userPresence.lastSeen > 60000) {
                updated.set(presenceEvent.userId, {
                  ...userPresence,
                  isOnline: false
                });
              }
              return updated;
            });
          }, 60000);

          return newMap;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (presenceTimeoutRef.current) {
        clearTimeout(presenceTimeoutRef.current);
      }
    };
  }, []);

  return {
    typingUsers,
    onlineUsers,
    isTyping,
    handleTyping,
    stopTyping,
    updatePresence
  };
}
