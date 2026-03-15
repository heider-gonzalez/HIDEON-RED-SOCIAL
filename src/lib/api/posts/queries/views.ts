import { supabase } from "@/integrations/supabase/client";

export async function getPostViewsCount(postId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('post_views')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}

export async function getMultiplePostViewsCounts(postIds: string[]): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('post_views')
      .select('post_id')
      .in('post_id', postIds);

    const viewsCounts: Record<string, number> = {};
    postIds.forEach((id) => {
      viewsCounts[id] = 0;
    });

    if (error || !data) {
      return viewsCounts;
    }

    data.forEach((row) => {
      const pid = String((row as any).post_id);
      if (!pid) return;
      viewsCounts[pid] = (viewsCounts[pid] || 0) + 1;
    });

    return viewsCounts;
  } catch {
    const viewsCounts: Record<string, number> = {};
    postIds.forEach((id) => {
      viewsCounts[id] = 0;
    });
    return viewsCounts;
  }
}
