import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export const queryKeys = {
  categories: ['categories'] as const,
  /** Prefix of every feed query (lists and counts): invalidate it after publishing. */
  feed: ['feed'] as const,
  feedList: (sort: string, categories: string[]) =>
    ['feed', 'list', sort, categories] as const,
  feedCount: (categories: string[]) => ['feed', 'count', categories] as const,
  wallpaper: (id: string) => ['wallpaper', id] as const,
  profile: (userId: string) => ['profile', userId] as const,
  userWallpapers: (userId: string) => ['user-wallpapers', userId] as const,
  userWallpaperCount: (userId: string) =>
    ['user-wallpaper-count', userId] as const,
  publishQuota: (userId: string) => ['publish-quota', userId] as const,
};
