import { useState, useEffect, useRef, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, MoreVertical, Trash2, AtSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { MentionSuggestions } from "@/components/mentions/MentionSuggestions";
import { useMentions } from "@/hooks/mentions";
import { MentionUser } from "@/hooks/mentions/types";
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

interface Message {
  id: string;
  contenido: string;
  created_at: string;
  id_autor: string;
  author: {
    username: string;
    avatar_url: string;
  };
}

const MessageRow = memo(function MessageRow({
  message,
  currentUserId,
  onRequestDelete,
}: {
  message: Message;
  currentUserId: string | null;
  onRequestDelete: (m: Message) => void;
}) {
  const isOwnMessage = message.id_autor === currentUserId;

  return (
    <div className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={message.author?.avatar_url} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {message.author?.username?.[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col gap-1 max-w-[70%] ${isOwnMessage ? "items-end" : ""}`}>
        <div className={`flex items-center gap-2 ${isOwnMessage ? "justify-end" : ""}`}>
          <span className="text-sm font-medium text-foreground">
            {message.author?.username || "Usuario"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
              locale: es,
            })}
          </span>
          {isOwnMessage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onRequestDelete(message)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
          }`}
        >
          <p className="text-sm break-words">{message.contenido}</p>
        </div>
      </div>
    </div>
  );
});

export function GlobalChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const debug = import.meta.env.DEV;
  const authorCacheRef = useRef<Record<string, { username: string; avatar_url: string }>>({});

  // Mention system
  const {
    mentionUsers,
    mentionListVisible,
    mentionPosition,
    mentionIndex,
    setMentionIndex,
    handleTextChange,
    insertMention,
    setMentionListVisible
  } = useMentions();

  const createMentionNotifications = useCallback(async (messageContent: string, messageId: string, authorId: string) => {
    const mentionRegex = /@([A-Za-z0-9_]+)/g;
    const usernames = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(messageContent)) !== null) {
      const u = match[1];
      if (u) usernames.add(u);
    }

    if (usernames.size === 0) return;

    const { data: mentionedProfiles, error } = await supabase
      .from("profiles")
      .select("id, username")
      .in("username", Array.from(usernames));

    if (error) {
      if (debug) console.error('Error resolving mentions:', error);
      return;
    }

    const receivers = (mentionedProfiles || [])
      .map((p: any) => ({ id: p.id as string, username: p.username as string }))
      .filter((p) => p.id && p.id !== authorId);

    if (receivers.length === 0) return;

    await supabase
      .from("notifications")
      .insert(
        receivers.map((r) => ({
          receiver_id: r.id,
          sender_id: authorId,
          type: "mention",
          message: `te ha mencionado en un mensaje: @${r.username}`,
          read: false,
        }))
      );
  }, [debug]);

  // Handle text change with mention detection
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Trigger mention handling
    if (inputRef.current) {
      handleTextChange(value, inputRef.current.selectionStart, inputRef.current);
    }
  }, [handleTextChange]);

  // Handle mention selection
  const handleSelectMention = useCallback((user: MentionUser) => {
    const newText = insertMention(newMessage, user);
    setNewMessage(newText);
    setMentionListVisible(false);
  }, [insertMention, newMessage, setMentionListVisible]);

  // Handle mention button click
  const handleMentionClick = useCallback(() => {
    if (inputRef.current) {
      const cursorPos = inputRef.current.selectionStart;
      const textBefore = newMessage.substring(0, cursorPos);
      const textAfter = newMessage.substring(cursorPos);
      
      const newValue = textBefore + '@' + textAfter;
      setNewMessage(newValue);
      
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(cursorPos + 1, cursorPos + 1);
          handleTextChange(newValue, cursorPos + 1, inputRef.current);
        }
      }, 0);
    }
  }, [handleTextChange, newMessage, setNewMessage]);

  const loadMessages = useCallback(async () => {
    try {
      // Primero obtener los mensajes
      const { data: messagesData, error } = await supabase
        .from("mensajes")
        .select(`
          id,
          contenido,
          created_at,
          id_autor
        `)
        .eq("id_canal", GLOBAL_CHANNEL_ID)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      // Obtener IDs únicos de autores
      const authorIds = [...new Set(messagesData?.map(m => m.id_autor).filter(Boolean) || [])];
      
      // Obtener perfiles de los autores
      let profilesMap: Record<string, { username: string; avatar_url: string }> = { ...authorCacheRef.current };
      if (authorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", authorIds);
        
        if (!profilesError && profiles) {
          profiles.forEach((profile: any) => {
            profilesMap[profile.id] = {
              username: profile.username || "Usuario",
              avatar_url: profile.avatar_url || "",
            };
          });
        }
      }

      authorCacheRef.current = profilesMap;

      // Combinar mensajes con sus autores
      const messagesWithAuthors = (messagesData || []).map(message => ({
        ...message,
        author: profilesMap[message.id_autor || ""] || { username: "Usuario", avatar_url: "" }
      }));

      setMessages(messagesWithAuthors as Message[]);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los mensajes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Enviar mensaje
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId || sending) return;

    setSending(true);
    try {
      const { data: messageData, error } = await supabase
        .from("mensajes")
        .insert({
          contenido: newMessage.trim(),
          id_canal: GLOBAL_CHANNEL_ID,
          id_autor: currentUserId,
        })
        .select()
        .single();

      if (error) throw error;

      // Create mention notifications
      if (messageData) {
        try {
          await createMentionNotifications(newMessage.trim(), messageData.id, currentUserId);
        } catch (mentionError) {
          if (debug) console.error('Mention notifications failed (non-blocking):', mentionError);
        }
      }

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [createMentionNotifications, currentUserId, debug, newMessage, sending, toast]);

  // Scroll automático al último mensaje
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const requestDeleteMessage = useCallback((message: Message) => {
    if (!currentUserId) return;
    if (message.id_autor !== currentUserId) return;
    setMessageToDelete(message);
    setIsDeleteDialogOpen(true);
  }, [currentUserId]);

  const confirmDeleteMessage = useCallback(async () => {
    if (!messageToDelete || !currentUserId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('mensajes')
        .delete()
        .eq('id', messageToDelete.id)
        .eq('id_autor', currentUserId);

      if (error) throw error;

      toast({
        title: 'Mensaje eliminado',
      });

      setIsDeleteDialogOpen(false);
      setMessageToDelete(null);
      setMessages((prev) => prev.filter((m) => m.id !== messageToDelete.id));
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
  }, [currentUserId, messageToDelete, toast]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Obtener usuario actual
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Cargar mensajes iniciales
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Configurar Realtime
  useEffect(() => {
    const channel = supabase
      .channel("global-chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes",
          filter: `id_canal=eq.${GLOBAL_CHANNEL_ID}`,
        },
        async (payload) => {
          const authorId = payload.new.id_autor as string;
          let authorData = authorCacheRef.current[authorId];

          if (!authorData) {
            const { data } = await supabase
              .from("profiles")
              .select("id, username, avatar_url")
              .eq("id", authorId)
              .maybeSingle();

            if (data) {
              authorData = {
                username: (data as any).username || "Usuario",
                avatar_url: (data as any).avatar_url || "",
              };
              authorCacheRef.current[authorId] = authorData;
            }
          }

          const newMsg: Message = {
            id: payload.new.id,
            contenido: payload.new.contenido,
            created_at: payload.new.created_at,
            id_autor: payload.new.id_autor,
            author: authorData || { username: "Usuario", avatar_url: "" },
          };

          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-card border border-border rounded-lg">
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

      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">Chat Global</h2>
        <p className="text-sm text-muted-foreground">
          {messages.length} mensajes
        </p>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              currentUserId={currentUserId}
              onRequestDelete={requestDeleteMessage}
            />
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
        <div className="relative" ref={containerRef}>
          <div className="flex gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleMentionClick}
              className="shrink-0"
            >
              <AtSign className="h-4 w-4" />
            </Button>
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Escribe un mensaje... Usa @ para mencionar"
              className="flex-1"
              disabled={sending || !currentUserId}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newMessage.trim() || sending || !currentUserId}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Mention Suggestions */}
          <MentionSuggestions
            users={mentionUsers}
            isVisible={mentionListVisible}
            position={mentionPosition}
            selectedIndex={mentionIndex}
            onSelectUser={handleSelectMention}
            onSetIndex={setMentionIndex}
          />
        </div>
      </form>
    </div>
  );
}
