import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { fetchProjectPosts } from '@/pages/projects/projects-data';

export function useInfiniteProjects(params: { selectedStatus: string; institutionName?: string; limit?: number }) {
  const selectedStatus = params.selectedStatus;
  const institutionName = params.institutionName ?? '';
  const limit = params.limit ?? 12;

  const queryClient = useQueryClient();
  const prefetched = useRef<Set<number>>(new Set());

  const query = useInfiniteQuery({
    queryKey: ['projects-infinite', { selectedStatus, institutionName, limit }],
    queryFn: async ({ pageParam = 0 }) => {
      const offset = pageParam as number;
      const data = await fetchProjectPosts({ selectedStatus, institutionName, offset, limit });
      return { data, nextOffset: data && data.length === limit ? offset + limit : null };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 10_000,
    cacheTime: 60_000,
  });

  // Prefetch the next page automatically when a page loads
  useEffect(() => {
    const pages = query.data?.pages;
    const lastPage = pages ? pages[pages.length - 1] : null;
    const nextOffset = lastPage?.nextOffset ?? null;
    if (nextOffset != null && !prefetched.current.has(nextOffset)) {
      prefetched.current.add(nextOffset);
      // Cache next page under an explicit key so fetchNextPage can reuse it
      queryClient.prefetchQuery(['projects-page', { selectedStatus, institutionName, limit, offset: nextOffset }], () =>
        fetchProjectPosts({ selectedStatus, institutionName, offset: nextOffset, limit })
      );
    }
  }, [query.data, selectedStatus, institutionName, limit, queryClient]);

  return query;
}
