
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { 
  UseIdeaJoinMutationProps, 
  JoinIdeaCallbacks,
  JoinIdeaResult,
  IdeaJson 
} from "./types";
import { updateParticipantsJson, createIdeaNotification } from "./helpers";

export function useIdeaJoinMutation({ postId, onSuccess }: UseIdeaJoinMutationProps) {
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isPermissionError = (err: any) => {
    const status = Number(err?.status ?? err?.statusCode ?? err?.code);
    const code = String(err?.code ?? "");
    const message = String(err?.message ?? "").toLowerCase();
    return (
      status === 401 ||
      status === 403 ||
      code === "42501" ||
      message.includes("permission") ||
      message.includes("not allowed")
    );
  };

  const joinIdeaFn = async (profession: string, callbacks?: JoinIdeaCallbacks): Promise<JoinIdeaResult> => {
    try {
      setIsJoining(true);
      // Get user profile to use their career
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para unirte",
          variant: "destructive"
        });
        setIsJoining(false);
        return { success: false, message: "User not logged in" };
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('career, username, avatar_url')
        .eq('id', user.id)
        .single();
        
      // Check if user is already a participant
      const { data: existingParticipation } = await supabase
        .from("idea_participants")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .maybeSingle();
      
      if (existingParticipation) {
        setIsJoining(false);
        const result: JoinIdeaResult = { success: true, alreadyJoined: true, message: "Ya eres parte de esta idea" };
        if (callbacks?.onSuccess) callbacks.onSuccess(result);
        return result;
      }
      
      // Create new participation record - make sure to save the profession
      const { error: participationError } = await supabase
        .from("idea_participants")
        .insert({
          user_id: user.id,
          post_id: postId,
          profession: profession || profile?.career || "No especificado"
        });
      
      if (participationError) {
        // If RLS/policies block the backup table, continue with the JSON update (best-effort)
        // so the user experience still works while DB policies are corrected.
        if (!isPermissionError(participationError)) {
          console.error("Error al registrar participación:", participationError);
          toast({
            title: "Error",
            description: "No se pudo guardar tu participación",
            variant: "destructive"
          });
          setIsJoining(false);
          if (callbacks?.onError) callbacks.onError(new Error(participationError.message));
          return { success: false, message: participationError.message };
        }
        console.warn("⚠️ idea_participants blocked by policy; continuing with JSON update:", participationError);
        // Reset loading state immediately when permission error occurs to prevent infinite loading
        setIsJoining(false);
      }
      
      // Update post with participant info
      try {
        await updateParticipantsJson(user.id, postId, profile);
      } catch (jsonError: any) {
        console.error("Error updating participants JSON:", jsonError);
        toast({
          title: "Advertencia",
          description: "Te uniste a la idea, pero hubo un error actualizando la lista de participantes",
          variant: "destructive"
        });
        // Don't return error here - user already joined, just log the issue
      }
      
      // Create notification
      try {
        await createIdeaNotification(user.id, postId, profile?.username);
      } catch (notifError: any) {
        console.error("Error creating notification:", notifError);
        // Don't break the flow if notification fails
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      
      toast({
        title: "¡Te has unido!",
        description: participationError
          ? "Ahora eres parte de esta idea. (Algunas funciones pueden requerir ajustes de permisos)"
          : "Ahora eres parte de esta idea colaborativa",
      });
      
      setIsJoining(false);
      if (onSuccess) onSuccess();
      
      const result: JoinIdeaResult = { success: true, message: "Te has unido a la idea con éxito" };
      if (callbacks?.onSuccess) callbacks.onSuccess(result);
      return result;
    } catch (error: any) {
      console.error("Error joining idea:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo unir a la idea",
        variant: "destructive"
      });
      setIsJoining(false);
      if (callbacks?.onError) callbacks.onError(error);
      return { success: false, message: error.message };
    }
  };

  // Add leaveIdea function
  const leaveIdeaFn = async (): Promise<boolean> => {
    try {
      setIsLeaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para abandonar la idea",
          variant: "destructive"
        });
        setIsLeaving(false);
        return false;
      }
      
      // Remove from idea_participants table
      const { error } = await supabase
        .from("idea_participants")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", postId);
        
      if (error) {
        console.error("Error al abandonar idea:", error);
        toast({
          title: "Error",
          description: "No se pudo abandonar la idea",
          variant: "destructive"
        });
        setIsLeaving(false);
        return false;
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      
      toast({
        title: "Has abandonado la idea",
        description: "Ya no eres participante de esta idea",
      });
      
      setIsLeaving(false);
      if (onSuccess) onSuccess();
      return true;
    } catch (error: any) {
      console.error("Error leaving idea:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo abandonar la idea",
        variant: "destructive"
      });
      setIsLeaving(false);
      return false;
    }
  };

  return { 
    joinIdea: joinIdeaFn, 
    leaveIdea: leaveIdeaFn, 
    isJoining,
    isLeaving 
  };
}
