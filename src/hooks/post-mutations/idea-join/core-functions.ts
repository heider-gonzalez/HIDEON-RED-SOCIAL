
import { supabase } from "@/integrations/supabase/client";
import { IdeaJson, JsonSafeParticipant } from "./types";

// A function to join an idea
export async function joinIdea(postId: string, profession: string): Promise<{ success: boolean, message: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if the user is already a participant
    const { data: existingParticipant, error: checkError } = await supabase
      .from('idea_participants')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingParticipant) {
      return { success: false, message: "You are already a participant in this idea" };
    }

    // Add the user as a participant with profession
    const { error: insertError } = await supabase
      .from("idea_participants")
      .insert({
        post_id: postId,
        user_id: user.id,
        profession: profession,
        joined_at: new Date().toISOString()
      });

    if (insertError) {
      throw insertError;
    }

    // Get the current post to update the idea data
    const { data: currentPost, error: postError } = await supabase
      .from('posts')
      .select('id, idea')
      .eq('id', postId)
      .single();

    if (postError) {
      throw postError;
    }

    // Update the post with the new participant
    if (currentPost.idea) {
      // Get the current participants list
      const { data: participantsData, error: participantsError } = await supabase
        .from('idea_participants')
        .select('user_id, profession, profiles:user_id(username, avatar_url)')
        .eq('post_id', postId);

      if (participantsError) {
        throw participantsError;
      }

      // Format participants for the update
      const participants = participantsData.map(p => {
        // Safely handle profile data which might be null
        const profile = p.profiles || {};
        // Use TypeScript's type assertion to inform that profile has the right shape
        const typedProfile = profile as { username?: string; avatar_url?: string | null };
        
        return {
          user_id: p.user_id,
          profession: p.profession || "No especificado",
          username: typedProfile.username || "Usuario",
          avatar_url: typedProfile.avatar_url || null,
          joined_at: new Date().toISOString()
        };
      });

      console.log("New participants list:", participants);
    }

    return { success: true, message: "You have joined the idea successfully" };
  } catch (error: any) {
    console.error("Error joining idea:", error);
    return { success: false, message: error.message || "Failed to join the idea" };
  }
}

// A function to leave an idea
export async function leaveIdea(postId: string): Promise<{ success: boolean, message: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if the user is a participant
    const { data: existingParticipant, error: checkError } = await supabase
      .from('idea_participants')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return { success: false, message: "You are not a participant in this idea" };
      }
      throw checkError;
    }

    // Remove the user from participants
    const { error: deleteError } = await supabase
      .from('idea_participants')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    if (deleteError) {
      throw deleteError;
    }

    return { success: true, message: "You have left the idea successfully" };
  } catch (error: any) {
    console.error("Error leaving idea:", error);
    return { success: false, message: error.message || "Failed to leave the idea" };
  }
}
