import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAuthUser, requireAuthUser } from "@/lib/auth/auth-store";

export async function followUser(userId: string) {
  try {
    const user = requireAuthUser();

    const { data: existing, error: existingError } = await (supabase as any)
      .from('followers')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      toast.success("Ya sigues a este usuario");
      return true;
    }

    const { error } = await (supabase as any)
      .from('followers')
      .insert({
        follower_id: user.id,
        following_id: userId
      } as any);

    if (error) throw error;
    
    toast.success("Ahora sigues a este usuario");
    return true;
  } catch (error: any) {
    console.error('Error following user:', error);
    toast.error("Error al seguir usuario");
    return false;
  }
}

export async function unfollowUser(userId: string) {
  try {
    const user = requireAuthUser();

    const { error } = await (supabase as any)
      .from('followers')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', userId);

    if (error) throw error;
    
    toast.success("Dejaste de seguir a este usuario");
    return true;
  } catch (error: any) {
    console.error('Error unfollowing user:', error);
    toast.error("Error al dejar de seguir");
    return false;
  }
}

export async function isFollowing(userId: string): Promise<boolean> {
  try {
    const user = getAuthUser();
    if (!user) return false;

    const { data, error } = await (supabase as any)
      .from('followers')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error: any) {
    console.error('Error checking follow status:', error);
    return false;
  }
}