
import { supabase } from "@/integrations/supabase/client";
import { FriendSuggestion } from "./types";
import { getAuthUser } from "@/lib/auth/auth-store";

export async function getFriendSuggestions() {
  try {
    const user = getAuthUser();
    if (!user) return [];

    // Use the new university-enhanced suggestions function
    const { data, error } = await (supabase.rpc as any)('get_university_friend_suggestions', {
      user_id_param: user.id,
      limit_param: 20
    });

    if (error) throw error;

    // Transform to expected format for backward compatibility
    return (data || []).map(suggestion => ({
      id: suggestion.id,
      username: suggestion.username || '',
      avatar_url: suggestion.avatar_url,
      mutual_friends_count: 0,
      career: suggestion.career,
      semester: suggestion.semester,
      careerMatch: suggestion.connection_reason.includes('carrera'),
      semesterMatch: suggestion.connection_reason.includes('semestre'),
      relevanceScore: suggestion.relevance_score
    }));

  } catch (error) {
    console.error('Error fetching friend suggestions:', error);
    return [];
  }
}
