import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCommentReplies, fetchPostCommentsPage } from "@/lib/api/posts/queries";
import { ReactionType } from "@/types/database/social.types";
import { Comment } from "@/types/post";
import { normalizeReactionType } from "@/components/post/reactions/ReactionIcons";
import { useMutation } from "@tanstack/react-query";
import { toggleReactionOptimized } from "@/lib/api/reactions/optimized-reactions";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useEffect, useMemo, useRef } from "react";
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

/**
 * Hook for managing post comments functionality
 */
export function usePostComments(
  postId: string, 
  showComments: boolean, 
  setReplyTo: (value: { id: string; username: string } | null) => void,
  setNewComment: (value: string) => void
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateCommentInInfiniteCache = useCallback((
    data: any,
    commentId: string,
    patch: (c: any) => any
  ) => {
    if (!data?.pages) return data;

    const patchInReplies = (arr: any[]): any[] => {
      return arr.map((c) => {
        if (String(c?.id) === String(commentId)) {
          return patch(c);
        }
        if (Array.isArray(c?.replies) && c.replies.length > 0) {
          return { ...c, replies: patchInReplies(c.replies) };
        }
        return c;
      });
    };

    return {
      ...data,
      pages: data.pages.map((page: any) => ({
        ...page,
        comments: patchInReplies(page?.comments || []),
      })),
    };
  }, []);

  const toggleCommentReactionMutation = useMutation({
    mutationFn: async ({ commentId, type }: { commentId: string; type: ReactionType }) => {
      const result = await toggleReactionOptimized(undefined, commentId, type);
      if (!result.success) {
        throw new Error(result.error || 'Error al procesar la reacción');
      }
      return result;
    },
    onMutate: async ({ commentId, type }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      const previous = queryClient.getQueryData(["comments", postId]);

      queryClient.setQueryData(["comments", postId], (old: any) =>
        updateCommentInInfiniteCache(old, commentId, (c) => {
          const next = { ...c };
          const currentUserReaction = next?.user_reaction ?? null;

          next.reactions_by_type = { ...(next?.reactions_by_type || {}) };
          next.likes_count = Number(next?.likes_count || 0);

          const dec = (t: string) => {
            if (!t) return;
            next.reactions_by_type[t] = Math.max(0, Number(next.reactions_by_type[t] || 0) - 1);
          };
          const inc = (t: string) => {
            if (!t) return;
            next.reactions_by_type[t] = Number(next.reactions_by_type[t] || 0) + 1;
          };

          if (currentUserReaction && String(currentUserReaction) === String(type)) {
            next.user_reaction = null;
            next.likes_count = Math.max(0, next.likes_count - 1);
            dec(String(type));
            return next;
          }

          if (currentUserReaction && String(currentUserReaction) !== String(type)) {
            next.user_reaction = type;
            dec(String(currentUserReaction));
            inc(String(type));
            return next;
          }

          next.user_reaction = type;
          next.likes_count = next.likes_count + 1;
          inc(String(type));
          return next;
        })
      );

      return { previous };
    },
    onError: (error, _vars, context) => {
      const previous = (context as any)?.previous;
      if (previous) {
        queryClient.setQueryData(["comments", postId], previous);
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar la reacción del comentario",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });

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

  const comments = flatComments;
  
  const handleCommentReaction = (commentId: string, type: ReactionType) => {
    toggleCommentReactionMutation.mutate({ commentId, type });
  };
  
  const handleReply = (id: string, username: string) => {
    setReplyTo({ id, username });
    setNewComment(`@${username} `);
  };

  const loadReplies = useCallback(async (parentId: string) => {
    const replies = await fetchCommentReplies(postId, parentId, { limit: 50 });
    const normalizedReplies = normalizeReactions(replies);

    queryClient.setQueryData(["comments", postId], (old: any) => {
      if (!old?.pages) return old;

      return {
        ...old,
        pages: old.pages.map((page: any) => {
          const pageComments = (page?.comments || []) as any[];
          const nextComments = pageComments.map((c: any) => {
            if (String(c?.id) !== String(parentId)) return c;
            return {
              ...c,
              replies: normalizedReplies,
            };
          });

          return {
            ...page,
            comments: nextComments,
          };
        }),
      };
    });
  }, [postId, queryClient]);
  
  return {
    comments,
    handleCommentReaction,
    handleReply,
    loadMoreRef,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    loadReplies,
  };
}
