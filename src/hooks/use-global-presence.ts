import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useGlobalPresence() {
  const { user } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setOnlineUserIds(new Set());
      return;
    }

    const channel = supabase.channel("presence:global", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const ids = new Set<string>(Object.keys(state || {}));
        setOnlineUserIds(ids);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        if (!key) return;
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.add(String(key));
          return next;
        });
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        if (!key) return;
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.delete(String(key));
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({ online_at: new Date().toISOString() });
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
      channelRef.current = null;
    };
  }, [user?.id]);

  const isOnline = useMemo(() => {
    return (userId: string | null | undefined) => {
      if (!userId) return false;
      return onlineUserIds.has(String(userId));
    };
  }, [onlineUserIds]);

  return {
    onlineUserIds,
    isOnline,
  };
}
