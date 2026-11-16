import { useInfiniteQuery } from '@tanstack/react-query';
import { KeysetCursor, nextCursor } from '../../lib/keyset';
import { queryKeys } from '../../lib/queryClient';
import { supabase } from '../../lib/supabase';

export type FeedItem = {
  id: string;
  author_id: string;
  title: string | null;
  thumb_key: string;
  width: number;
  height: number;
  created_at: string;
};

export const FEED_PAGE = 20;

/** Public feed, newest first, 20 per page via the `feed` keyset RPC (R-FEED-2, R-FEED-4). */
export function useFeed() {
  return useInfiniteQuery({
    queryKey: queryKeys.feed,
    initialPageParam: null as KeysetCursor | null,
    queryFn: async ({ pageParam }): Promise<FeedItem[]> => {
      const { data, error } = await supabase.rpc('feed', {
        p_categories: null,
        p_cursor: pageParam,
        p_limit: FEED_PAGE,
      });
      if (error) throw error;
      return data as FeedItem[];
    },
    getNextPageParam: last => nextCursor(last, FEED_PAGE),
  });
}
