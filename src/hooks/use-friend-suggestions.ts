
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FriendSuggestion } from "@/types/friends";
import { requireAuthUser } from "@/lib/auth/auth-store";

export function useFriendSuggestions(suggestions: FriendSuggestion[]) {
  const [requestedFriends, setRequestedFriends] = useState<Record<string, boolean>>({});

  const checkExistingRequest = async (friendId: string) => {
    const user = requireAuthUser();
    if (!user) return false;

    const { data, error } = await (supabase as any)
      .from('friendships')
      .select('status')
      .eq('user_id', user.id)
      .eq('friend_id', friendId)
      .eq('status', 'pending')
      .maybeSingle();

    return data !== null;
  };

  useEffect(() => {
    const loadExistingRequests = async () => {
      const user = requireAuthUser();
      if (!user) return;

      const requests = {};
      for (const suggestion of suggestions) {
        const hasRequest = await checkExistingRequest(suggestion.id);
        if (hasRequest) {
          requests[suggestion.id] = true;
        }
      }
      setRequestedFriends(requests);
    };

    loadExistingRequests();
  }, [suggestions]);

  const handleSendRequest = async (friendId: string, onSendRequest: (friendId: string) => Promise<void>) => {
    try {
      // Check if there's already a pending request
      const hasExistingRequest = await checkExistingRequest(friendId);
      if (hasExistingRequest) {
        setRequestedFriends(prev => ({ ...prev, [friendId]: true }));
        return;
      }

      await onSendRequest(friendId);
      setRequestedFriends(prev => ({ ...prev, [friendId]: true }));
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  return {
    requestedFriends,
    handleSendRequest
  };
}
