import { supabase } from "@/integrations/supabase/client";

export async function trackAnalyticsEvent({
  eventType,
  entityType,
  entityId,
  metadata = {},
}: {
  eventType: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Silently fail for unauthenticated users

    const { error } = await (supabase as any).rpc("track_analytics_event", {
      p_event_type: eventType,
      p_entity_type: entityType,
      p_entity_id: entityId || null,
      p_owner_id: user.id,
      p_is_anonymous: false,
      p_metadata: metadata,
    });

    if (error) {
      console.error("Analytics tracking error:", error);
    }
  } catch (error) {
    console.error("Analytics tracking failed:", error);
  }
}

// Event types for MVP tracking
export const ANALYTICS_EVENTS = {
  PROJECT_CREATED: "project_created",
  IDEA_CREATED: "idea_created",
  APPLICATION_SENT: "application_sent",
  PROJECT_VIEW: "project_view",
  PROJECT_CLICK_DEMO: "project_click_demo",
  PROJECT_CLICK_CONTACT: "project_click_contact",
  PROFILE_VIEW: "profile_view",
} as const;
