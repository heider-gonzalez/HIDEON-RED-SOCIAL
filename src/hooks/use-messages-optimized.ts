import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMessages, fetchConversations, sendMessage, Message, Conversation } from "@/lib/api/messages/queries";
import { useToast } from "@/hooks/use-toast";
import { messageCache, cacheUtils, useSuperCache } from "./use-super-cache";
import { subscribeToRealtimeMessages } from "@/lib/api/messages/realtime";

const MESSAGES_PAGE_SIZE = 50;
const INSTANT_CACHE_TTL = 30 * 1000; // 30 seconds for instant feel

export const useMessagesOptimized = (channelId: string | null, enabled: boolean = true) => {
  const { get, set, invalidate } = useSuperCache({ 
    ttl: INSTANT_CACHE_TTL,
    maxSize: 200,
    persistToStorage: true,
    storageKey: 'messages-instant'
  });
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const channelIdRef = useRef(channelId);
  const queryClient = useQueryClient();

  // Update ref when channelId changes
  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  // Instant cache check
  const getCachedMessages = useCallback(() => {
    if (!channelId) return null;
    return get(cacheUtils.messageKey(channelId));
  }, [channelId, get]);

  const result = useInfiniteQuery({
    queryKey: ["messages", channelId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!channelId) throw new Error("Channel ID is required");
      
      // Try cache first for instant response
      const cacheKey = cacheUtils.messageKey(channelId);
      const cached = get(cacheKey);
      
      if (cached && pageParam === 0) {
        return cached;
      }

      // Fetch from server
      const data = await fetchMessages(channelId, pageParam, MESSAGES_PAGE_SIZE);
      
      // Cache the result
      if (pageParam === 0) {
        set(cacheKey, data, INSTANT_CACHE_TTL);
      }
      
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && !!channelId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    initialData: () => {
      // Return cached data instantly if available
      const cached = getCachedMessages();
      return cached ? { pages: [cached], pageParams: [0] } : undefined;
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!channelId) return;

    const unsubscribe = subscribeToRealtimeMessages(channelId, (newMessage) => {
      // Update cache instantly
      const cacheKey = cacheUtils.messageKey(channelId);
      const cached = get(cacheKey);
      
      if (cached) {
        const updatedCache = {
          ...cached,
          data: [newMessage, ...cached.data]
        };
        set(cacheKey, updatedCache, INSTANT_CACHE_TTL);
      }

      // Update React Query cache
      queryClient.setQueryData(["messages", channelId], (old: any) => {
        if (!old) return old;
        
        const newPages = [...old.pages];
        if (newPages[0]) {
          newPages[0] = {
            ...newPages[0],
            data: [newMessage, ...newPages[0].data]
          };
        }
        
        return { ...old, pages: newPages };
      });

      // Update realtime state
      setRealtimeMessages(prev => [newMessage, ...prev]);
    });

    return unsubscribe;
  }, [channelId, get, set, queryClient]);

  // Merge cached and realtime messages
  const allMessages = result.data?.pages[0]?.data || [];
  const mergedMessages = [...realtimeMessages, ...allMessages].filter((msg, index, arr) => 
    arr.findIndex(m => m.id === msg.id) === index
  );

  return {
    ...result,
    data: result.data ? {
      ...result.data,
      pages: [{
        ...result.data.pages[0],
        data: mergedMessages
      }]
    } : undefined
  };
};

export const useConversationsOptimized = (currentUserId: string | null) => {
  const { get, set, invalidate } = useSuperCache({ 
    ttl: 60 * 1000, // 1 minute for conversations
    maxSize: 100,
    persistToStorage: true,
    storageKey: 'conversations-instant'
  });
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["conversations", currentUserId],
    queryFn: async () => {
      if (!currentUserId) throw new Error("User ID is required");
      
      // Try cache first
      const cacheKey = cacheUtils.conversationKey(currentUserId);
      const cached = get(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Fetch from server
      const data = await fetchConversations(currentUserId);
      
      // Cache the result
      set(cacheKey, data, 60 * 1000);
      
      return data;
    },
    enabled: !!currentUserId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    initialData: () => {
      if (!currentUserId) return undefined;
      return get(cacheUtils.conversationKey(currentUserId));
    },
  });
};

export const useSendMessageOptimized = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { set, invalidate } = useSuperCache();

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

      // Create optimistic message with instant timestamp
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}-${Math.random()}`,
        contenido: content,
        created_at: new Date().toISOString(),
        id_autor: authorId,
        author: {
          username: "Tú",
          avatar_url: "",
        },
      };

      // Update cache instantly
      const cacheKey = cacheUtils.messageKey(channelId);
      const cached = messageCache.get(cacheKey);
      
      if (cached) {
        const updatedCache = {
          ...cached,
          data: [optimisticMessage, ...cached.data]
        };
        messageCache.set(cacheKey, updatedCache, INSTANT_CACHE_TTL);
      }

      // Update React Query cache
      queryClient.setQueryData(["messages", channelId], (old: any) => {
        if (!old) return { pages: [{ data: [optimisticMessage], nextCursor: null }], pageParams: [0] };

        const newPages = [...old.pages];
        if (newPages[0]) {
          newPages[0] = {
            ...newPages[0],
            data: [optimisticMessage, ...newPages[0].data],
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
      // Invalidate cache to ensure consistency
      invalidate(cacheUtils.messageKey(variables.channelId));
      
      // Refetch to get real data
      queryClient.invalidateQueries({ queryKey: ["messages", variables.channelId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", variables.authorId] });
    },
  });
};

// Preload conversations and messages for instant navigation
export const usePreloadMessages = (userId: string | null) => {
  const { preload } = useSuperCache();

  useEffect(() => {
    if (!userId) return;

    // Preload conversations in background
    const timer = setTimeout(() => {
      preload([{
        key: cacheUtils.conversationKey(userId),
        fetcher: () => fetchConversations(userId),
        ttl: 60 * 1000
      }]);
    }, 100); // Small delay to not block initial render

    return () => clearTimeout(timer);
  }, [userId, preload]);
};

// Hook for instant message search
export const useMessageSearch = (channelId: string | null) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const { get } = useSuperCache();

  useEffect(() => {
    if (!channelId || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    // Search in cached messages first for instant results
    const cacheKey = cacheUtils.messageKey(channelId);
    const cached = get(cacheKey);
    
    if (cached) {
      const results = cached.data.filter(msg => 
        msg.contenido.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(results);
    }
  }, [channelId, searchTerm, get]);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching: searchTerm.trim().length > 0
  };
};
