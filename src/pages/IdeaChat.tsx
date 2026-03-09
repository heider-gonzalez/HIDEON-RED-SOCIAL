import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Loader2, MoreVertical, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface ProfileLite {
  username: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  contenido: string;
  created_at: string;
  id_autor: string;
  author?: ProfileLite;
}

export default function IdeaChat() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ideaTitle, setIdeaTitle] = useState<string>("Chat de idea");
  const [isOwner, setIsOwner] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => {
    return !!channelId && !!currentUserId && !!newMessage.trim() && !sending;
  }, [channelId, currentUserId, newMessage, sending]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const loadMessages = async (cid: string) => {
    const { data: baseMessages, error } = await supabase
      .from("mensajes")
      .select("id, contenido, created_at, id_autor")
      .eq("id_canal", cid)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;

    const authorIds = [...new Set((baseMessages || []).map((m: any) => m.id_autor).filter(Boolean))];

    let profilesMap = new Map<string, ProfileLite>();
    if (authorIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", authorIds);

      if (profilesError) throw profilesError;

      (profiles || []).forEach((p: any) => {
        profilesMap.set(p.id, {
          username: p.username ?? null,
          avatar_url: p.avatar_url ?? null,
        });
      });
    }

    const withAuthors: Message[] = (baseMessages || []).map((m: any) => ({
      ...m,
      author: profilesMap.get(m.id_autor) || { username: null, avatar_url: null },
    }));

    setMessages(withAuthors);
    setTimeout(scrollToBottom, 50);
  };

  const ensureIdeaChannel = async (pid: string, ownerId: string, title: string, canCreate: boolean) => {
    if (!ownerId) return null;
    const { data: existing, error: existingError } = await supabase
      .from("idea_channels")
      .select("channel_id")
      .eq("post_id", pid)
      .maybeSingle();

    if (existingError) throw existingError;
    if ((existing as any)?.channel_id) return (existing as any).channel_id as string;

    if (!canCreate) return null;

    const { data: newChannelId, error: rpcError } = await supabase
      .rpc("get_or_create_idea_channel", { p_post_id: pid } as any);

    if (rpcError) throw rpcError;
    return (newChannelId as any) || null;
  };

  useEffect(() => {
    const init = async () => {
      if (!postId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.access_token) {
          toast({
            title: "Sesión expirada",
            description: "Vuelve a iniciar sesión para acceder al chat.",
            variant: "destructive",
          });
          navigate("/auth");
          return;
        }

        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id || null;
        setCurrentUserId(uid);

        if (!uid) {
          toast({
            title: "Sesión expirada",
            description: "Vuelve a iniciar sesión para acceder al chat.",
            variant: "destructive",
          });
          navigate("/auth");
          return;
        }

        const { data: post, error: postError } = await supabase
          .from("posts")
          .select("idea, user_id")
          .eq("id", postId)
          .maybeSingle();

        if (postError) throw postError;

        const ownerId = (post as any)?.user_id as string | undefined;
        const title = (post as any)?.idea?.title as string | undefined;

        setIdeaTitle(title || "Chat de idea");
        const owner = !!uid && !!ownerId && uid === ownerId;
        setIsOwner(owner);

        const canCreate = owner && !!ownerId;
        const cid = await ensureIdeaChannel(postId, ownerId || "", title || "Chat de idea", canCreate);
        setChannelId(cid);

        if (cid) {
          await loadMessages(cid);
        }
      } catch (error: any) {
        console.error("IdeaChat init error:", error);

        const message =
          error?.code === '42501' || String(error?.message || '').toLowerCase().includes('row-level security')
            ? 'Permisos insuficientes para crear/leer el chat. Verifica las políticas RLS en Supabase y vuelve a iniciar sesión.'
            : (error?.message || "No se pudo cargar el chat de la idea");

        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [postId, toast]);

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`idea-chat-${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensajes", filter: `id_canal=eq.${channelId}` },
        () => {
          loadMessages(channelId);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "mensajes", filter: `id_canal=eq.${channelId}` },
        () => {
          loadMessages(channelId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!postId || !channelId || !currentUserId || !newMessage.trim() || sending) return;

    try {
      setSending(true);
      const { error } = await supabase
        .from("mensajes")
        .insert({
          contenido: newMessage.trim(),
          id_canal: channelId,
          id_autor: currentUserId,
        } as any);

      if (error) throw error;

      setNewMessage("");
    } catch (error: any) {
      console.error("Error sending idea message:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    } finally {
      setSending(false);
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
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("mensajes")
        .delete()
        .eq("id", messageToDelete.id)
        .eq("id_autor", currentUserId);

      if (error) throw error;

      toast({ title: "Mensaje eliminado" });
      setIsDeleteDialogOpen(false);
      setMessageToDelete(null);
    } catch (error: any) {
      console.error("Error deleting idea message:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el mensaje",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full bg-background min-h-screen">
      <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Volver
            </Button>

            <Link to={`/idea/${postId}/participants`} className="text-sm text-muted-foreground hover:underline">
              Ver participantes
            </Link>
          </div>

          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <div className="p-4 border-b border-border">
              <h1 className="text-lg font-semibold">{ideaTitle}</h1>
              <p className="text-sm text-muted-foreground">Chat privado de la idea</p>
            </div>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar mensaje</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDeleteMessage}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "Eliminando..." : "Eliminar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {loading ? (
              <div className="flex items-center justify-center h-[600px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !channelId ? (
              <div className="p-8 text-center text-muted-foreground">
                El chat de esta idea aún no está disponible.
              </div>
            ) : (
              <>
                <ScrollArea className="h-[540px] p-4">
                  <div className="flex flex-col gap-4">
                    {messages.map((message) => {
                      const isOwn = message.id_autor === currentUserId;
                      const username = message.author?.username || "Usuario";
                      return (
                        <div key={message.id} className={cn("flex gap-3", isOwn ? "flex-row-reverse" : "")}>
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={message.author?.avatar_url || undefined} />
                            <AvatarFallback>{username[0]?.toUpperCase() || "U"}</AvatarFallback>
                          </Avatar>

                          <div className={cn("flex flex-col max-w-[75%]", isOwn ? "items-end" : "")}>
                            <div className={cn("flex items-center gap-2 mb-1", isOwn ? "justify-end" : "")}>
                              <span className="text-xs font-medium">{username}</span>
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

                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2",
                                isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                              )}
                            >
                              <p className="text-sm break-words">{message.contenido}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-border flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    disabled={sending}
                  />
                  <Button type="submit" disabled={!canSend} className="gap-2">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar
                  </Button>
                </form>
              </>
            )}
          </div>
      </div>
    </div>
  );
}
