
import { supabase } from "@/integrations/supabase/client";
import { FriendshipStatus } from "./types";
import { requireAuthUser } from "@/lib/auth/auth-store";

export async function checkFriendship(targetUserId: string): Promise<FriendshipStatus> {
  try {
    const user = requireAuthUser();

    const { data: userFollowsTarget, error: error1 } = await (supabase as any)
      .from('friendships')
      .select('status')
      .eq('user_id', user.id)
      .eq('friend_id', targetUserId)
      .single();

    const { data: targetFollowsUser, error: error2 } = await (supabase as any)
      .from('friendships')
      .select('status')
      .eq('user_id', targetUserId)
      .eq('friend_id', user.id)
      .single();

    if (userFollowsTarget?.status === 'accepted' && targetFollowsUser?.status === 'accepted') {
      return 'friends';
    } else if (userFollowsTarget?.status === 'accepted') {
      return 'following';
    } else if (userFollowsTarget?.status === 'pending') {
      return 'pending';
    } else if (targetFollowsUser?.status === 'pending') {
      return 'request_received';
    } else if (targetFollowsUser?.status === 'accepted') {
      return 'follower';
    } else {
      return null;
    }
  } catch (error: any) {
    console.error('Error checking friendship:', error);
    return null;
  }
}
