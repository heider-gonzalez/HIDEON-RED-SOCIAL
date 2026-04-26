
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthSnapshot } from "@/lib/auth/auth-store";
import { useUserRoles } from "@/hooks/use-user-roles";

/**
 * Hook to check if the current user is the author of a post
 */
export function usePostAuthor(
  postUserId: string,
  companyId: string | null | undefined,
  setIsCurrentUserAuthor: (value: boolean) => void,
  setCanDeletePost: (value: boolean) => void
) {
  const userRolesQuery = useUserRoles();

  useEffect(() => {
    const checkAuthor = async () => {
      const { user } = getAuthSnapshot();
      const uid = user?.id;
      if (!uid) {
        setIsCurrentUserAuthor(false);
        setCanDeletePost(false);
        return;
      }

      const isModeratorOrAdmin = Boolean(userRolesQuery.data?.isModeratorOrAdmin);
      if (isModeratorOrAdmin) {
        setIsCurrentUserAuthor(false);
        setCanDeletePost(true);
        return;
      }

      const isOwner = uid === postUserId;
      if (!companyId) {
        setIsCurrentUserAuthor(isOwner);
        setCanDeletePost(isOwner);
        return;
      }

      if (isOwner) {
        setIsCurrentUserAuthor(true);
        setCanDeletePost(true);
        return;
      }

      try {
        const { data: membership, error } = await (supabase as any)
          .from("company_members")
          .select("role")
          .eq("company_id", companyId)
          .eq("user_id", uid)
          .maybeSingle();

        if (error) throw error;

        const role = membership?.role as string | undefined;
        const canEdit = role === "admin" || role === "editor";
        const canDelete = role === "admin";

        setIsCurrentUserAuthor(Boolean(canEdit));
        setCanDeletePost(Boolean(canDelete));
      } catch {
        setIsCurrentUserAuthor(false);
        setCanDeletePost(false);
      }
    };
    
    checkAuthor();
  }, [postUserId, companyId, setIsCurrentUserAuthor, setCanDeletePost, userRolesQuery.data?.isModeratorOrAdmin]);
}
