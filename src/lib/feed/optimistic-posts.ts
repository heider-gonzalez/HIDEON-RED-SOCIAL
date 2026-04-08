import type { QueryClient } from '@tanstack/react-query';
import type { Post } from '@/types/post';

type InfinitePostsPage = {
  posts?: Post[];
  nextCursor?: string | null;
};

type InfinitePostsData = {
  pages: InfinitePostsPage[];
  pageParams: any[];
};

function isInfinitePostsQueryKey(key: unknown): key is any[] {
  return Array.isArray(key) && key[0] === 'posts' && key[key.length - 1] === 'infinite';
}

export function addOptimisticPostToAllInfiniteFeeds(queryClient: QueryClient, optimisticPost: Post) {
  const queryCache = queryClient.getQueryCache();
  const targets = queryCache.findAll({ queryKey: ['posts'], exact: false });

  const touchedKeys: any[][] = [];

  targets.forEach((q) => {
    const key = q.queryKey as unknown;
    if (!isInfinitePostsQueryKey(key)) return;

    queryClient.setQueryData(key, (old: InfinitePostsData | undefined) => {
      if (!old || !Array.isArray(old.pages) || old.pages.length === 0) return old;

      const pages = [...old.pages];
      const first = pages[0];
      const existing = Array.isArray(first?.posts) ? first.posts : [];

      const filtered = existing.filter((p) => String((p as any)?.id || '') !== String(optimisticPost.id));
      pages[0] = {
        ...first,
        posts: [optimisticPost, ...filtered],
      };

      return {
        ...old,
        pages,
      };
    });

    touchedKeys.push(key);
  });

  return {
    touchedKeys,
    rollback: () => {
      touchedKeys.forEach((key) => {
        queryClient.setQueryData(key, (old: InfinitePostsData | undefined) => {
          if (!old || !Array.isArray(old.pages) || old.pages.length === 0) return old;
          const pages = [...old.pages];
          const first = pages[0];
          const existing = Array.isArray(first?.posts) ? first.posts : [];
          pages[0] = {
            ...first,
            posts: existing.filter((p) => String((p as any)?.id || '') !== String(optimisticPost.id)),
          };
          return { ...old, pages };
        });
      });
    },
  };
}

export function replaceOptimisticPostInAllInfiniteFeeds(
  queryClient: QueryClient,
  optimisticId: string,
  realPost: Post
) {
  const queryCache = queryClient.getQueryCache();
  const targets = queryCache.findAll({ queryKey: ['posts'], exact: false });

  targets.forEach((q) => {
    const key = q.queryKey as unknown;
    if (!isInfinitePostsQueryKey(key)) return;

    queryClient.setQueryData(key, (old: InfinitePostsData | undefined) => {
      if (!old || !Array.isArray(old.pages)) return old;
      const pages = old.pages.map((page) => {
        const existing = Array.isArray(page?.posts) ? page.posts : [];
        const replaced = existing.map((p) => (String((p as any)?.id || '') === optimisticId ? realPost : p));
        const withoutDup = replaced.filter((p, idx, arr) => arr.findIndex((x) => String((x as any)?.id || '') === String((p as any)?.id || '')) === idx);
        return {
          ...page,
          posts: withoutDup,
        };
      });
      return { ...old, pages };
    });
  });
}
