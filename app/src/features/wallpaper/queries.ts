import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  liked_by_me: boolean;
};

/** RLS only returns the viewer's own like, so the embed holds 0 or 1 rows. */
type Row = Omit<WallpaperDetail, 'liked_by_me'> & { my_like: unknown[] };

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
            // Named FK: likes also links wallpapers to profiles (many-to-many).
            'author:profiles!wallpapers_author_id_fkey(display_name,avatar_url),wallpaper_categories(category_slug),' +
            'my_like:likes(user_id)',
        )
        .eq('id', id)
        .single();
      if (error) throw error;
      const { my_like, ...rest } = data as unknown as Row;
      return { ...rest, liked_by_me: my_like.length > 0 };
    },
  });
}

/** Postgres unique violation: the like already exists, which is what we wanted. */
const ALREADY_LIKED = '23505';

/**
 * Like or unlike someone else's wallpaper (R-LIKE-1). The detail updates at once
 * and rolls back if the server refuses; toggles on one wallpaper run in order.
 */
export function useToggleLike(id: string, userId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.wallpaper(id);
  return useMutation({
    scope: { id: `like:${id}` },
    mutationFn: async (like: boolean) => {
      const likes = supabase.from('likes');
      const { error } = like
        ? await likes.insert({ user_id: userId, wallpaper_id: id })
        : await likes.delete().eq('user_id', userId).eq('wallpaper_id', id);
      if (error && !(like && error.code === ALREADY_LIKED)) throw error;
    },
    onMutate: async (like: boolean) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<WallpaperDetail>(key);
      queryClient.setQueryData<WallpaperDetail>(key, w =>
        w && w.liked_by_me !== like
          ? {
              ...w,
              liked_by_me: like,
              like_count: Math.max(w.like_count + (like ? 1 : -1), 0),
            }
          : w,
      );
      return { previous };
    },
    onError: (_error, _like, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      // Most liked order and liked_by_me changed: refetch the feed next time it is shown.
      queryClient.invalidateQueries({
        queryKey: queryKeys.feed,
        refetchType: 'none',
      });
    },
  });
}
