import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Post } from "@/types/post";
import { useFullscreenVideo } from "@/components/video/FullscreenVideoContext";
import { normalizePostContent } from "@/utils/post-content";
import { getPostVideoUrl } from "@/lib/hybrid-url";
import { useReelsFeed } from "@/hooks/reels/use-reels-feed";

export function FeedReelsSection() {
  const navigate = useNavigate();
  const fullscreenVideo = useFullscreenVideo();

  const { videosPosts: posts, isLoading } = useReelsFeed(12);

  const reels = useMemo(() => {
    return (posts as Post[])
      .map((post) => ({ post, url: getPostVideoUrl(post) }))
      .filter((x) => Boolean(x.url))
      .slice(0, 12);
  }, [posts]);

  if (isLoading) return null;
  if (reels.length === 0) return null;

  return (
    <div className="w-full px-0 md:px-4">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-semibold text-sm">Reels</div>
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => navigate("/reels")}
          >
            Ver todos
          </button>
        </div>

        <div className="px-3 py-3 overflow-x-auto">
          <div className="flex gap-3">
            {reels.map(({ post, url }) => {
              const safeUrl = url || "";
              if (!safeUrl) return null;

              const author = (post as any)?.profiles;
              const authorName = author?.username || "";

              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => {
                    fullscreenVideo.open({
                      initialPostId: post.id,
                      initialUrl: safeUrl,
                      initialTime: 0,
                      muted: true,
                    });
                  }}
                  className="relative flex-none w-[140px] h-[220px] rounded-lg overflow-hidden bg-gray-950"
                >
                  <video
                    src={safeUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    loop
                    autoPlay
                    preload="metadata"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                    {authorName ? (
                      <div className="text-[10px] text-white/80 text-left truncate mb-0.5">
                        @{authorName}
                      </div>
                    ) : null}
                    <div className="text-[11px] text-white/90 line-clamp-2 text-left">
                      {normalizePostContent(post.content || "")}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
