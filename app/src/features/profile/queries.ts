import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { supabase } from '../../lib/supabase';

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export type GridWallpaper = {
  id: string;
  title: string | null;
  thumb_key: string;
  width: number;
  height: number;
  created_at: string;
};

const PAGE = 20;

export function useProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,display_name,avatar_url')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useWallpaperCount(userId: string) {
  return useQuery({
    queryKey: queryKeys.userWallpaperCount(userId),
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('wallpapers')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/** Profile grid, newest first, 20 per page via the `user_wallpapers` keyset RPC. */
export function useUserWallpapers(userId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.userWallpapers(userId),
    initialPageParam: null as { created_at: string; id: string } | null,
    queryFn: async ({ pageParam }): Promise<GridWallpaper[]> => {
      const { data, error } = await supabase.rpc('user_wallpapers', {
        p_user_id: userId,
        p_cursor: pageParam,
        p_limit: PAGE,
      });
      if (error) throw error;
      return data as GridWallpaper[];
    },
    getNextPageParam: last =>
      last.length < PAGE
        ? undefined
        : {
            created_at: last[last.length - 1].created_at,
            id: last[last.length - 1].id,
          },
  });
}
