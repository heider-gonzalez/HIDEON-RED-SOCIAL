import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, MessageCircle, Search, Globe, Users, MoreVertical, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { playUiSound } from "@/lib/ui-sounds";
import { useArchivedChats } from "@/hooks/use-archived-chats";
import { splitConversationsByMutualFollow } from "@/lib/chat/split-conversations";
import { followUser } from "@/lib/api/followers/follow-actions";
import { GlobalChat } from "@/components/chat/GlobalChat";
import { useMessages, useConversations, useSendMessage } from "@/hooks/use-messages";
import { Message, Conversation } from "@/types/chat";
import { useQueryClient } from "@tanstack/react-query";
import { usePresence } from "@/hooks/use-presence";
import { useUnreadMessages } from "@/hooks/use-unread-messages";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GLOBAL_CHANNEL_ID = "2f79759f-c53f-40ae-b786-59f6e69264a6";

interface SearchResult {
  id: string;
  username: string;
  avatar_url: string | null;
}

export function PrivateMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { archivedChats, handleChatLongPress, handleChatPressEnd, handleUnarchiveChat } = useArchivedChats();
  const [mutualFollowMap, setMutualFollowMap] = useState<Record<string, boolean>>({});
  const [activeInboxTab, setActiveInboxTab] = useState<'inbox' | 'requests' | 'archived'>('inbox');
  const queryClient = useQueryClient();

  const { unreadMessages, markAsRead } = useUnreadMessages(currentUserId || undefined);
  const unreadCountByUserId = useMemo(() => {
    return new Map<string, number>(
      unreadMessages.map((m) => [String(m.channel_id), Number(m.unread_count || 0)])
    );
  }, [unreadMessages]);

  // Presence hook for typing indicators and online status
  // NOTE: Temporarily disabled while debugging. Provide safe fallbacks so the UI doesn't crash.
  const typingUsers = useMemo(() => new Set<string>(), []);
  const onlineUsers = useMemo(() => new Map<string, { isOnline: boolean }>(), []);
  const handleTyping = () => {};
  const stopTyping = () => {};
  // const { typingUsers, onlineUsers, handleTyping, stopTyping } = usePresence(selectedChannelId);

  const [acceptedRequests, setAcceptedRequests] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('hsocial_message_requests_accepted');
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('hsocial_message_requests_accepted', JSON.stringify(Array.from(acceptedRequests)));
    } catch {
      // ignore
    }
  }, [acceptedRequests]);

  // Obtener usuario actual
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Buscar usuarios cuando se escribe en el buscador
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2 || !currentUserId) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .neq("id", currentUserId)
          .ilike("username", `%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, currentUserId]);

  // Obtener o crear canal privado entre dos usuarios
  const getOrCreatePrivateChannel = async (userId1: string, userId2: string): Promise<string | null> => {
    try {
      // Prefer server-side RPC (SECURITY DEFINER) to avoid client-side RLS insert failures
      const { data: rpcChannelId, error: rpcError }: { data: any; error: any } = await (supabase as any)
        .rpc('get_or_create_private_channel', {
          p_user1: userId1,
          p_user2: userId2,
        });

      if (!rpcError && rpcChannelId) {
        return String(rpcChannelId);
      }

      // If the RPC doesn't exist yet, fall back to legacy logic
      if (rpcError && rpcError.code !== '42883') {
        throw rpcError;
      }

      const { data: user1Channels, error: searchError } = await (supabase as any)
        .from("miembros_canal")
        .select(`
          id_canal,
          canales!inner(id, es_privado)
        `)
        .eq("id_usuario", userId1)
        .eq("canales.es_privado", true);

      if (searchError) throw searchError;

      if (user1Channels && user1Channels.length > 0) {
        for (const memberChannel of user1Channels) {
          const channelId = (memberChannel as any).id_canal;
          const { data: members } = await (supabase as any)
            .from("miembros_canal")
            .select("id_usuario")
            .eq("id_canal", channelId);

          if (members && members.length === 2) {
            const memberIds = members.map((m: any) => m.id_usuario);
            if (memberIds.includes(userId1) && memberIds.includes(userId2)) {
              return channelId;
            }
          }
        }
      }

      // If we got here, RPC is missing and no existing channel was found.
      // Without the RPC, creation may fail due to RLS; return null.
      return null;
    } catch (error) {
      console.error("Error getting/creating private channel:", error);
      return null;
    }
  };

  const requestDeleteMessage = (message: Message) => {
    if (!currentUserId) return;
    if (message.id_autor !== currentUserId) return;
    setMessageToDelete(message);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete || !currentUserId) return;
    const conversation = conversations.find(c => c.id === selectedConversation);
    if (!conversation) return;

    setIsDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from('mensajes')
        .delete()
        .eq('id', messageToDelete.id)
        .eq('id_autor', currentUserId);

      if (error) throw error;

      toast({
        title: 'Mensaje eliminado',
      });

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["messages", conversation.channel_id] });
      queryClient.invalidateQueries({ queryKey: ["conversations", currentUserId] });

      setIsDeleteDialogOpen(false);
      setMessageToDelete(null);
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el mensaje',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Iniciar conversación con un usuario de los resultados de búsqueda
  const startConversation = async (user: SearchResult) => {
    if (!currentUserId) return;

    try {
      const channelId = await getOrCreatePrivateChannel(currentUserId, user.id);
      if (channelId) {
        setSearchQuery("");
        setSearchResults([]);
        await loadConversations();
        setSelectedConversation(user.id);
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Error",
        description: "No se pudo iniciar la conversación",
        variant: "destructive",
      });
    }
  };

  // Cargar conversaciones
  const loadConversations = async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);

      // Obtener todos los canales privados donde el usuario es miembro
      const { data: userChannels, error: channelsError } = await (supabase as any)
        .from("miembros_canal")
        .select(`
          id_canal,
          canales!inner(id, es_privado, nombre)
        `)
        .eq("id_usuario", currentUserId)
        .eq("canales.es_privado", true);

      if (channelsError) throw channelsError;

      const privateChannels = userChannels || [];

      // Para cada canal privado, obtener el otro miembro y el último mensaje
      const conversationsData = await Promise.all(
        privateChannels.map(async (memberChannel: any) => {
          const channelId = memberChannel.id_canal;

          const { data: otherMembers, error: membersError } = await (supabase as any)
            .from("miembros_canal")
            .select("id_usuario")
            .eq("id_canal", channelId)
            .neq("id_usuario", currentUserId);

          if (membersError || !otherMembers || otherMembers.length === 0) return null;

          const otherUserId = otherMembers[0].id_usuario;

          const { data: profile, error: profileError } = await (supabase as any)
            .from("profiles")
            .select("id, username, avatar_url")
            .eq("id", otherUserId)
            .single();

          if (profileError || !profile) return null;

          const { data: lastMessage } = await (supabase as any)
            .from("mensajes")
            .select("id, contenido, created_at")
            .eq("id_canal", channelId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: otherUserId,
            username: profile.username || "Usuario",
            avatar_url: profile.avatar_url,
            last_message: lastMessage?.contenido || "Inicia una conversación",
            last_message_at: lastMessage?.created_at || new Date().toISOString(),
            unread_count: 0,
            channel_id: channelId
          };
        })
      );

      const validConversations = conversationsData.filter(Boolean) as Conversation[];
      validConversations.sort((a, b) => 
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      // Obtener último mensaje del chat global
      const { data: globalLastMessage } = await (supabase as any)
        .from("mensajes")
        .select("contenido, created_at")
        .eq("id_canal", GLOBAL_CHANNEL_ID)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const globalConversation: Conversation = {
        id: "global",
        username: "Chat Global",
        avatar_url: null,
        last_message: (globalLastMessage as any)?.contenido || "Únete a la conversación",
        last_message_at: (globalLastMessage as any)?.created_at || new Date().toISOString(),
        unread_count: 0,
        channel_id: GLOBAL_CHANNEL_ID,
        is_global: true,
      };

      // Chat Global fijado arriba
      setConversations([globalConversation, ...validConversations]);

      // Si hay un parámetro ?user= en la URL, abrir esa conversación
      const userIdParam = searchParams.get("user");
      if (userIdParam && validConversations.find(c => c.id === userIdParam)) {
        setSelectedConversation(userIdParam);
      }
     } catch (error) {
       console.error("Error loading conversations:", error);
     } finally {
       setLoading(false);
     }
  };

  // Filtrar conversaciones según la pestaña activa
  const visibleConversations = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    const filtered = conversations.filter(conv => 
      conv.username.toLowerCase().includes(searchLower) ||
      conv.last_message.toLowerCase().includes(searchLower)
    );

    if (activeInboxTab === 'archived') {
      return filtered.filter(conv => archivedChats.has(conv.id));
    }
    
    const isRequest = (conv: Conversation) => {
      if (conv.is_global) return false;
      if (acceptedRequests.has(conv.id)) return false;
      return !mutualFollowMap[conv.id];
    };

    if (activeInboxTab === 'requests') {
      return filtered.filter(conv => !conv.is_global && isRequest(conv) && !archivedChats.has(conv.id));
    }

    // Tab 'inbox' (predeterminado)
    return filtered.filter(conv => 
      (conv.is_global || !isRequest(conv)) && !archivedChats.has(conv.id)
    );
  }, [conversations, searchQuery, activeInboxTab, archivedChats, acceptedRequests, mutualFollowMap]);

  const selectedConv = conversations.find(c => c.id === selectedConversation);
  const selectedChannelId = useMemo(() => {
    const conv = conversations.find((c) => c.id === selectedConversation);
    if (!conv) return null;
    if ((conv as Conversation).is_global) return null;
    return conv.channel_id ?? null;
  }, [conversations, selectedConversation]);

  // Use React Query hooks
  const { data: messagesData, isLoading: messagesLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useMessages(selectedChannelId, !!selectedChannelId && !selectedConv?.is_global);
  const { data: conversationsData, isLoading: conversationsLoading } = useConversations(currentUserId);
  const sendMessageMutation = useSendMessage();

  // Flatten messages from pages
  const allMessages = useMemo(() => {
    return messagesData?.pages.flatMap(page => page.data) || [];
  }, [messagesData]);

  // Set conversations from query data
  useEffect(() => {
    if (conversationsData?.pages?.[0]) {
      setConversations(conversationsData.pages[0]);
      setLoading(false);
    }
  }, [conversationsData]);

  // Set messages from query data
  useEffect(() => {
    if (allMessages) {
      setMessages(allMessages);
    }
  }, [allMessages]);

  // Cargar mensajes de una conversación
  const loadMessages = async (channelId: string) => {
    try {
      const { data: messagesData, error } = await (supabase as any)
        .from("mensajes")
        .select(`
          id,
          contenido,
          created_at,
          id_autor
        `)
        .eq("id_canal", channelId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      const authorIds = [...new Set(messagesData?.map(m => m.id_autor).filter(Boolean) || [])];
      
      let profilesMap: Record<string, { username: string; avatar_url: string }> = {};
      if (authorIds.length > 0) {
        const { data: profiles, error: profilesError } = await (supabase as any)
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", authorIds);
        
        if (!profilesError && profiles) {
          profilesMap = profiles.reduce((acc, profile) => {
            acc[profile.id] = {
              username: profile.username || "Usuario",
              avatar_url: profile.avatar_url || ""
            };
            return acc;
          }, {} as Record<string, { username: string; avatar_url: string }>);
        }
      }

      const messagesWithAuthors = (messagesData || []).map(message => ({
        ...message,
        author: profilesMap[message.id_autor || ""] || { username: "Usuario", avatar_url: "" }
      }));

      setMessages(messagesWithAuthors as Message[]);
      
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth"
        });
      }, 100);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  // Enviar mensaje con optimistic updates
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId || !selectedConversation || sendMessageMutation.isPending) return;

    const conversation = conversations.find(c => c.id === selectedConversation);
    if (!conversation) return;

    try {
      await sendMessageMutation.mutateAsync({
        content: newMessage.trim(),
        channelId: conversation.channel_id,
        authorId: currentUserId,
      });

      playUiSound('message_sent');
      setNewMessage("");
      // stopTyping(); // Stop typing when message is sent

      // Scroll to bottom after sending
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth"
        });
      }, 100);
    } catch (error: any) {
      // Error handled in mutation
      console.error("Error sending message:", error);
    }
  };

  // Suscripción a nuevos mensajes en tiempo real
  useEffect(() => {
    if (!selectedChannelId) return;

    const channel = supabase
      .channel(`messages-${selectedChannelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes",
          filter: `id_canal=eq.${selectedChannelId}`,
        },
        () => {
          loadMessages(selectedChannelId);
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChannelId]);

  // Cargar conversaciones cuando cambia el usuario actual
  useEffect(() => {
    if (currentUserId) {
      loadConversations();
    }
  }, [currentUserId]);

  // Calcular mutual follow (para separar Principal vs Desconocidos)
  useEffect(() => {
    const computeMutual = async () => {
      if (!currentUserId) return;
      const otherUserIds = conversations
        .filter((c) => c.id !== 'global')
        .map((c) => c.id);

      if (otherUserIds.length === 0) {
        setMutualFollowMap({});
        return;
      }

      try {
        const { data: iFollowData, error: iFollowError } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', currentUserId)
          .in('following_id', otherUserIds);

        if (iFollowError) throw iFollowError;

        const { data: theyFollowData, error: theyFollowError } = await supabase
          .from('followers')
          .select('follower_id')
          .eq('following_id', currentUserId)
          .in('follower_id', otherUserIds);

        if (theyFollowError) throw theyFollowError;

        const iFollowSet = new Set((iFollowData || []).map((r: any) => r.following_id));
        const theyFollowSet = new Set((theyFollowData || []).map((r: any) => r.follower_id));
        const nextMap: Record<string, boolean> = {};
        for (const id of otherUserIds) {
          nextMap[id] = iFollowSet.has(id) && theyFollowSet.has(id);
        }
        setMutualFollowMap(nextMap);
      } catch (error) {
        console.error('Error computing mutual follow map:', error);
        setMutualFollowMap({});
      }
    };

    computeMutual();
  }, [currentUserId, conversations]);

  // Cargar mensajes cuando se selecciona una conversación
  useEffect(() => {
    if (selectedConversation) {
      const conversation = conversations.find(c => c.id === selectedConversation);
      if (conversation) {
        loadMessages(conversation.channel_id);
      }
    }
  }, [selectedConversation, conversations]);

  useEffect(() => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.is_global
          ? conv
          : {
              ...conv,
              unread_count: unreadCountByUserId.get(String(conv.id)) ?? 0,
            }
      )
    );
  }, [unreadCountByUserId]);

  // Manejar apertura de chat desde URL
  useEffect(() => {
    const userIdParam = searchParams.get("user");
    if (userIdParam && currentUserId && userIdParam !== currentUserId) {
      getOrCreatePrivateChannel(currentUserId, userIdParam).then((channelId) => {
        if (channelId) {
          loadConversations().then(() => {
            markAsRead(userIdParam);
            setSelectedConversation(userIdParam);
          });
        }
      });
    }
  }, [searchParams.get("user"), currentUserId]);

  useEffect(() => {
    const draft = searchParams.get("draft");
    const userIdParam = searchParams.get("user");
    if (!draft) return;
    if (!userIdParam) return;
    if (selectedConversation !== userIdParam) return;
    setNewMessage(draft);
  }, [searchParams, selectedConversation]);

  const { conversacionesPrincipales, solicitudesDeMensajes } = useMemo(() => {
    return splitConversationsByMutualFollow(conversations, {
      isGlobal: (c) => !!(c as Conversation).is_global,
      isMutualFollow: (c) => {
        const conv = c as Conversation;
        if (acceptedRequests.has(conv.id)) return true;
        return !!mutualFollowMap[conv.id];
      }
    });
  }, [conversations, mutualFollowMap, acceptedRequests]);

  const archivedConversations = useMemo(() => {
    return conversations.filter((c) => archivedChats.has(c.id));
  }, [conversations, archivedChats]);

  // Componente para renderizar cada conversación en virtualización
  const ConversationItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const conv = visibleConversations[index];
    if (!conv) return null;

    return (
      <button
        key={conv.id}
        style={style}
        onClick={() => {
          if (!conv.is_global) {
            markAsRead(conv.id);
          }
          setSelectedConversation(conv.id);
        }}
        onMouseDown={() => !conv.is_global && handleChatLongPress(conv.id)}
        onMouseUp={handleChatPressEnd}
        onMouseLeave={handleChatPressEnd}
        onTouchStart={() => !conv.is_global && handleChatLongPress(conv.id)}
        onTouchEnd={handleChatPressEnd}
        className={cn(
          "w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50",
          selectedConversation === conv.id && "bg-muted"
        )}
      >
        {conv.is_global ? (
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Globe className="h-6 w-6 text-primary" />
          </div>
        ) : (
          <Avatar className="h-12 w-12">
            <AvatarImage src={conv.avatar_url || undefined} />
            <AvatarFallback>
              {conv.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className={cn(
              "text-sm truncate",
              conv.unread_count > 0 ? "font-semibold" : "font-medium"
            )}>{conv.username}</p>
            {conv.unread_count > 0 && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {conv.unread_count}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground truncate">
              {conv.last_message}
            </p>
            {!conv.is_global && onlineUsers.get(conv.id)?.isOnline && (
              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="En línea" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(conv.last_message_at), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        </div>

        {activeInboxTab === 'requests' && !conv.is_global && (
          <div className="flex flex-col gap-2">
            <span
              role="button"
              tabIndex={0}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80"
              onClick={(e) => {
                e.stopPropagation();
                setAcceptedRequests((prev) => {
                  const next = new Set(prev);
                  next.add(conv.id);
                  return next;
                });

                followUser(conv.id).finally(() => {
                  setActiveInboxTab('inbox');
                });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setAcceptedRequests((prev) => {
                    const next = new Set(prev);
                    next.add(conv.id);
                    return next;
                  });

                  followUser(conv.id).finally(() => {
                    setActiveInboxTab('inbox');
                  });
                }
              }}
            >
              Aceptar
            </span>
            {archivedChats.has(conv.id) ? (
              <span
                role="button"
                tabIndex={0}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnarchiveChat(conv.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUnarchiveChat(conv.id);
                  }
                }}
              >
                Desarchivar
              </span>
            ) : (
              <span
                role="button"
                tabIndex={0}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChatLongPress(conv.id);
                  setTimeout(() => handleChatPressEnd(), 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleChatLongPress(conv.id);
                    setTimeout(() => handleChatPressEnd(), 0);
                  }
                }}
              >
                Archivar
              </span>
            )}
          </div>
        )}

        {activeInboxTab === 'archived' && !conv.is_global && (
          <span
            role="button"
            tabIndex={0}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
            onClick={(e) => {
              e.stopPropagation();
              handleUnarchiveChat(conv.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                handleUnarchiveChat(conv.id);
              }
            }}
          >
            Desarchivar
          </span>
        )}
      </button>
    );
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-96px)] border border-border rounded-lg overflow-hidden bg-background">
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar mensaje</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMessage}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lista de conversaciones */}
      <div className="w-full md:w-80 border-r border-border flex flex-col">
        {/* Header con búsqueda */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Mensajes</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversaciones o usuarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant={activeInboxTab === 'inbox' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveInboxTab('inbox')}
              className="h-8"
            >
              Principal
            </Button>
            <Button
              type="button"
              variant={activeInboxTab === 'requests' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveInboxTab('requests')}
              className="h-8"
            >
              Desconocidos
              {solicitudesDeMensajes.length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full h-5 px-2 flex items-center justify-center">
                  {solicitudesDeMensajes.length}
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant={activeInboxTab === 'archived' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveInboxTab('archived')}
              className="h-8"
            >
              Archivados
              {archivedConversations.length > 0 && (
                <span className="ml-2 bg-muted text-foreground text-xs rounded-full h-5 px-2 flex items-center justify-center">
                  {archivedConversations.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Resultados de búsqueda de usuarios */}
        {searchQuery.trim() && searchResults.length > 0 && (
          <div className="border-b border-border">
            <div className="px-4 py-2 text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Users className="h-3 w-3" />
              Iniciar nueva conversación
            </div>
            <div className="divide-y divide-border">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startConversation(user)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.username}</p>
                    <p className="text-xs text-muted-foreground">Enviar mensaje</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista de conversaciones */}
        {isMobile ? (
          <ScrollArea className="flex-1">
            {visibleConversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {searchQuery ? "No se encontraron conversaciones" : activeInboxTab === 'requests' ? "No tienes solicitudes" : activeInboxTab === 'archived' ? "No tienes chats archivados" : "No tienes conversaciones aún"}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {visibleConversations.map((conv: any) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    onMouseDown={() => !conv.is_global && handleChatLongPress(conv.id)}
                    onMouseUp={handleChatPressEnd}
                    onMouseLeave={handleChatPressEnd}
                    onTouchStart={() => !conv.is_global && handleChatLongPress(conv.id)}
                    onTouchEnd={handleChatPressEnd}
                    className={cn(
                      "w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left",
                      selectedConversation === conv.id && "bg-muted"
                    )}
                  >
                    {conv.is_global ? (
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Globe className="h-6 w-6 text-primary" />
                      </div>
                    ) : (
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conv.avatar_url || undefined} />
                        <AvatarFallback>
                          {conv.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm truncate">{conv.username}</p>
                        {conv.unread_count > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(conv.last_message_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>

                    {activeInboxTab === 'requests' && !conv.is_global && (
                      <div className="flex flex-col gap-2">
                        <span
                          role="button"
                          tabIndex={0}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAcceptedRequests((prev) => {
                              const next = new Set(prev);
                              next.add(conv.id);
                              return next;
                            });

                            followUser(conv.id).finally(() => {
                              setActiveInboxTab('inbox');
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              setAcceptedRequests((prev) => {
                                const next = new Set(prev);
                                next.add(conv.id);
                                return next;
                              });

                              followUser(conv.id).finally(() => {
                                setActiveInboxTab('inbox');
                              });
                            }
                          }}
                        >
                          Aceptar
                        </span>
                        {archivedChats.has(conv.id) ? (
                          <span
                            role="button"
                            tabIndex={0}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnarchiveChat(conv.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleUnarchiveChat(conv.id);
                              }
                            }}
                          >
                            Desarchivar
                          </span>
                        ) : (
                          <span
                            role="button"
                            tabIndex={0}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChatLongPress(conv.id);
                              setTimeout(() => handleChatPressEnd(), 0);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleChatLongPress(conv.id);
                                setTimeout(() => handleChatPressEnd(), 0);
                              }
                            }}
                          >
                            Archivar
                          </span>
                        )}
                      </div>
                    )}

                    {activeInboxTab === 'archived' && !conv.is_global && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnarchiveChat(conv.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUnarchiveChat(conv.id);
                          }
                        }}
                      >
                        Desarchivar
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border">
              {visibleConversations.map((conv: any) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  onMouseDown={() => !conv.is_global && handleChatLongPress(conv.id)}
                  onMouseUp={handleChatPressEnd}
                  onMouseLeave={handleChatPressEnd}
                  onTouchStart={() => !conv.is_global && handleChatLongPress(conv.id)}
                  onTouchEnd={handleChatPressEnd}
                  className={cn(
                    "w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50",
                    selectedConversation === conv.id && "bg-muted"
                  )}
                >
                  {conv.is_global ? (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Globe className="h-6 w-6 text-primary" />
                    </div>
                  ) : (
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conv.avatar_url || undefined} />
                      <AvatarFallback>
                        {conv.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm truncate">{conv.username}</p>
                      {conv.unread_count > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message}
                      </p>
                      {!conv.is_global && onlineUsers.get(conv.id)?.isOnline && (
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="En línea" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(conv.last_message_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>

                  {activeInboxTab === 'requests' && !conv.is_global && (
                    <div className="flex flex-col gap-2">
                      <span
                        role="button"
                        tabIndex={0}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAcceptedRequests((prev) => {
                            const next = new Set(prev);
                            next.add(conv.id);
                            return next;
                          });

                          followUser(conv.id).finally(() => {
                            setActiveInboxTab('inbox');
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            setAcceptedRequests((prev) => {
                              const next = new Set(prev);
                              next.add(conv.id);
                              return next;
                            });

                            followUser(conv.id).finally(() => {
                              setActiveInboxTab('inbox');
                            });
                          }
                        }}
                      >
                        Aceptar
                      </span>
                      {archivedChats.has(conv.id) ? (
                        <span
                          role="button"
                          tabIndex={0}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnarchiveChat(conv.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleUnarchiveChat(conv.id);
                            }
                          }}
                        >
                          Desarchivar
                        </span>
                      ) : (
                        <span
                          role="button"
                          tabIndex={0}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChatLongPress(conv.id);
                            setTimeout(() => handleChatPressEnd(), 0);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleChatLongPress(conv.id);
                              setTimeout(() => handleChatPressEnd(), 0);
                            }
                          }}
                        >
                          Archivar
                        </span>
                      )}
                    </div>
                  )}

                  {activeInboxTab === 'archived' && !conv.is_global && (
                    <span
                      role="button"
                      tabIndex={0}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnarchiveChat(conv.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUnarchiveChat(conv.id);
                        }
                      }}
                    >
                      Desarchivar
                    </span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Área de chat */}
      <div className="flex-1 flex flex-col hidden md:flex">
        {selectedConv ? (
          <>
            {/* Header del chat */}
            <div className="p-4 border-b border-border flex items-center gap-3">
              {selectedConv.is_global ? (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConv.avatar_url || undefined} />
                  <AvatarFallback>
                    {selectedConv.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <p className="font-medium">{selectedConv.username}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {selectedConv.is_global ? "Conversación pública" : "En línea"}
                  </p>
                  {!selectedConv.is_global && onlineUsers.get(selectedConv.id)?.isOnline && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" title="En línea" />
                  )}
                </div>
              </div>

              <div className="ml-auto flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                >
                  Atrás
                </Button>
              </div>
            </div>

            {selectedConv.is_global ? (
              <div className="flex-1 p-4">
                <GlobalChat />
              </div>
            ) : (
              <>
                {/* Mensajes */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>
                          {`Inicia una conversación con ${selectedConv.username}`}
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isOwn = message.id_autor === currentUserId;
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex gap-3",
                              isOwn ? "flex-row-reverse" : ""
                            )}
                          >
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={message.author?.avatar_url} />
                              <AvatarFallback>
                                {message.author?.username?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                              "flex flex-col max-w-[70%]",
                              isOwn ? "items-end" : ""
                            )}>
                              <div className={cn(
                                "flex items-center gap-2 mb-1",
                                isOwn ? "justify-end" : ""
                              )}>
                                <span className="text-xs font-medium">
                                  {message.author?.username}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(message.created_at), {
                                    addSuffix: true,
                                    locale: es,
                                  })}
                                </span>
                                {isOwn && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => requestDeleteMessage(message)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                              <div className={cn(
                                "rounded-2xl px-4 py-2",
                                isOwn
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              )}>
                                <p className="text-sm break-words">{message.contenido}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Typing Indicator */}
                    {false && ( // typingUsers.size > 0 && (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback>
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground italic">
                              {`typingUsers.size === 1 ? "Escribiendo..." : \`\${typingUsers.size} escribiendo...\``}
                            </span>
                          </div>
                          <div className="bg-muted rounded-2xl px-4 py-2 max-w-[70%]">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input de mensaje */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        // handleTyping(); // Trigger typing event
                      }}
                      placeholder="Escribe un mensaje..."
                      className="flex-1"
                      disabled={sending}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!newMessage.trim() || sending}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Selecciona una conversación para comenzar</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile full-screen chat view */}
      {isMobile && selectedConversation && (
        <div className="fixed inset-0 z-60 bg-background flex flex-col">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedConversation(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </Button>

            {selectedConv?.is_global ? (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary" />
              </div>
            ) : (
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedConv?.avatar_url || undefined} />
                <AvatarFallback>
                  {selectedConv?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <p className="font-medium">{selectedConv?.username}</p>
              <p className="text-xs text-muted-foreground">
                {selectedConv?.is_global ? "Conversación pública" : "En línea"}
              </p>
            </div>
          </div>

          {selectedConv?.is_global ? (
            <div className="flex-1 p-4">
              <GlobalChat />
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>
                        {`Inicia una conversación con ${selectedConv?.username}`}
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.id_autor === currentUserId;
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-3",
                            isOwn ? "flex-row-reverse" : ""
                          )}
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={message.author?.avatar_url} />
                            <AvatarFallback>
                              {message.author?.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "flex flex-col max-w-[70%]",
                            isOwn ? "items-end" : ""
                          )}>
                            <div className={cn(
                              "flex items-center gap-2 mb-1",
                              isOwn ? "justify-end" : ""
                            )}>
                              <span className="text-xs font-medium">
                                {message.author?.username}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(message.created_at), {
                                  addSuffix: true,
                                  locale: es,
                                })}
                              </span>
                              {isOwn && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => requestDeleteMessage(message)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                            <div className={cn(
                              "rounded-2xl px-4 py-2",
                              isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}>
                              <p className="text-sm break-words">{message.contenido}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!newMessage.trim() || sending}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
