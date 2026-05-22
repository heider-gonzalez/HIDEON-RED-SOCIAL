
import { useState, useEffect } from "react";
import { useIdeaJoinMutation } from "./use-idea-join-mutation";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface UseJoinIdeaButtonProps {
  postId: string;
  isParticipant?: boolean;
  showConfirmation?: boolean;
}

export type ParticipantStatus = 'pending' | 'approved' | 'rejected' | null;

export function useJoinIdeaButton({
  postId,
  showConfirmation = true,
}: UseJoinIdeaButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [profession, setProfession] = useState("");
  const [participantStatus, setParticipantStatus] = useState<ParticipantStatus>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const { joinIdea, leaveIdea, isJoining, isLeaving } = useIdeaJoinMutation({
    postId,
    onSuccess: () => checkParticipantStatus()
  });
  
  // Verificar el estado real del participante desde la base de datos
  const checkParticipantStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setParticipantStatus(null);
        return;
      }
      
      // Verificar en la tabla idea_participants con el campo status
      const { data: participant } = await supabase
        .from("idea_participants")
        .select("status")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();
        
      setParticipantStatus(participant?.status as ParticipantStatus || null);
    } catch (error) {
      console.error("Error checking participant status:", error);
      setParticipantStatus(null);
    } finally {
      setIsLoadingStatus(false);
    }
  };
  
  // Verificar el estado del participante al cargar el componente
  useEffect(() => {
    checkParticipantStatus();
  }, [postId]);

  const openDialog = () => {
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
  };

  const handleJoinIdea = async (professionValue: string) => {
    if (!professionValue.trim()) {
      toast({
        title: "Error",
        description: "Debes indicar tu profesión o habilidad",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      console.log("Joining idea with profession:", professionValue);
      const result = await joinIdea(professionValue);
      
      if (result.success) {
        // No mostramos toast aquí, la mutación ya muestra el mensaje correcto
        // Solo refrescamos el estado real desde la base de datos
        await checkParticipantStatus();
      } else if (result.alreadyJoined) {
        toast({
          title: "Ya tienes una solicitud",
          description: "Ya has solicitado unirte a esta idea",
        });
      }
      
      return result.success;
    } catch (error) {
      console.error("Error joining idea:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud",
        variant: "destructive",
      });
      return false;
    }
  };

  // Implementar leaveIdea
  const handleLeaveIdea = async () => {
    try {
      const success = await leaveIdea();
      
      if (success) {
        toast({
          title: "Has abandonado la idea",
          description: "Ya no eres participante de esta idea",
        });
        await checkParticipantStatus();
      }
      
      return success;
    } catch (error) {
      console.error("Error leaving idea:", error);
      toast({
        title: "Error",
        description: "No se pudo abandonar la idea",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    isDialogOpen,
    openDialog,
    closeDialog,
    profession,
    setProfession,
    handleJoinIdea,
    handleLeaveIdea,
    participantStatus,
    isParticipant: participantStatus === 'approved',
    isPending: participantStatus === 'pending',
    isRejected: participantStatus === 'rejected',
    isLoadingStatus,
    isJoining,
    isLeaving,
  };
}
