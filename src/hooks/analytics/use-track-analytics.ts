import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TrackEventParams {
  eventType: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export function useTrackAnalytics() {
  return useMutation({
    mutationFn: async ({ eventType, entityType, entityId, metadata = {} }: TrackEventParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Call the RPC function with correct parameter names
      const { error } = await (supabase as any).rpc("track_analytics_event", {
        p_event_type: eventType,
        p_entity_type: entityType,
        p_entity_id: entityId || null,
        p_owner_id: user.id,
        p_is_anonymous: false,
        p_metadata: metadata,
      });

      if (error) throw error;
      return { success: true };
    },
    onError: (error) => {
      console.error("Failed to track analytics event:", error);
      // Silently fail to not break user experience
    },
  });
}
