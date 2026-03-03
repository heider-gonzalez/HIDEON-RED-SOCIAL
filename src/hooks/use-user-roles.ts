import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id ?? null;
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
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 0,
  });
}
