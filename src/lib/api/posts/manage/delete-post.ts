
import { supabase } from "@/integrations/supabase/client";
import { requireAuthUser } from "@/lib/auth/auth-store";

export async function deletePost(postId: string) {
  try {
    const user = requireAuthUser();

    // Get post to check ownership
    const { data: post, error: fetchError } = await (supabase as any)
      .from("posts")
      .select("user_id, media_url")
      .eq("id", postId)
      .single();

    const postRow = post as unknown as { user_id: string | null; media_url: string | null } | null;

    if (fetchError) throw fetchError;

    // Verify ownership
    if (postRow && postRow.user_id !== user.id) {
      // Use cached roles to avoid repeated RPC calls
      const { getCachedUserRoles } = await import("@/lib/auth/roles-cache");
      const cached = getCachedUserRoles(user.id);
      
      let isMod = false;
      let isAdmin = false;
      
      if (cached) {
        isMod = cached.isModerator;
        isAdmin = cached.isAdmin;
      } else {
        // Fallback to direct RPC if no cache available
        const [{ data: modData }, { data: adminData }] = await Promise.all([
          (supabase.rpc as any)("has_role", { _role: "moderator", _user_id: user.id }),
          (supabase.rpc as any)("has_role", { _role: "admin", _user_id: user.id }),
        ]);
        isMod = Boolean(modData);
        isAdmin = Boolean(adminData);
      }

      if (!isMod && !isAdmin) {
        throw new Error("You don't have permission to delete this post");
      }
    }

    // Delete post
    const { error: deleteError } = await (supabase as any)
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) throw deleteError;

    // Delete associated media if exists
    if (postRow && postRow.media_url) {
      try {
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
      } catch {
        // ignore malformed URLs or storage cleanup issues
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
}
