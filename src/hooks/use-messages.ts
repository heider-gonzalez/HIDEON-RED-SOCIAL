import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMessages, fetchConversations, sendMessage, Message, Conversation } from "@/lib/api/messages/queries";
import { useToast } from "@/hooks/use-toast";

const MESSAGES_PAGE_SIZE = 50;

export const useMessages = (channelId: string | null, enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: ["messages", channelId],
    queryFn: ({ pageParam = 0 }) => {
      if (!channelId) throw new Error("Channel ID is required");
      return fetchMessages(channelId, pageParam, MESSAGES_PAGE_SIZE);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && !!channelId,
    staleTime: 2 * 60 * 1000, // 2 minutes - faster updates
    gcTime: 10 * 60 * 1000, // 10 minutes - less memory
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export const useConversations = (currentUserId: string | null) => {
  return useQuery({
    queryKey: ["conversations", currentUserId],
    queryFn: () => {
      if (!currentUserId) throw new Error("User ID is required");
      return fetchConversations(currentUserId);
    },
    enabled: !!currentUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes - faster updates
    gcTime: 10 * 60 * 1000, // 10 minutes - less memory
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ content, channelId, authorId }: {
      content: string;
      channelId: string;
      authorId: string;
    }) => sendMessage(content, channelId, authorId),
    onMutate: async ({ content, channelId, authorId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["messages", channelId] });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(["messages", channelId]);

      // Optimistically update
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        contenido: content,
        created_at: new Date().toISOString(),
        id_autor: authorId,
        author: {
          username: "Tú", // Will be updated after fetch
          avatar_url: "",
        },
      };

      queryClient.setQueryData(["messages", channelId], (old: any) => {
        if (!old) return { pages: [{ data: [optimisticMessage], nextCursor: null }], pageParams: [0] };

        const newPages = [...old.pages];
        if (newPages[0]) {
          newPages[0] = {
            ...newPages[0],
            data: [...newPages[0].data, optimisticMessage],
          };
        }

        return { ...old, pages: newPages };
      });

      // Update conversations list optimistically
      queryClient.setQueryData(["conversations", authorId], (old: any) => {
        if (!old?.pages?.[0]) return old;

        const conversations = old.pages[0];
        const updatedConversations = conversations.map((conv: Conversation) => {
          if (conv.channel_id === channelId) {
            return {
              ...conv,
              last_message: content,
              last_message_at: new Date().toISOString(),
            };
          }
          return conv;
        });

        return {
          ...old,
          pages: [updatedConversations],
        };
      });

      return { previousMessages, channelId };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", context.channelId], context.previousMessages);
      }

      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    },
    onSettled: (data, error, variables) => {
      // Refetch to get real data
      queryClient.invalidateQueries({ queryKey: ["messages", variables.channelId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", variables.authorId] });
    },
  });
};
