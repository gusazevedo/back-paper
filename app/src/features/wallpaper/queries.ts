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

/** The server refuses edits once the first 24 hours have passed (R-EDIT-2). */
export class EditWindowClosedError extends Error {
  constructor() {
    super('edit window closed');
  }
}

export type WallpaperEdit = { title: string; categories: string[] };

/**
 * R-EDIT-1: the author changes title and categories during the first 24 hours.
 * The detail updates on success; grids that show the wallpaper refetch.
 */
export function useUpdateWallpaper(id: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.wallpaper(id);
  return useMutation({
    mutationFn: async ({ title, categories }: WallpaperEdit) => {
      const { error } = await supabase.rpc('update_wallpaper', {
        p_id: id,
        p_title: title,
        p_categories: categories,
      });
      if (error) {
        throw error.code === 'BP410' ? new EditWindowClosedError() : error;
      }
    },
    onSuccess: (_data, { title, categories }) => {
      queryClient.setQueryData<WallpaperDetail>(key, w =>
        w
          ? {
              ...w,
              title: title.trim() || null,
              wallpaper_categories: categories.map(category_slug => ({
                category_slug,
              })),
            }
          : w,
      );
      // Titles label the tiles and categories filter the feed.
      for (const prefix of [
        queryKeys.feed,
        ['user-wallpapers'],
        queryKeys.folders,
      ]) {
        queryClient.invalidateQueries({ queryKey: prefix });
      }
    },
    onError: error => {
      // Refetch so the Edit button disappears once the window has closed.
      if (error instanceof EditWindowClosedError) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

/**
 * R-DEL-1: the author deletes for good. RLS lets only the author through; the
 * database cascades to categories, likes and everyone's folders, and queues the
 * objects for removal from storage.
 */
export function useDeleteWallpaper(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('wallpapers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.wallpaper(id) });
      for (const prefix of [
        queryKeys.feed,
        ['user-wallpapers'],
        ['user-wallpaper-count'],
        queryKeys.folders,
      ]) {
        queryClient.invalidateQueries({ queryKey: prefix });
      }
    },
  });
}
