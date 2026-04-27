import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { getCachedUserRoles, setCachedUserRoles } from "@/lib/auth/roles-cache";

type UserRolesResult = {
  userId: string | null;
  isAdmin: boolean;
  isModerator: boolean;
  isModeratorOrAdmin: boolean;
};

async function hasRole(userId: string, role: "admin" | "moderator") {
  const { data, error } = await (supabase.rpc as any)("has_role", {
    _role: role,
    _user_id: userId,
  });

  if (error) return false;
  return Boolean(data);
}

export function useUserRoles() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery<UserRolesResult>({
    queryKey: ["user-roles", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) throw new Error("Missing user");

      const cached = getCachedUserRoles(userId);
      if (cached) return cached;

      const [isModerator, isAdmin] = await Promise.all([
        hasRole(userId, "moderator"),
        hasRole(userId, "admin"),
      ]);

      const result = {
        userId,
        isAdmin,
        isModerator,
        isModeratorOrAdmin: isModerator || isAdmin,
      };

      setCachedUserRoles(userId, {
        isAdmin: result.isAdmin,
        isModerator: result.isModerator,
        isModeratorOrAdmin: result.isModeratorOrAdmin,
      });

      return result;
    },
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: 0,
  });
}
