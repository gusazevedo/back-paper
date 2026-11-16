import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { nextCursor } from '../../lib/keyset';
import { queryKeys } from '../../lib/queryClient';
import { supabase } from '../../lib/supabase';
import { FeedFilter, FeedSort } from './filter';

export type FeedItem = {
  id: string;
  author_id: string;
  title: string | null;
  thumb_key: string;
  width: number;
  height: number;
  like_count: number;
  created_at: string;
};

/** Keyset cursor; `like_count` is only read by the "liked" sort. */
export type FeedCursor = {
  created_at: string;
  id: string;
  like_count?: number;
};

export const FEED_PAGE = 20;

/** Categories in a stable order, so the same selection shares one cache entry. */
const normalize = (categories: string[]) => [...categories].sort();

export function feedQueryKey({ sort, categories }: FeedFilter) {
  return queryKeys.feedList(sort, normalize(categories));
}

export function feedCursor(
  last: FeedItem[],
  sort: FeedSort,
): FeedCursor | undefined {
  const cursor = nextCursor(last, FEED_PAGE);
  if (!cursor || sort === 'recent') return cursor;
  return { ...cursor, like_count: last[last.length - 1].like_count };
}

/**
 * Public feed, 20 per page via the `feed` keyset RPC: Recent or Most liked,
 * optionally filtered by any of the selected categories (R-FEED-2..4, R-CAT-2).
 */
export function useFeed(filter: FeedFilter) {
  const categories = normalize(filter.categories);
  return useInfiniteQuery({
    queryKey: feedQueryKey(filter),
    initialPageParam: null as FeedCursor | null,
    queryFn: async ({ pageParam }): Promise<FeedItem[]> => {
      const { data, error } = await supabase.rpc('feed', {
        p_categories: categories.length ? categories : null,
        p_sort: filter.sort,
        p_cursor: pageParam,
        p_limit: FEED_PAGE,
      });
      if (error) throw error;
      return data as FeedItem[];
    },
    getNextPageParam: last => feedCursor(last, filter.sort),
  });
}

/** How many wallpapers the category selection matches ("Show N wallpapers"). */
export function useFeedCount(categories: string[], enabled: boolean) {
  const sorted = normalize(categories);
  return useQuery({
    queryKey: queryKeys.feedCount(sorted),
    enabled,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc('feed_count', {
        p_categories: sorted.length ? sorted : null,
      });
      if (error) throw error;
      return data as number;
    },
  });
}
