import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Post } from "@/components/Post";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { transformPostData } from "@/lib/api/posts/retrieve/utils/transform-data";

export default function PostDetail() {
  const { postId } = useParams();
  const [searchParams] = useSearchParams();
  const commentId = searchParams.get("comment");

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ["post-detail", postId],
    queryFn: async () => {
      if (!postId) return null;

      // Some environments may not support all embedded relationships in PostgREST,
      // which results in a 400 Bad Request. Retry with a minimal select so
      // notification deep links still work.
      let data: any = null;
      let error: any = null;

      const richResult = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles:profiles(*),
          comments:comments(count),
          reactions:reactions(reaction_type, user_id),
          post_shares:post_shares(count),
          academic_events:academic_events(*)
        `
        )
        .eq("id", postId)
        .maybeSingle();

      data = richResult.data;
      error = richResult.error;

      if (error) {
        const minimalResult = await supabase
          .from("posts")
          .select(
            `
            *,
            profiles:profiles(*),
            comments:comments(count)
          `
          )
          .eq("id", postId)
          .maybeSingle();

        data = minimalResult.data;
        error = minimalResult.error;
      }

      if (error) throw error;
      if (!data) return null;

      return transformPostData(data as any);
    },
    enabled: !!postId,
  });

  useEffect(() => {
    if (!commentId) return;

    let attempts = 0;
    const maxAttempts = 20;

    const timer = window.setInterval(() => {
      attempts += 1;
      const el = document.getElementById(`comment-${commentId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        window.clearInterval(timer);
        return;
      }

      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [commentId]);

  if (isLoading) {
    return (
      <div className="w-full bg-background min-h-screen">
        <div className="max-w-[680px] mx-auto px-2 lg:px-0 py-6">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="w-full bg-background min-h-screen">
        <div className="max-w-[680px] mx-auto px-2 lg:px-0 py-6 text-center text-muted-foreground">
          Publicación no encontrada
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background min-h-screen">
      <div className="max-w-[680px] mx-auto px-2 lg:px-0 py-4">
        <Post post={post as any} initialShowComments={!!commentId} />
      </div>
    </div>
  );
}
