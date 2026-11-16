import { adminClient, fail, json } from '../_shared/http.ts';
import { MAX_ATTEMPTS, processQueue, sameSecret } from '../_shared/r2Deletions.ts';
import { deleteObjects } from '../_shared/storage.ts';

/**
 * §6.3: deletes the objects queued in r2_deletion_queue (by the AFTER DELETE
 * trigger on wallpapers). Called by pg_cron through `run_r2_deletions()` with
 * the shared R2_DELETIONS_SECRET; not reachable with a user token.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail(405, 'method_not_allowed');
  if (!sameSecret(req.headers.get('x-r2-deletions-secret'), Deno.env.get('R2_DELETIONS_SECRET'))) {
    return fail(401, 'unauthorized');
  }

  const admin = adminClient();
  try {
    const result = await processQueue({
      fetchBatch: async (limit) => {
        const { data, error } = await admin
          .from('r2_deletion_queue')
          .select('id,object_key')
          .lt('attempts', MAX_ATTEMPTS)
          .order('id')
          .limit(limit);
        if (error) throw error;
        return data;
      },
      // A missing object counts as deleted (deleteObjects ignores 404).
      deleteKey: (key) => deleteObjects([key]),
      removeRows: async (ids) => {
        const { error } = await admin.from('r2_deletion_queue').delete().in('id', ids);
        if (error) throw error;
      },
      markFailed: async (ids) => {
        const { error } = await admin.rpc('r2_deletions_failed', { p_ids: ids });
        if (error) throw error;
      },
    });
    return json(result);
  } catch (e) {
    console.error('process-r2-deletions failed', e);
    return fail(500, 'queue_failed');
  }
});
