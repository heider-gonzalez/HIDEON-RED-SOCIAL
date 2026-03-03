
import { supabase } from "@/integrations/supabase/client";

export async function deletePost(postId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    // Get post to check ownership
    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("user_id, media_url")
      .eq("id", postId)
      .single();

    const postRow = post as unknown as { user_id: string | null; media_url: string | null } | null;

    if (fetchError) throw fetchError;

    // Verify ownership
    if (postRow && postRow.user_id !== user.id) {
      const [{ data: isMod }, { data: isAdmin }] = await Promise.all([
        (supabase.rpc as any)("has_role", { _role: "moderator", _user_id: user.id }),
        (supabase.rpc as any)("has_role", { _role: "admin", _user_id: user.id }),
      ]);

      if (!Boolean(isMod) && !Boolean(isAdmin)) {
        throw new Error("You don't have permission to delete this post");
      }
    }

    // Delete post
    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) throw deleteError;

    // Delete associated media if exists
    if (postRow && postRow.media_url) {
      // Extract file path from URL
      const url = new URL(postRow.media_url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(pathParts.indexOf('media') + 1).join('/');
      
      if (filePath) {
        await supabase
          .storage
          .from("media")
          .remove([filePath]);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
}
