import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthProvider';
import { queryKeys } from '../../lib/queryClient';
import { supabase } from '../../lib/supabase';

export type PublishQuota = {
  limit: number;
  remaining: number;
  /** When a slot frees up; only set once the limit is reached. */
  nextAt: Date | null;
};

/** The "N posts left today" notice shows from this many down. */
export const QUOTA_WARN_AT = 3;

/** The caller's publishes left in the rolling 24h window (R-PUB-9). */
export function usePublishQuota() {
  const auth = useAuth();
  const userId = auth.status === 'signed-in' ? auth.session.user.id : '';
  return useQuery({
    queryKey: queryKeys.publishQuota(userId),
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async (): Promise<PublishQuota> => {
      const { data, error } = await supabase.rpc('my_publish_quota');
      if (error) throw error;
      const row = (
        data as {
          lim: number;
          remaining: number;
          next_at: string | null;
        }[]
      )[0];
      return {
        limit: row.lim,
        remaining: row.remaining,
        nextAt: row.next_at ? new Date(row.next_at) : null,
      };
    },
  });
}

/** Whole hours until `at`, at least 1. */
export const hoursUntil = (at: Date, now = Date.now()) =>
  Math.max(1, Math.ceil((at.getTime() - now) / 3_600_000));
