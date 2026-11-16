import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { KeysetCursor, nextCursor } from '../../lib/keyset';
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
    initialPageParam: null as KeysetCursor | null,
    queryFn: async ({ pageParam }): Promise<GridWallpaper[]> => {
      const { data, error } = await supabase.rpc('user_wallpapers', {
        p_user_id: userId,
        p_cursor: pageParam,
        p_limit: PAGE,
      });
      if (error) throw error;
      return data as GridWallpaper[];
    },
    getNextPageParam: last => nextCursor(last, PAGE),
  });
}

/** R-AUTH-3: display names are 1–40 characters (the photo comes from Google). */
export const DISPLAY_NAME_MAX = 40;

/**
 * Renames the signed-in user. The new name shows at once on my profile, and
 * every screen that shows authors (detail, public profiles) refetches.
 */
export function useUpdateDisplayName(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: name.trim() })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: (_data, name) => {
      queryClient.setQueryData<Profile>(queryKeys.profile(userId), p =>
        p ? { ...p, display_name: name.trim() } : p,
      );
      // The detail embeds the author's name.
      queryClient.invalidateQueries({ queryKey: ['wallpaper'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
