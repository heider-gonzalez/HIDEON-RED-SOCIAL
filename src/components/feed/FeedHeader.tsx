import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface FeedHeaderProps {
  newPostsCount: number;
  onRefresh: () => void;
}

export function FeedHeader({ newPostsCount, onRefresh }: FeedHeaderProps) {
  const isMobile = useIsMobile();

  if (newPostsCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/30 p-3 sm:p-4">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
          <span className="text-sm font-medium text-foreground">
            {newPostsCount} {newPostsCount === 1 ? 'nueva publicación' : 'nuevas publicaciones'}
          </span>
        </div>
        <Button
          variant="outline"
          size={isMobile ? "sm" : "default"}
          onClick={onRefresh}
          className="shrink-0"
        >
          Ver {newPostsCount === 1 ? 'publicación' : 'publicaciones'}
        </Button>
      </div>
    </div>
  );
}
