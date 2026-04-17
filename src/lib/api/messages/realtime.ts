import { supabase } from "@/integrations/supabase/client";
import type { Message } from "@/lib/api/messages/queries";

export const subscribeToRealtimeMessages = (
  channelId: string,
  onNewMessage: (message: Message) => void
) => {
  if (!channelId) {
    console.warn('Channel ID is required for realtime subscription');
    return () => {};
  }

  const channel = supabase
    .channel(`messages:${channelId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      },
      async (payload) => {
        try {
          // Fetch complete message data with author info
          const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .select(`
              *,
              profiles!inner(
                id,
                username,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (messageError) {
            console.error('Error fetching message details:', messageError);
            return;
          }

          if (messageData) {
            // Transform to match Message type
            const message: Message = {
              id: (messageData as any).id,
              contenido: (messageData as any).contenido,
              created_at: (messageData as any).created_at,
              id_autor: (messageData as any).id_autor,
              author: {
                username: (messageData as any).profiles?.username || 'Unknown',
                avatar_url: (messageData as any).profiles?.avatar_url || ''
              }
            } as Message;

            onNewMessage(message);
          }
        } catch (error) {
          console.error('Error processing realtime message:', error);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      },
      async (payload) => {
        // Handle message updates (e.g., read status, edits)
        console.log('Message updated:', payload);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to messages channel: ${channelId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Error subscribing to messages channel: ${channelId}`);
      }
    });

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToConversations = (
  userId: string,
  onConversationUpdate: () => void
) => {
  if (!userId) {
    console.warn('User ID is required for conversation subscription');
    return () => {};
  }

  const channel = supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `or=(receiver_id.eq.${userId},sender_id.eq.${userId})`
      },
      () => {
        // Trigger conversation list refresh
        onConversationUpdate();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to conversations for user: ${userId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Error subscribing to conversations for user: ${userId}`);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToTyping = (
  channelId: string,
  userId: string,
  onTypingStart: (typingUserId: string) => void,
  onTypingStop: (typingUserId: string) => void
) => {
  const channel = supabase
    .channel(`typing:${channelId}`)
    .on('broadcast', { event: 'typing_start' }, (payload) => {
      if (payload.payload.userId !== userId) {
        onTypingStart(payload.payload.userId);
      }
    })
    .on('broadcast', { event: 'typing_stop' }, (payload) => {
      if (payload.payload.userId !== userId) {
        onTypingStop(payload.payload.userId);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const sendTypingEvent = (
  channelId: string,
  userId: string,
  isTyping: boolean
) => {
  const channel = supabase.channel(`typing:${channelId}`);
  
  channel.send({
    type: 'broadcast',
    event: isTyping ? 'typing_start' : 'typing_stop',
    payload: { userId }
  });

  supabase.removeChannel(channel);
};

// Typing indicator management
export class TypingManager {
  private static instance: TypingManager;
  private typingUsers = new Map<string, Set<string>>();
  private typingTimeouts = new Map<string, NodeJS.Timeout>();

  static getInstance(): TypingManager {
    if (!TypingManager.instance) {
      TypingManager.instance = new TypingManager();
    }
    return TypingManager.instance;
  }

  startTyping(channelId: string, userId: string) {
    if (!this.typingUsers.has(channelId)) {
      this.typingUsers.set(channelId, new Set());
    }
    
    this.typingUsers.get(channelId)!.add(userId);
    
    // Clear existing timeout
    const existingTimeout = this.typingTimeouts.get(`${channelId}-${userId}`);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout to stop typing after 3 seconds
    const timeout = setTimeout(() => {
      this.stopTyping(channelId, userId);
    }, 3000);
    
    this.typingTimeouts.set(`${channelId}-${userId}`, timeout);
  }

  stopTyping(channelId: string, userId: string) {
    const channelUsers = this.typingUsers.get(channelId);
    if (channelUsers) {
      channelUsers.delete(userId);
    }
    
    const timeoutKey = `${channelId}-${userId}`;
    const timeout = this.typingTimeouts.get(timeoutKey);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(timeoutKey);
    }
  }

  getTypingUsers(channelId: string): string[] {
    return Array.from(this.typingUsers.get(channelId) || []);
  }

  isUserTyping(channelId: string, userId: string): boolean {
    return this.typingUsers.get(channelId)?.has(userId) || false;
  }
}

export const typingManager = TypingManager.getInstance();
