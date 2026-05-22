import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface IdeaRequest {
  id: string;
  post_id: string;
  user_id: string;
  profession: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  username?: string;
  avatar_url?: string;
}

export function useIdeaRequests(postId: string) {
  return useQuery({
    queryKey: ['idea-requests', postId],
    queryFn: async (): Promise<IdeaRequest[]> => {
      if (!postId) return [];

      // Compatibility mode: some deployments don't have idea_requests columns in PostgREST cache.
      // We return an empty list and rely on notifications + participants instead.
      return [];
    },
    enabled: !!postId
  });
}

export function useCreateIdeaRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const getOrCreatePrivateChannel = async (userId1: string, userId2: string): Promise<string | null> => {
    try {
      const { data: user1Channels, error: searchError } = await supabase
        .from("miembros_canal")
        .select(`
          id_canal,
          canales!inner(id, es_privado)
        `)
        .eq("id_usuario", userId1)
        .eq("canales.es_privado", "true");

      if (searchError) throw searchError;

      if (user1Channels && user1Channels.length > 0) {
        for (const memberChannel of user1Channels as any[]) {
          const channelId = memberChannel.id_canal;
          const { data: members } = await supabase
            .from("miembros_canal")
            .select("id_usuario")
            .eq("id_canal", channelId);

          if (members && members.length === 2) {
            const memberIds = (members as any[]).map((m) => m.id_usuario);
            if (memberIds.includes(userId1) && memberIds.includes(userId2)) {
              return channelId;
            }
          }
        }
      }

      const { data: newChannel, error: createError } = await supabase
        .from("canales")
        .insert({
          nombre: "Chat privado",
          es_privado: true,
        })
        .select()
        .single();

      if (createError) throw createError;
      if (!newChannel) return null;

      // @ts-ignore - Supabase type inference issue
      await supabase.from("miembros_canal").insert([
        { id_canal: (newChannel as any).id, id_usuario: userId1 },
        { id_canal: (newChannel as any).id, id_usuario: userId2 },
      ]);

      return (newChannel as any).id;
    } catch (error) {
      console.error("Error getting/creating private channel:", error);
      return null;
    }
  };

  return useMutation({
    mutationFn: async ({ 
      postId, 
      profession, 
      message,
      ideaOwnerId 
    }: { 
      postId: string; 
      profession: string; 
      message?: string;
      ideaOwnerId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      // Create notification for idea owner
      // @ts-ignore - Supabase type inference issue
      await supabase.from('notifications').insert({
        receiver_id: ideaOwnerId,
        sender_id: user.id,
        type: 'idea_request',
        post_id: postId,
        message: `Habilidad/Profesión: ${profession}`
      });

      // Send message to idea owner inbox (existing chat system)
      const channelId = await getOrCreatePrivateChannel(user.id, ideaOwnerId);
      if (channelId) {
        const contentLines = [
          'Solicitud para unirse a tu idea',
          `Habilidad/Profesión: ${profession}`,
          message ? `Mensaje: ${message}` : null,
        ].filter(Boolean);

        await supabase
          .from('mensajes')
          .insert({
            contenido: contentLines.join('\n'),
            id_canal: channelId,
            id_autor: user.id,
          } as any);
      }

      return { ok: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['idea-requests', variables.postId] });
      toast({
        title: "Solicitud enviada",
        description: "El creador de la idea revisará tu solicitud"
      });
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast({
          variant: "destructive",
          title: "Ya solicitaste",
          description: "Ya has enviado una solicitud para esta idea"
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo enviar la solicitud"
        });
      }
    }
  });
}

export function useAcceptIdeaRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const getOrCreateIdeaChannel = async (postId: string, creatorId: string): Promise<string | null> => {
    try {
      const { data: existing, error: existingError } = await supabase
        .from('idea_channels')
        .select('channel_id')
        .eq('post_id', postId)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing && existing.channel_id) return existing.channel_id as any;

      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('idea')
        .eq('id', postId)
        .maybeSingle();

      if (postError) throw postError;
      const ideaTitle = (post as any)?.idea?.title;

      // @ts-ignore - Supabase type inference issue
      const { data: newChannel, error: createChannelError } = await supabase
        .from('canales')
        .insert({
          nombre: ideaTitle ? `Idea: ${ideaTitle}` : 'Chat de idea',
          es_privado: true,
        })
        .select('id')
        .single();

      if (createChannelError) throw createChannelError;
      const channelId = (newChannel as any)?.id as string | undefined;
      if (!channelId) return null;

      const { error: linkError } = await supabase
        .from('idea_channels')
        .insert({ post_id: postId, channel_id: channelId } as any);

      if (linkError) throw linkError;

      const { data: existingMembers, error: membersError } = await supabase
        .from('miembros_canal')
        .select('id_usuario')
        .eq('id_canal', channelId);

      if (membersError) throw membersError;
      const existingIds = new Set((existingMembers || []).map((m: any) => m.id_usuario).filter(Boolean));

      if (!existingIds.has(creatorId)) {
        await supabase.from('miembros_canal').insert({ id_canal: channelId, id_usuario: creatorId } as any);
      }

      const { data: participants, error: participantsError } = await supabase
        .from('idea_participants')
        .select('user_id')
        .eq('post_id', postId);

      if (participantsError) throw participantsError;
      const participantIds = (participants || []).map((p: any) => p.user_id).filter(Boolean);
      for (const participantId of participantIds) {
        if (!existingIds.has(participantId)) {
          await supabase.from('miembros_canal').insert({ id_canal: channelId, id_usuario: participantId } as any);
        }
      }

      return channelId;
    } catch (error) {
      console.error('Error getting/creating idea channel:', error);
      return null;
    }
  };

  const ensureMemberInChannel = async (channelId: string, userId: string) => {
    const { data: existing, error } = await supabase
      .from('miembros_canal')
      .select('id')
      .eq('id_canal', channelId)
      .eq('id_usuario', userId)
      .limit(1);

    if (error) {
      console.error('Error checking channel membership:', error);
      return;
    }

    if (!existing || existing.length === 0) {
      const { error: insertError } = await supabase
        .from('miembros_canal')
        .insert({ id_canal: channelId, id_usuario: userId } as any);

      if (insertError) {
        console.error('Error adding channel member:', insertError);
      }
    }
  };

  return useMutation({
    mutationFn: async ({ 
      postId, 
      userId,
      profession 
    }: { 
      postId: string; 
      userId: string;
      profession: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .maybeSingle();

      if (postError) throw postError;
      const creatorId = (post as any)?.user_id as string | undefined;

      if (!creatorId) {
        throw new Error('No se pudo determinar el creador de la idea');
      }

      if (!user?.id || user.id !== creatorId) {
        throw new Error('Solo el creador de la idea puede aceptar participantes');
      }

      // Update idea_participants status to approved
      // @ts-ignore - Supabase type inference issue
      const { error: participantError } = await supabase
        .from('idea_participants')
        .update({ status: 'approved' })
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (participantError) {
        throw participantError;
      }

      const channelId = await getOrCreateIdeaChannel(postId, creatorId);
      if (channelId) {
        await ensureMemberInChannel(channelId, creatorId);
        await ensureMemberInChannel(channelId, userId);
      }

      // Notify the user
      if (user) {
        // @ts-ignore - Supabase type inference issue
        await supabase.from('notifications').insert({
          receiver_id: userId,
          sender_id: user.id,
          type: 'idea_accepted',
          post_id: postId,
          message: 'Tu solicitud para unirte a la idea fue aceptada'
        });
      }

      return { postId, userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['idea-requests', data.postId] });
      queryClient.invalidateQueries({ queryKey: ['idea-participants', data.postId] });
      toast({
        title: "Solicitud aceptada",
        description: "El usuario ha sido añadido a la idea"
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo aceptar la solicitud"
      });
    }
  });
}

export function useRejectIdeaRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ postId, userId }: { postId: string; userId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update idea_participants status to rejected
      const { error: participantError } = await supabase
        .from('idea_participants')
        .update({ status: 'rejected' })
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (participantError) {
        console.error('Error rejecting participant:', participantError);
      }

      if (user) {
        // @ts-ignore - Supabase type inference issue
        await supabase.from('notifications').insert({
          receiver_id: userId,
          sender_id: user.id,
          type: 'idea_rejected',
          post_id: postId,
          message: 'Tu solicitud para unirte a la idea fue rechazada'
        });
      }
      return { postId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['idea-requests', data.postId] });
      queryClient.invalidateQueries({ queryKey: ['idea-participants', data.postId] });
      toast({
        title: "Solicitud rechazada"
      });
    }
  });
}

export function useUserRequestStatus(postId: string, ideaOwnerId?: string) {
  return useQuery({
    queryKey: ['user-idea-request-status', postId, ideaOwnerId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Accepted if user is already a participant
      const { data: participation } = await supabase
        .from('idea_participants')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (participation) return 'accepted' as const;

      // If user received a rejected/accepted notification for this post
      const { data: decisionNotifs } = await supabase
        .from('notifications')
        .select('type')
        .eq('receiver_id', user.id)
        .eq('post_id', postId)
        .in('type', ['idea_accepted', 'idea_rejected'])
        .order('created_at', { ascending: false })
        .limit(1);

      const lastDecision = (decisionNotifs as any)?.[0]?.type;
      if (lastDecision === 'idea_rejected') return 'rejected' as const;
      if (lastDecision === 'idea_accepted') return 'accepted' as const;

      // Pending if the user already sent a request notification to the idea owner
      if (ideaOwnerId) {
        const { data: sent } = await supabase
          .from('notifications')
          .select('id')
          .eq('sender_id', user.id)
          .eq('receiver_id', ideaOwnerId)
          // @ts-ignore - Supabase type inference issue
          .eq('type', 'idea_request')
          .eq('post_id', postId)
          .limit(1);

        if (sent && sent.length > 0) return 'pending' as const;
      }

      return null;
    },
    enabled: !!postId
  });
}
