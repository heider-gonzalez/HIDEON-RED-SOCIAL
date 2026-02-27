import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Post } from "@/types/post";
import { trackAnalyticsEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

type CreateIdeaParams = {
  postData: Record<string, unknown>;
};

type OptimisticContext = {
  previousIdeasQueries: Array<readonly [unknown, unknown]>;
  tempId: string;
};

export function useCreateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postData }: CreateIdeaParams) => {
      const { data, error } = await supabase
        .from("posts")
        .insert(postData as any)
        .select(
          `
          *,
          profiles(username, avatar_url)
        `
        )
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ postData }) => {
      await queryClient.cancelQueries({ queryKey: ["ideas"], exact: false });

      const previousIdeasQueries = queryClient.getQueriesData({
        queryKey: ["ideas"],
        exact: false,
      });

      const tempId =
        typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function"
          ? `temp_${(crypto as any).randomUUID()}`
          : `temp_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const now = new Date().toISOString();

      const optimisticIdeaPost: Post = {
        ...(postData as any),
        id: tempId,
        created_at: (postData as any)?.created_at ?? now,
        updated_at: (postData as any)?.updated_at ?? now,
        post_type: "idea",
      };

      previousIdeasQueries.forEach(([key, current]) => {
        if (!Array.isArray(current)) return;
        queryClient.setQueryData(key, [optimisticIdeaPost, ...(current as Post[])]);
      });

      return { previousIdeasQueries, tempId } satisfies OptimisticContext;
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      ctx.previousIdeasQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSuccess: (createdPost, _vars, ctx) => {
      if (!ctx) return;

      // Track analytics event
      if (createdPost && 'id' in createdPost && createdPost.id) {
        trackAnalyticsEvent({
          eventType: ANALYTICS_EVENTS.IDEA_CREATED,
          entityType: "post",
          entityId: createdPost.id,
          metadata: {
            post_type: "idea",
            title: (createdPost as any)?.content?.slice(0, 100),
          },
        });
      }

      const replaceTemp = (list: Post[]) =>
        list.map((p) => (p?.id === ctx.tempId ? (createdPost as Post) : p));

      const currentIdeasQueries = queryClient.getQueriesData({
        queryKey: ["ideas"],
        exact: false,
      });

      currentIdeasQueries.forEach(([key, current]) => {
        if (!Array.isArray(current)) return;
        queryClient.setQueryData(key, replaceTemp(current as Post[]));
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"], exact: false });
    },
  });
}
