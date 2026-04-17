
import { supabase } from "@/integrations/supabase/client";
import { getAuthUser } from "@/lib/auth/auth-store";

export async function sendMentionNotifications(
  content: string,
  postId?: string,
  commentId?: string,
  senderId?: string
) {
  if (!senderId) {
    const user = getAuthUser();
    senderId = user?.id;
    
    if (!senderId) return; // No authenticated user
  }
  
  try {
    // Extract mentions from content using regex
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]); // Extract username
    }
    
    if (mentions.length === 0) return; // No mentions found
    
    console.log("Found mentions:", mentions);
    
    // Get user IDs for the mentioned usernames
    const { data: mentionedUsers, error } = await (supabase as any)
      .from('profiles')
      .select('id, username')
      .in('username', mentions);
    
    if (error) {
      console.error("Error fetching mentioned users:", error);
      return;
    }
    
    console.log("Mentioned users data:", mentionedUsers);
    
    // Create notifications for each mentioned user
    for (const user of (mentionedUsers as any[])) {
      // Skip notification if the sender is mentioning themselves
      if (user.id === senderId) continue;
      
      const notificationType = commentId ? 'comment_mention' : 'post_mention';
      
      // Create notification
      await (supabase as any)
        .from('notifications')
        .insert({
          type: notificationType,
          sender_id: senderId,
          receiver_id: user.id,
          post_id: postId,
          comment_id: commentId,
          message: `te ha mencionado en ${commentId ? 'un comentario' : 'una publicación'}`
        } as any);
    }
  } catch (error) {
    console.error("Error processing mentions:", error);
  }
}

// Add the missing function for sending post notifications to friends
export async function sendNewPostNotifications(userId: string, postId: string) {
  try {
    // Get user's followers (people they follow)
    const { data: followers, error: followersError } = await (supabase as any)
      .from('followers')
      .select('following_id')
      .eq('follower_id', userId);
    
    if (followersError) {
      console.error("Error fetching followers:", followersError);
      return;
    }
    
    if (!followers || followers.length === 0) return; // No followers
    
    // Create notifications for each person they follow
    const notifications = (followers as any[]).map((follower: any) => ({
      type: 'new_post',
      sender_id: userId,
      receiver_id: follower.following_id,
      post_id: postId,
      message: 'ha creado una nueva publicación'
    }));
    
    // Insert all notifications
    const { error: notifyError } = await (supabase as any)
      .from('notifications')
      .insert(notifications as any);
    
    if (notifyError) {
      console.error("Error sending notifications:", notifyError);
    }
  } catch (error) {
    console.error("Error in sendNewPostNotifications:", error);
  }
}
