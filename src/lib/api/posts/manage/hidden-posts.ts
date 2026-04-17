
import { supabase } from "@/integrations/supabase/client";
import { getAuthUser, requireAuthUser } from "@/lib/auth/auth-store";

export async function getHiddenPosts() {
  try {
    const user = getAuthUser();
    if (!user) return [];

    const { data, error } = await (supabase as any)
      .from("hidden_posts")
      .select("post_id")
      .eq("user_id", user.id);

    if (error) throw error;
    return (data as any[]).map((item: any) => item.post_id);
  } catch (error) {
    console.error("Error fetching hidden posts:", error);
    return [];
  }
}

export async function hidePost(postId: string) {
  try {
    const user = requireAuthUser();

    const { error } = await (supabase as any)
      .from("hidden_posts")
      .insert({ user_id: user.id, post_id: postId } as any);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error hiding post:", error);
    throw error;
  }
}

export async function unhidePost(postId: string) {
  try {
    const user = requireAuthUser();

    const { error } = await (supabase as any)
      .from("hidden_posts")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error unhiding post:", error);
    throw error;
  }
}
