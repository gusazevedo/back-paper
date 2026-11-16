import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { supabase } from '../../lib/supabase';

export type Folder = {
  id: string;
  name: string;
  item_count: number;
  cover_thumb_key: string | null;
  created_at: string;
};

export type FolderWallpaper = {
  id: string;
  title: string | null;
  thumb_key: string;
  width: number;
  height: number;
  added_at: string;
};

type FolderCursor = { added_at: string; id: string };

/** R-FOLD-2: folder names are 1–40 characters, unique per user whatever the case. */
export const FOLDER_NAME_MAX = 40;

export type FolderNameProblem = 'empty' | 'taken';

export function folderNameProblem(
  name: string,
  taken: string[],
): FolderNameProblem | null {
  const trimmed = name.trim();
  if (!trimmed) return 'empty';
  const lower = trimmed.toLowerCase();
  return taken.some(n => n.toLowerCase() === lower) ? 'taken' : null;
}

/** Postgres unique violation: a folder with that name, or the item, already exists. */
const UNIQUE_VIOLATION = '23505';

export class FolderNameTakenError extends Error {
  constructor() {
    super('folder name taken');
  }
}

const PAGE = 20;

/** The viewer's folders, oldest first, with item counts and covers (R-FOLD-4). */
export function useFolders(enabled = true) {
  return useQuery({
    queryKey: queryKeys.folderList,
    enabled,
    queryFn: async (): Promise<Folder[]> => {
      const { data, error } = await supabase.rpc('my_folders');
      if (error) throw error;
      return data as Folder[];
    },
  });
}

/** One folder's wallpapers, most recently added first, 20 per page. */
export function useFolderWallpapers(folderId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.folderItems(folderId),
    initialPageParam: null as FolderCursor | null,
    queryFn: async ({ pageParam }): Promise<FolderWallpaper[]> => {
      const { data, error } = await supabase.rpc('folder_wallpapers', {
        p_folder_id: folderId,
        p_cursor: pageParam,
        p_limit: PAGE,
      });
      if (error) throw error;
      return data as FolderWallpaper[];
    },
    getNextPageParam: (last): FolderCursor | undefined => {
      if (last.length < PAGE) return undefined;
      const tail = last[last.length - 1];
      return { added_at: tail.added_at, id: tail.id };
    },
  });
}

/** Ids of the viewer's folders that hold this wallpaper (RLS hides everyone else's). */
export function useWallpaperFolders(wallpaperId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.wallpaperFolders(wallpaperId),
    enabled,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('folder_items')
        .select('folder_id')
        .eq('wallpaper_id', wallpaperId);
      if (error) throw error;
      return (data as { folder_id: string }[]).map(r => r.folder_id);
    },
  });
}

/** Counts, covers and folder grids changed: refetch them when next shown. */
function invalidateFolders(
  queryClient: ReturnType<typeof useQueryClient>,
  wallpaperId: string,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.folders,
    predicate: q =>
      // The membership list is already right (optimistic); a refetch would only flicker.
      JSON.stringify(q.queryKey) !==
      JSON.stringify(queryKeys.wallpaperFolders(wallpaperId)),
  });
}

/**
 * Adds the wallpaper to a folder or takes it out (R-FOLD-7). The check moves at
 * once and rolls back if the server refuses; toggles run in order.
 */
export function useToggleFolder(wallpaperId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.wallpaperFolders(wallpaperId);
  return useMutation({
    scope: { id: `folders:${wallpaperId}` },
    mutationFn: async ({ folderId, add }: { folderId: string; add: boolean }) => {
      const items = supabase.from('folder_items');
      const { error } = add
        ? await items.insert({ folder_id: folderId, wallpaper_id: wallpaperId })
        : await items
            .delete()
            .eq('folder_id', folderId)
            .eq('wallpaper_id', wallpaperId);
      if (error && !(add && error.code === UNIQUE_VIOLATION)) throw error;
    },
    onMutate: async ({ folderId, add }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key);
      queryClient.setQueryData<string[]>(key, ids => {
        const rest = (ids ?? []).filter(id => id !== folderId);
        return add ? [...rest, folderId] : rest;
      });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(key, context?.previous);
    },
    onSettled: () => invalidateFolders(queryClient, wallpaperId),
  });
}

/**
 * Creates a folder and, from the Save sheet, saves the wallpaper in it
 * ("+ New folder", R-FOLD-7). A taken name rejects with FolderNameTakenError.
 */
export function useCreateFolder(userId: string, wallpaperId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<string> => {
      const { data, error } = await supabase
        .from('folders')
        .insert({ owner_id: userId, name: name.trim() })
        .select('id')
        .single();
      if (error) {
        throw error.code === UNIQUE_VIOLATION
          ? new FolderNameTakenError()
          : error;
      }
      const folderId = (data as { id: string }).id;
      if (wallpaperId) {
        const { error: saveError } = await supabase
          .from('folder_items')
          .insert({ folder_id: folderId, wallpaper_id: wallpaperId });
        if (saveError) throw saveError;
        queryClient.setQueryData<string[]>(
          queryKeys.wallpaperFolders(wallpaperId),
          ids => [...(ids ?? []), folderId],
        );
      }
      return folderId;
    },
    onSettled: () => invalidateFolders(queryClient, wallpaperId ?? ''),
  });
}
