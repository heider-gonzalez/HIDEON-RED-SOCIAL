import { useUserRoles } from '@/hooks/use-user-roles';

export function useSuperuser() {
  const roles = useUserRoles();

  return {
    isSuperuser: Boolean(roles.data?.isModeratorOrAdmin),
    loading: roles.isLoading,
  };
}
