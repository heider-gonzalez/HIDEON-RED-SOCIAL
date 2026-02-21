import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  contenido: string;
  created_at: string;
  id_autor: string;
  author: {
    username: string;
    avatar_url: string;
  };
}

export interface Conversation {
  id: string;
  username: string;
  avatar_url: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  channel_id: string;
  is_global?: boolean;
}

// Fetch messages for a specific channel with pagination
export const fetchMessages = async (
  channelId: string,
  pageParam: number = 0,
  pageSize: number = 50
): Promise<{ data: Message[]; nextCursor: number | null }> => {
  const from = pageParam * pageSize;
  const to = from + pageSize - 1;

  const { data: messagesData, error } = await supabase
    .from("mensajes")
    .select(`
      id,
      contenido,
      created_at,
      id_autor
    `)
    .eq("id_canal", channelId)
    .order("created_at", { ascending: false }) // Fetch newest first for pagination
    .range(from, to);

  if (error) throw error;

  // Get unique author IDs
  const authorIds = [...new Set(messagesData?.map(m => m.id_autor).filter(Boolean) || [])];

  let profilesMap: Record<string, { username: string; avatar_url: string }> = {};
  if (authorIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
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
  })).reverse(); // Reverse to show oldest first

  const hasNextPage = messagesData && messagesData.length === pageSize;
  const nextCursor = hasNextPage ? pageParam + 1 : null;

  return { data: messagesWithAuthors, nextCursor };
};

// Fetch conversations for current user
export const fetchConversations = async (currentUserId: string): Promise<Conversation[]> => {
  // Get private channels
  const { data: userChannels, error: channelsError } = await supabase
    .from("miembros_canal")
    .select(`
      id_canal,
      canales!inner(id, es_privado, nombre)
    `)
    .eq("id_usuario", currentUserId)
    .eq("canales.es_privado", true);

  if (channelsError) throw channelsError;

  const privateChannels = userChannels || [];

  // Get conversations from private channels
  const conversationsData = await Promise.all(
    privateChannels.map(async (memberChannel: any) => {
      const channelId = memberChannel.id_canal;

      const { data: otherMembers, error: membersError } = await supabase
        .from("miembros_canal")
        .select("id_usuario")
        .eq("id_canal", channelId)
        .neq("id_usuario", currentUserId);

      if (membersError || !otherMembers || otherMembers.length === 0) return null;

      const otherUserId = otherMembers[0].id_usuario;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", otherUserId)
        .single();

      if (profileError || !profile) return null;

      const { data: lastMessage } = await supabase
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

  // Add global conversation
  const { data: globalLastMessage } = await supabase
    .from("mensajes")
    .select("contenido, created_at")
    .eq("id_canal", "2f79759f-c53f-40ae-b786-59f6e69264a6")
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
    channel_id: "2f79759f-c53f-40ae-b786-59f6e69264a6",
    is_global: true,
  };

  return [globalConversation, ...validConversations];
};

// Send message
export const sendMessage = async (
  content: string,
  channelId: string,
  authorId: string
): Promise<Message> => {
  const { data, error } = await supabase
    .from("mensajes")
    .insert({
      contenido: content,
      id_canal: channelId,
      id_autor: authorId,
    })
    .select(`
      id,
      contenido,
      created_at,
      id_autor
    `)
    .single();

  if (error) throw error;

  // Get author profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", authorId)
    .single();

  return {
    ...data,
    author: {
      username: profile?.username || "Usuario",
      avatar_url: profile?.avatar_url || ""
    }
  };
};
