import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { supabase } from '../../lib/supabase';

export type WallpaperDetail = {
  id: string;
  author_id: string;
  title: string | null;
  original_key: string;
  thumb_key: string;
  like_count: number;
  created_at: string;
  author: { display_name: string; avatar_url: string | null } | null;
  wallpaper_categories: { category_slug: string }[];
};

/** Edit is offered only during the first 24 hours after publishing (R-EDIT). */
export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** One wallpaper with its author and categories, for the detail screen. */
export function useWallpaper(id: string) {
  return useQuery({
    queryKey: queryKeys.wallpaper(id),
    queryFn: async (): Promise<WallpaperDetail> => {
      const { data, error } = await supabase
        .from('wallpapers')
        .select(
          'id,author_id,title,original_key,thumb_key,like_count,created_at,' +
            'author:profiles(display_name,avatar_url),wallpaper_categories(category_slug)',
        )
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as WallpaperDetail;
    },
  });
}
