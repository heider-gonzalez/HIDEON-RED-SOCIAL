import { useQuery } from "@tanstack/react-query";

export function usePremium() {
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
