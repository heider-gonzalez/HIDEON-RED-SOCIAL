import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface UseIdeaApprovalMutationProps {
  postId: string;
  onSuccess?: () => void;
}

export function useIdeaApprovalMutation({ postId, onSuccess }: UseIdeaApprovalMutationProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const approveParticipant = async (participantUserId: string): Promise<boolean> => {
    try {
      setIsApproving(true);
      
      const { error } = await supabase
        .from("idea_participants")
        .update({ status: "approved" })
        .eq("post_id", postId)
        .eq("user_id", participantUserId);

      if (error) {
        console.error("Error approving participant:", error);
        toast({
          title: "Error",
          description: "No se pudo aprobar al participante",
          variant: "destructive"
        });
        setIsApproving(false);
        return false;
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["idea-participants"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });

      toast({
        title: "Participante aprobado",
        description: "El usuario ahora es parte de la idea",
      });

      setIsApproving(false);
      if (onSuccess) onSuccess();
      return true;
    } catch (error: any) {
      console.error("Error approving participant:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo aprobar al participante",
        variant: "destructive"
      });
      setIsApproving(false);
      return false;
    }
  };

  const rejectParticipant = async (participantUserId: string): Promise<boolean> => {
    try {
      setIsRejecting(true);
      
      const { error } = await supabase
        .from("idea_participants")
        .update({ status: "rejected" })
        .eq("post_id", postId)
        .eq("user_id", participantUserId);

      if (error) {
        console.error("Error rejecting participant:", error);
        toast({
          title: "Error",
          description: "No se pudo rechazar al participante",
          variant: "destructive"
        });
        setIsRejecting(false);
        return false;
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["idea-participants"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });

      toast({
        title: "Solicitud rechazada",
        description: "La solicitud de unión ha sido rechazada",
      });

      setIsRejecting(false);
      if (onSuccess) onSuccess();
      return true;
    } catch (error: any) {
      console.error("Error rejecting participant:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo rechazar al participante",
        variant: "destructive"
      });
      setIsRejecting(false);
      return false;
    }
  };

  return { 
    approveParticipant, 
    rejectParticipant, 
    isApproving,
    isRejecting 
  };
}
