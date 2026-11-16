import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

/**
 * Pull-to-refresh that reloads from the top: drops every page but the first,
 * then refetches it, so the list does not refetch all pages it had scrolled through.
 */
export function useRefreshFromStart(queryKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    queryClient.setQueryData<InfiniteData<unknown, unknown>>(queryKey, data =>
      data
        ? {
            pages: data.pages.slice(0, 1),
            pageParams: data.pageParams.slice(0, 1),
          }
        : data,
    );
    try {
      await queryClient.refetchQueries({ queryKey, exact: true });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, queryKey]);
  return { refreshing, refresh };
}
