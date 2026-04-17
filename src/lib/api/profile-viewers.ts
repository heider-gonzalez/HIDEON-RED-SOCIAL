import { supabase } from "@/integrations/supabase/client";
import { getAuthUser } from "@/lib/auth/auth-store";

export async function trackProfileView(profileId: string, viewerIpAddress?: string) {
  try {
    const user = getAuthUser();
    await (supabase as any).rpc('track_analytics_event', {
      p_event_type: 'profile_view',
      p_entity_type: 'profile',
      p_entity_id: profileId,
      p_owner_id: profileId,
      p_is_anonymous: !user,
      p_metadata: viewerIpAddress ? { ip_address: viewerIpAddress } : {}
    });
  } catch {
    // ignore
  }
}

export async function trackPremiumProfileView(profileId: string, viewerIpAddress?: string) {
  await trackProfileView(profileId, viewerIpAddress);
}

export async function getProfileViewers(profileId: string, limit = 10) {
  return [];
}

export async function getProfileViewsCount(profileId: string) {
  return {
    total: 0,
    today: 0,
    week: 0
  };
}

export async function getPremiumProfileViewers(profileId: string) {
  return [];
}

export async function trackEngagementMetrics(userId: string) {
  console.log('Engagement metrics tracking disabled');
}
