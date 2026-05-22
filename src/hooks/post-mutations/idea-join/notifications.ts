
import { supabase } from "@/integrations/supabase/client";
import { IdeaJson } from "./types";

// Helper function to create notifications for idea joins
export async function createIdeaNotification(userId: string, postId: string, username?: string) {
  try {
    const { data: postData } = await supabase
      .from("posts")
      .select("user_id, idea")
      .eq("id", postId)
      .single();
    
    if (!postData || !postData.idea) {
      console.error("Post or idea data not found");
      return;
    }
    
    // Safely access the idea title
    let ideaTitle = "Sin título";
    const ideaData: IdeaJson = typeof postData.idea === 'object' ? postData.idea : {};
    
    // Check if title exists in ideaData
    if (ideaData && 'title' in ideaData && typeof ideaData.title === 'string') {
      ideaTitle = ideaData.title;
    }
    
    if (postData.user_id && postData.user_id !== userId) {
      await supabase
        .from("notifications")
        .insert({
          receiver_id: postData.user_id,
          sender_id: userId,
          type: "join_request",
          post_id: postId,
          message: `${username || "Usuario"} solicitó unirse a tu idea: "${ideaTitle}"`,
        });
    }
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

// Helper function to create notifications for idea leaves
export async function createIdeaLeaveNotification(userId: string, postId: string, username?: string) {
  try {
    const { data: postData } = await supabase
      .from("posts")
      .select("user_id, idea")
      .eq("id", postId)
      .single();
    
    if (!postData || !postData.idea) {
      console.error("Post or idea data not found");
      return;
    }
    
    // Safely access the idea title
    let ideaTitle = "Sin título";
    const ideaData: IdeaJson = typeof postData.idea === 'object' ? postData.idea : {};
    
    // Check if title exists in ideaData
    if (ideaData && 'title' in ideaData && typeof ideaData.title === 'string') {
      ideaTitle = ideaData.title;
    }
    
    if (postData.user_id && postData.user_id !== userId) {
      await supabase
        .from("notifications")
        .insert({
          receiver_id: postData.user_id,
          sender_id: userId,
          type: "idea_leave",
          post_id: postId,
          message: `${username || "Usuario"} ha abandonado tu idea: "${ideaTitle}"`,
        });
    }
  } catch (error) {
    console.error("Error creating leave notification:", error);
  }
}
