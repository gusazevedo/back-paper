import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export const queryKeys = {
  categories: ['categories'] as const,
  feed: ['feed'] as const,
  profile: (userId: string) => ['profile', userId] as const,
  userWallpapers: (userId: string) => ['user-wallpapers', userId] as const,
  userWallpaperCount: (userId: string) =>
    ['user-wallpaper-count', userId] as const,
  publishQuota: (userId: string) => ['publish-quota', userId] as const,
};
