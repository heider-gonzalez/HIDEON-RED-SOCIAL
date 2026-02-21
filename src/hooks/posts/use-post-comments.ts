import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPostCommentsPage } from "@/lib/api/posts/queries";
import { ReactionType } from "@/types/database/social.types";
import { Comment } from "@/types/post";
import { normalizeReactionType } from "@/components/post/reactions/ReactionIcons";
import { useReactionMutations } from "@/hooks/post-mutations/use-reaction-mutations";
import { useEffect, useMemo, useRef } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

// Helper function to ensure reaction_type is a valid ReactionType
function normalizeReactions(comments: any[]): Comment[] {
  return comments.map(comment => {
    // Process reactions to ensure they conform to ReactionType
    const normalizedReactions = comment.reactions?.map((reaction: any) => ({
      ...reaction,
      // Ensure reaction_type is a valid ReactionType
      reaction_type: normalizeReactionType(reaction.reaction_type)
    })) || [];
    
    // Process any replies recursively
    const normalizedReplies = comment.replies ? normalizeReactions(comment.replies) : [];
    
    return {
      ...comment,
      reactions: normalizedReactions,
      replies: normalizedReplies,
      // Ensure user_reaction is also normalized if present
      user_reaction: comment.user_reaction ? normalizeReactionType(comment.user_reaction) : null
    };
  });
}

function buildCommentsTree(flat: Comment[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];

  flat.forEach((c) => {
    map.set(c.id, { ...c, replies: [] });
  });

  flat.forEach((c) => {
    const node = map.get(c.id);
    if (!node) return;

    if (c.parent_id) {
      const parent = map.get(c.parent_id);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(node);
      } else {
        roots.push(node);
      }
      return;
    }

    roots.push(node);
  });

  return roots;
}

/**
 * Hook for managing post comments functionality
 */
export function usePostComments(
  postId: string, 
  showComments: boolean, 
  setReplyTo: (value: { id: string; username: string } | null) => void,
  setNewComment: (value: string) => void
) {
  const { toggleCommentReaction } = useReactionMutations(postId);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { isIntersecting } = useIntersectionObserver(loadMoreRef, { rootMargin: '300px', threshold: 0 });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["comments", postId],
    initialPageParam: null as any,
    queryFn: ({ pageParam }) => fetchPostCommentsPage(postId, { limit: 20, cursor: pageParam ?? null }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: showComments,
  });

  useEffect(() => {
    if (!showComments) return;
    if (!isIntersecting) return;
    if (!hasNextPage) return;
    if (isFetchingNextPage) return;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isIntersecting, showComments]);

  const flatComments = useMemo(() => {
    const pages = data?.pages ?? [];
    const all = pages.flatMap((p: any) => p.comments ?? []);
    return normalizeReactions(all);
  }, [data?.pages]);

  const comments = useMemo(() => buildCommentsTree(flatComments), [flatComments]);
  
  const handleCommentReaction = (commentId: string, type: ReactionType) => {
    toggleCommentReaction({ commentId, type });
  };
  
  const handleReply = (id: string, username: string) => {
    setReplyTo({ id, username });
    setNewComment(`@${username} `);
  };
  
  return {
    comments,
    handleCommentReaction,
    handleReply,
    loadMoreRef,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage
  };
}
