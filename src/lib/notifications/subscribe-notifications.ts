import { supabase } from "@/integrations/supabase/client";
import type { NotificationWithSender, NotificationType } from "@/types/notifications";
import { formatNotificationMessage } from "./format-message";

function safePlayNotificationSound() {
  try {
    const notificationSound = new Audio("/notification.mp3");
    notificationSound.play().catch((err: any) => {
      const name = String(err?.name || "");
      // AbortError/NotAllowedError son comunes por políticas del browser o interrupciones.
      if (name === "AbortError" || name === "NotAllowedError") return;
    });
  } catch {
    // ignore
  }
}

let subscriptionManager: any = null;
let removeChannelCallback: (() => void) | null = null;
let retryAttempt = 0;
let retryTimeoutId: NodeJS.Timeout | null = null;
let subscriptionGeneration = 0;
const MAX_RETRY_ATTEMPTS = 5;
let lastNotifStatus: string | null = null;

// Create a simple subscription manager for notifications
function createNotificationSubscriptionManager() {
  let currentChannel: any = null;
  let pendingSubscription: Promise<string> | null = null;
  let isActive = true;

  const safeRemove = () => {
    if (!currentChannel) return;
    const ch = currentChannel;
    currentChannel = null;
    pendingSubscription = null;
    try {
      supabase.removeChannel(ch);
    } catch (e) {
      console.warn('Error removing notifications channel:', e);
    }
  };
  
  return {
    getOrCreateChannel: (channelName: string, setupCallback: (channel: any) => void) => {
      if (!isActive) {
        return Promise.reject(new Error('Notifications subscription manager is inactive'));
      }
      if (currentChannel) {
        return Promise.resolve("SUBSCRIBED");
      }

      if (pendingSubscription) {
        return pendingSubscription;
      }
      
      currentChannel = supabase.channel(channelName);
      setupCallback(currentChannel);
      
      pendingSubscription = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          safeRemove();
          reject(new Error("Subscription timeout after 120 seconds"));
        }, 120000);

        currentChannel.subscribe((status: string) => {
          if (import.meta.env.DEV && lastNotifStatus !== status) {
            lastNotifStatus = status;
            console.log(`Notifications channel subscription status: ${status}`);
          }
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            pendingSubscription = null;
            resolve(status);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout);
            safeRemove();
            reject(new Error(`Subscription failed with status: ${status}`));
          }
        });
      });

      return pendingSubscription;
    },
    
    removeChannel: () => {
      safeRemove();
    }
  };
}

export function subscribeToNotifications(
  callback: (notification: NotificationWithSender) => void,
  toastCallback: (title: string, description: string) => void
) {
  const myGeneration = ++subscriptionGeneration;

  // Reset retry attempt on fresh subscribe
  retryAttempt = 0;
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }

  // Remove existing subscription if it exists
  if (removeChannelCallback) {
    removeChannelCallback();
    removeChannelCallback = null;
  }

  // Create subscription manager if not exists
  if (!subscriptionManager) {
    subscriptionManager = createNotificationSubscriptionManager();
  }

  // Use a stable channel name (supabase manages multiplexing). We also filter by receiver_id.
  const channelName = `notifications`;

  const subscriptionPromise = subscriptionManager.getOrCreateChannel(channelName, (channel: any) => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const filter = user?.id ? `receiver_id=eq.${user.id}` : undefined;

      channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        ...(filter ? { filter } : {}),
      },
      async (payload: any) => {
        try {
          // Check if sender_id exists
          if (!payload.new.sender_id) {
            console.warn('Received notification without sender_id:', payload.new);
            const systemNotification: NotificationWithSender = {
              id: payload.new.id,
              type: payload.new.type as NotificationType,
              created_at: payload.new.created_at,
              message: payload.new.message ?? 'Nueva notificación del sistema',
              post_id: payload.new.post_id ?? undefined,
              comment_id: payload.new.comment_id ?? undefined,
              read: payload.new.read,
              sender_id: 'system',
              receiver_id: payload.new.receiver_id,
              sender: {
                id: 'system',
                username: 'Sistema',
                avatar_url: null,
                full_name: undefined
              }
            };
            
            callback(systemNotification);
            
            // Play notification sound
            safePlayNotificationSound();
            
            toastCallback(
              "Nueva notificación",
              systemNotification.message || 'Has recibido una notificación'
            );
            
            return;
          }
          
          // Fetch sender info for the new notification
          const { data: senderData, error: senderError } = await (supabase as any)
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();
          
          if (senderError) {
            console.error('Error fetching sender info:', senderError);
            
            // Continue with a default sender
            const defaultSender = {
              id: payload.new.sender_id,
              username: 'Usuario',
              avatar_url: null
            };
            
            const newNotification: NotificationWithSender = {
              id: payload.new.id,
              type: payload.new.type as NotificationType,
              created_at: payload.new.created_at,
              message: payload.new.message ?? undefined,
              post_id: payload.new.post_id ?? undefined,
              comment_id: payload.new.comment_id ?? undefined,
              read: payload.new.read,
              sender_id: defaultSender.id,
              receiver_id: payload.new.receiver_id,
              sender: {
                id: defaultSender.id,
                username: defaultSender.username,
                avatar_url: defaultSender.avatar_url,
                full_name: undefined
              }
            };
            
            callback(newNotification);
            
            // Play notification sound
            safePlayNotificationSound();
            
            toastCallback(
              "Nueva notificación",
              formatNotificationMessage(payload.new.type as NotificationType, defaultSender.username)
            );
            
            return;
          }
          
          let postContent, postMedia, commentContent;
          
          // Fetch post data if this notification is related to a post
          if (payload.new.post_id) {
            const { data: postData } = await (supabase as any)
              .from('posts')
              .select('content, media_url')
              .eq('id', payload.new.post_id)
              .single();
              
            if (postData) {
              postContent = postData.content;
              postMedia = postData.media_url;
            }
          }
          
          // Fetch comment data if this notification is related to a comment
          if (payload.new.comment_id) {
            const { data: commentData } = await (supabase as any)
              .from('comments')
              .select('content')
              .eq('id', payload.new.comment_id)
              .single();
              
            if (commentData) {
              commentContent = commentData.content;
            }
          }
          
          if (senderData) {
            const newNotification: NotificationWithSender = {
              id: payload.new.id,
              type: payload.new.type as NotificationType,
              created_at: payload.new.created_at,
              message: payload.new.message ?? undefined,
              post_id: payload.new.post_id ?? undefined,
              comment_id: payload.new.comment_id ?? undefined,
              read: payload.new.read,
              sender_id: senderData.id,
              receiver_id: payload.new.receiver_id,
              sender: {
                id: senderData.id,
                username: senderData.username,
                avatar_url: senderData.avatar_url,
                full_name: undefined // We don't have full_name in the profiles table
              },
              post_content: postContent,
              post_media: postMedia,
              comment_content: commentContent
            };

            callback(newNotification);
            
            // Play notification sound
            safePlayNotificationSound();
            
            toastCallback(
              "Nueva notificación",
              formatNotificationMessage(payload.new.type as NotificationType, senderData.username)
            );
          }
        } catch (error) {
          console.error('Error processing real-time notification:', error);
        }
      }
    );
    })().catch((e) => console.error('Error preparing notifications subscription:', e));
  });

  const retry = (attempt: number) => {
    if (myGeneration !== subscriptionGeneration) return;
    if (attempt > MAX_RETRY_ATTEMPTS) {
      console.error('Notifications realtime disabled: max retry attempts reached');
      return;
    }
    const waitMs = Math.min(30000, 2000 * Math.pow(2, attempt - 1)); // exponential backoff starting at 2s
    console.log(`Retrying notifications subscription in ${waitMs}ms (attempt ${attempt})`);
    retryTimeoutId = setTimeout(() => {
      if (myGeneration !== subscriptionGeneration) return;
      subscriptionManager?.removeChannel();
      subscribeToNotifications(callback, toastCallback);
    }, waitMs);
  };

  subscriptionPromise.catch((error) => {
    console.error('Failed to subscribe to notifications:', error);
    retryAttempt += 1;
    // No romper la app si Realtime no conecta; reintentar con backoff.
    retry(retryAttempt);
  });

  // Return cleanup function
  removeChannelCallback = () => {
    // Invalidate any pending retries/subscriptions
    subscriptionGeneration += 1;
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    }
    if (subscriptionManager) {
      subscriptionManager.removeChannel();
    }
  };

  return removeChannelCallback;
}
