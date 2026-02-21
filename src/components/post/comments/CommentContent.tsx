
import type { ReactNode } from "react";
import { MediaDisplay } from "@/components/post/MediaDisplay";
import { MentionsText } from "@/components/post/MentionsText";

interface CommentContentProps {
  content: string;
  media?: string | null;
  mediaType?: string | null;
  reactionSummary?: ReactNode;
}

export function CommentContent({ content, media, mediaType, reactionSummary }: CommentContentProps) {
  return (
    <div className="w-full">
      <div className={`relative bg-muted p-2 rounded-lg text-sm ${reactionSummary ? "mb-2" : ""}`}>
        <MentionsText content={content} className="whitespace-pre-wrap break-words" />
        
        {media && mediaType && (
          <div className="mt-2 -mx-2 md:mx-0">
            <MediaDisplay 
              url={media} 
              type={mediaType}
              className="max-h-[200px] object-contain w-full rounded-none md:rounded-lg"
            />
          </div>
        )}

        {reactionSummary && (
          <div className="absolute -bottom-2 right-2">
            {reactionSummary}
          </div>
        )}
      </div>
    </div>
  );
}
