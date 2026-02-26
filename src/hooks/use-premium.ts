import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePremium() {
  void supabase;
  const { isLoading } = useQuery({
    queryKey: ["user-premium"],
    queryFn: async () => false,
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });

  return {
    isPremium: false,
    isLoading: Boolean(isLoading),
    error: null,
  };
}
