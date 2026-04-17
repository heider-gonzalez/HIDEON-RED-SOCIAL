import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types/database';

interface UseProfileOptions {
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Hook optimizado para consultar perfiles con caché de 5 minutos
 * Consolida todas las queries fragmentadas de profiles en un solo lugar
 */
export function useProfile(userId: string | null, options: UseProfileOptions = {}) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options; // 5 minutos por defecto

  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;

      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    },
    enabled: enabled && !!userId,
    staleTime,
    retry: (failureCount, error: any) => {
      // No reintentar en errores de "not found"
      if (error?.code === 'PGRST116') return false;
      return failureCount < 3;
    },
  });
}

/**
 * Hook para consultar múltiples perfiles en batch
 */
export function useProfiles(userIds: string[], options: UseProfileOptions = {}) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

  return useQuery({
    queryKey: ['profiles', userIds],
    queryFn: async (): Promise<Profile[]> => {
      if (userIds.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (error) throw error;

      return data || [];
    },
    enabled: enabled && userIds.length > 0,
    staleTime,
  });
}

/**
 * Hook para buscar perfiles por username
 */
export function useProfileSearch(username: string, options: UseProfileOptions = {}) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

  return useQuery({
    queryKey: ['profile-search', username],
    queryFn: async (): Promise<Profile | null> => {
      if (!username) return null;

      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    },
    enabled: enabled && !!username,
    staleTime,
  });
}

/**
 * Hook para búsqueda de usuarios por username (like)
 */
export function useUserSearch(query: string, options: UseProfileOptions = {}) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

  return useQuery({
    queryKey: ['user-search', query],
    queryFn: async (): Promise<Profile[]> => {
      if (!query.trim()) return [];

      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .limit(5);

      if (error) throw error;

      return data || [];
    },
    enabled: enabled && query.trim().length > 0,
    staleTime,
  });
}
