
import { supabase } from "@/integrations/supabase/client";
import type { Visibility } from "../types";
import { requireAuthUser } from "@/lib/auth/auth-store";

interface UpdatePostParams {
  postId: string;
  content?: string;
  visibility?: Visibility;
}

export async function updatePostVisibility(postId: string, visibility: Visibility) {
  try {
    // Make sure visibility is one of the allowed values to satisfy TypeScript
    const safeVisibility = visibility === 'incognito' ? 'private' : visibility;
    
    const { error } = await (supabase as any)
      .from('posts')
      .update({ visibility: safeVisibility } as any)
      .eq('id', postId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error updating post visibility:", error);
    return { success: false, error };
  }
}

export async function updatePost({ postId, content, visibility }: UpdatePostParams) {
  try {
    const user = requireAuthUser();

    // Build update object
    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    
    if (visibility !== undefined) {
      // Make sure visibility is one of the allowed values
      updateData.visibility = visibility === 'incognito' ? 'private' : visibility;
    }

    const { error } = await (supabase as any)
      .from('posts')
      .update(updateData as any)
      .eq('id', postId)
      .eq('user_id', user.id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error updating post:", error);
    return { success: false, error };
  }
}
