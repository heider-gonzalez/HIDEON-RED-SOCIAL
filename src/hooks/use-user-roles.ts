import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAuthSnapshot } from "@/lib/auth/auth-store";

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
  return useQuery<UserRolesResult>({
    queryKey: ["user-roles"],
    queryFn: async () => {
      const { user } = getAuthSnapshot();
      const userId = user?.id ?? null;
      if (!userId) {
        return {
          userId: null,
          isAdmin: false,
          isModerator: false,
          isModeratorOrAdmin: false,
        };
      }

      const [isModerator, isAdmin] = await Promise.all([
        hasRole(userId, "moderator"),
        hasRole(userId, "admin"),
      ]);

      return {
        userId,
        isAdmin,
        isModerator,
        isModeratorOrAdmin: isModerator || isAdmin,
      };
    },
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 0,
  });
}
