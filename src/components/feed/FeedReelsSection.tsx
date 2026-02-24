import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Post } from "@/types/post";
import { useFullscreenVideo } from "@/components/video/FullscreenVideoContext";

interface FeedReelsSectionProps {
  posts: Post[];
}

function isVideoUrl(url: string) {
  if (!url) return false;
  const videoExtensions = [".mp4", ".mov", ".webm", ".avi", ".mkv", ".m4v", ".ogg"];
  const lower = url.toLowerCase();
  return videoExtensions.some((ext) => lower.includes(ext));
}

export function FeedReelsSection({ posts }: FeedReelsSectionProps) {
  const navigate = useNavigate();
  const fullscreenVideo = useFullscreenVideo();

  const reels = useMemo(() => {
    return posts
      .filter((p) => {
        const urls = (p.media_urls && Array.isArray(p.media_urls) ? p.media_urls : []).filter(Boolean) as string[];
        const hasVideoInUrls = urls.some(isVideoUrl);
        const hasVideoType = p.media_type?.startsWith("video") || p.media_type === "video";
        const hasVideoUrl = Boolean(p.media_url && isVideoUrl(p.media_url));
        return hasVideoInUrls || hasVideoType || hasVideoUrl;
      })
      .slice(0, 12);
  }, [posts]);

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
            {reels.map((post) => {
              const urlFromUrls = (post.media_urls && Array.isArray(post.media_urls) ? post.media_urls : []).find((u) => isVideoUrl(String(u))) as string | undefined;
              const url = urlFromUrls || post.media_url || "";
              if (!url) return null;

              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => {
                    fullscreenVideo.open({
                      initialPostId: post.id,
                      initialUrl: url,
                      initialTime: 0,
                      muted: true,
                    });
                  }}
                  className="relative flex-none w-[140px] h-[220px] rounded-lg overflow-hidden bg-black"
                >
                  <video
                    src={url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    loop
                    autoPlay
                    preload="metadata"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                    <div className="text-[11px] text-white/90 line-clamp-2 text-left">
                      {post.content || ""}
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
