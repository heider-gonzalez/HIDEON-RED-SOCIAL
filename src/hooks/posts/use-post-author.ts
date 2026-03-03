
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if the current user is the author of a post
 */
export function usePostAuthor(
  postUserId: string,
  companyId: string | null | undefined,
  setIsCurrentUserAuthor: (value: boolean) => void,
  setCanDeletePost: (value: boolean) => void
) {
  useEffect(() => {
    const checkAuthor = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) {
        setIsCurrentUserAuthor(false);
        setCanDeletePost(false);
        return;
      }

      try {
        const [{ data: isMod }, { data: isAdmin }] = await Promise.all([
          (supabase.rpc as any)("has_role", { _role: "moderator", _user_id: uid }),
          (supabase.rpc as any)("has_role", { _role: "admin", _user_id: uid }),
        ]);

        if (Boolean(isMod) || Boolean(isAdmin)) {
          setIsCurrentUserAuthor(false);
          setCanDeletePost(true);
          return;
        }
      } catch {
        // ignore role errors and fallback to owner/company logic
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
  }, [postUserId, companyId, setIsCurrentUserAuthor, setCanDeletePost]);
}
