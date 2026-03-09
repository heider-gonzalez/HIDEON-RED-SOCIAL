
import { supabase } from "@/integrations/supabase/client";

export async function fetchRawPosts(userId?: string) {
  try {
    const debug = import.meta.env.DEV;
    if (debug) console.log('📊 fetchRawPosts: Starting fetch', { userId });

    const selectBase = `
        *,
        profiles:profiles(id, username, avatar_url, career),
        comments:comments(count),
        post_reports:post_reports(count),
        post_shares:post_shares(count),
        reactions:reactions(reaction_type, user_id),
        academic_events:academic_events(id, title, description, start_date, end_date, location, is_virtual, max_attendees, event_type, registration_required, registration_deadline, organizer_contact, banner_url),
        shared_post:posts!shared_post_id(
          *,
          profiles:profiles(id, username, avatar_url, career),
          comments:comments(count),
          academic_events:academic_events(id, title, description, start_date, end_date, location, is_virtual, max_attendees, event_type, registration_required, registration_deadline, organizer_contact, banner_url)
        ),
        project_showcases(*)
      `;

    const selectWithMetadata = `
      ${selectBase},
      post_metadata
    `;

    const runQuery = async (selectClause: string) => {
      let query = supabase
        .from("posts")
        .select(selectClause);

      // Exclude project_showcase posts from feed (they should only appear in Projects page)
      query = query.neq('post_type', 'project_showcase');

      // Si hay un userId, solo obtener los posts de ese usuario
      if (userId) {
        query = query.eq("user_id", userId);
      }

      return await query
        .order("created_at", { ascending: false })
        .limit(20); // Limit initial load to 20 posts for better performance
    };

    let { data, error } = await runQuery(selectWithMetadata);

    if (error) {
      const msg = String((error as any)?.message || "").toLowerCase();
      const code = String((error as any)?.code || "").toLowerCase();
      const status = Number((error as any)?.status || 0);
      const looksLikeMissingColumn =
        status === 400 ||
        code.startsWith("pgrst") ||
        msg.includes("post_metadata") ||
        msg.includes("could not find") ||
        msg.includes("unknown column") ||
        msg.includes("does not exist");

      if (looksLikeMissingColumn) {
        if (debug) console.warn('⚠️ fetchRawPosts: Retrying without post_metadata (missing column)');
        ({ data, error } = await runQuery(selectBase));
      }
    }

    if (error) {
      console.error('❌ fetchRawPosts error:', error);
      throw error;
    }

    if (debug) {
      const sharedPostsCount = data?.filter((p: any) => p?.shared_post_id)?.length || 0;
      console.log('✅ fetchRawPosts: Success', {
        count: data?.length || 0,
        sharedPostsCount,
      });
    }
    return data || [];
  } catch (error) {
    console.error("❌ Error in fetchRawPosts:", error);
    throw error;
  }
}
