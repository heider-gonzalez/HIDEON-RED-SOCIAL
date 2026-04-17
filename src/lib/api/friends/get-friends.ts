import { supabase } from "@/integrations/supabase/client";
import { Friend } from "./types";
import { requireAuthUser } from "@/lib/auth/auth-store";

export async function getFriends() {
  try {
    const user = requireAuthUser();

    // Get accepted friendships
    const { data: friendships, error: followingError } = await (supabase as any)
      .from('friendships')
      .select('id, friend_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (followingError) throw followingError;

    // Fetch profiles separately
    const friendsArray = await Promise.all(((friendships || []) as any[]).map(async (friendship: any) => {
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', friendship.friend_id)
        .single();

      if (!profile) return null;

      return {
        friend_id: profile.id,
        friend_username: profile.username || '',
        friend_avatar_url: profile.avatar_url
      };
    }));

    return friendsArray.filter(Boolean) as Friend[];
  } catch (error: any) {
    console.error('Error getting friends:', error);
    throw error;
  }
}
