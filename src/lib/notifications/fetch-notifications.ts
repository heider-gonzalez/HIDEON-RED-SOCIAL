
import { supabase } from "@/integrations/supabase/client";
import type { NotificationType, NotificationWithSender } from "@/types/notifications";
import { getAuthUser } from "@/lib/auth/auth-store";

let notificationsTableChecked = false;
let notificationsTableAvailable = true;

export async function fetchNotifications(): Promise<NotificationWithSender[]> {
  try {
    const user = getAuthUser();
    if (!user) return [];

    // Check table existence only once to avoid extra query on every load
    if (!notificationsTableChecked) {
      const { error: tableError } = await (supabase as any)
        .from('notifications')
        .select('id')
        .limit(1);

      notificationsTableChecked = true;
      if (tableError) {
        notificationsTableAvailable = false;
        console.error('Error checking notifications table:', tableError);
        return [];
      }
    }

    if (!notificationsTableAvailable) {
      return [];
    }
    
    // Use a simple query first to fetch base notification data
    const { data, error }: { data: any[] | null; error: any } = await (supabase as any)
      .from('notifications')
      .select(`
        id,
        type,
        created_at,
        message,
        post_id,
        comment_id,
        read,
        sender_id,
        receiver_id
      `)
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading notifications:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get all unique sender IDs and filter out null values
    const senderIds = [...new Set(data.map(item => item.sender_id).filter(id => id !== null))];
    
    // If there are no valid sender IDs, return early with empty sender data
    if (senderIds.length === 0) {
      return data.map(notification => ({
        ...notification,
        type: notification.type as NotificationType, // Explicitly cast the type
        sender: {
          id: notification.sender_id || 'unknown',
          username: 'Usuario desconocido',
          avatar_url: null,
          full_name: undefined
        },
        post_content: undefined,
        post_media: undefined,
        comment_content: undefined
      }));
    }
    
    const postIds = [...new Set(data.filter(item => item.post_id).map(item => item.post_id!))];
    const commentIds = [...new Set(data.filter(item => item.comment_id).map(item => item.comment_id!))];

    const [profilesResult, postsResult, commentsResult]: any[] = await Promise.all([
      (supabase as any)
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', senderIds),
      postIds.length > 0
        ? (supabase as any)
            .from('posts')
            .select('id, content, media_url')
            .in('id', postIds)
        : Promise.resolve({ data: [], error: null } as any),
      commentIds.length > 0
        ? (supabase as any)
            .from('comments')
            .select('id, content')
            .in('id', commentIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    const { data: profiles, error: profilesError } = profilesResult;
    if (profilesError) {
      console.error('Error loading sender profiles:', profilesError);
      const defaultProfiles = senderIds.map(id => ({
        id,
        username: 'Usuario',
        avatar_url: null
      }));
      return mapNotificationsWithSenders(data, defaultProfiles, {}, {});
    }

    const postsData: Record<string, any> = (postsResult?.data || []).reduce((acc: any, post: any) => ({
      ...acc,
      [post.id]: post
    }), {});

    const commentsData: Record<string, any> = (commentsResult?.data || []).reduce((acc: any, comment: any) => ({
      ...acc,
      [comment.id]: comment
    }), {});

    return mapNotificationsWithSenders(data, profiles || [], postsData, commentsData);
    
  } catch (error) {
    console.error('Error in fetchNotifications:', error);
    return [];
  }
}

// Helper function to map notifications with their related data
function mapNotificationsWithSenders(
  notifications: any[], 
  profiles: any[], 
  postsData: Record<string, any>, 
  commentsData: Record<string, any>
): NotificationWithSender[] {
  // Create a map of sender IDs to profiles for quick lookup
  const profileMap = new Map();
  if (profiles) {
    profiles.forEach(profile => {
      profileMap.set(profile.id, profile);
    });
  }
  
  // Process notifications with sender and post data
  return notifications.map((notification) => {
    // Find the profile for this notification's sender
    const senderProfile = notification.sender_id ? profileMap.get(notification.sender_id) : null;
    const defaultSender = {
      id: notification.sender_id || 'unknown',
      username: 'Usuario',
      avatar_url: null
    };
    
    // Get post data if this notification is related to a post
    let postContent = undefined;
    let postMedia = undefined;
    if (notification.post_id && postsData[notification.post_id]) {
      postContent = postsData[notification.post_id].content;
      postMedia = postsData[notification.post_id].media_url;
    }
    
    // Get comment data if this notification is related to a comment
    let commentContent = undefined;
    if (notification.comment_id && commentsData[notification.comment_id]) {
      commentContent = commentsData[notification.comment_id].content;
    }
    
    return {
      id: notification.id,
      type: notification.type as NotificationType, // Explicitly cast to NotificationType
      created_at: notification.created_at,
      message: notification.message ?? undefined,
      post_id: notification.post_id ?? undefined,
      comment_id: notification.comment_id ?? undefined,
      read: notification.read,
      sender_id: notification.sender_id || 'unknown',
      receiver_id: notification.receiver_id,
      sender: {
        id: senderProfile?.id || defaultSender.id,
        username: senderProfile?.username || defaultSender.username,
        avatar_url: senderProfile?.avatar_url || defaultSender.avatar_url,
        full_name: undefined // We don't have full_name in the profiles table
      },
      post_content: postContent,
      post_media: postMedia,
      comment_content: commentContent
    };
  });
}
