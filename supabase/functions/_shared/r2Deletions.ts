/** A key whose deletion failed this many times stays in the queue for a human to look at. */
export const MAX_ATTEMPTS = 10;
export const BATCH = 100;

export type QueueRow = { id: number; object_key: string };

export type QueueDeps = {
  /** Up to `limit` rows below MAX_ATTEMPTS, oldest first. */
  fetchBatch: (limit: number) => Promise<QueueRow[]>;
  deleteKey: (key: string) => Promise<void>;
  /** Rows whose object is gone (deleted now, or already missing). */
  removeRows: (ids: number[]) => Promise<void>;
  /** Rows to retry on a later run; their attempts go up by one. */
  markFailed: (ids: number[]) => Promise<void>;
};

/**
 * §6.3: drains r2_deletion_queue in batches. Each key is deleted on its own, so
 * one failure never blocks the rest; a batch where everything failed stops the
 * run (storage is probably down) instead of burning attempts in a loop.
 */
export async function processQueue(deps: QueueDeps, maxBatches = 5) {
  let deleted = 0;
  let failed = 0;
  for (let i = 0; i < maxBatches; i++) {
    const rows = await deps.fetchBatch(BATCH);
    if (rows.length === 0) break;
    const results = await Promise.allSettled(rows.map((r) => deps.deleteKey(r.object_key)));
    const ok = rows.filter((_, j) => results[j].status === 'fulfilled').map((r) => r.id);
    const bad = rows.filter((_, j) => results[j].status === 'rejected').map((r) => r.id);
    if (ok.length) await deps.removeRows(ok);
    if (bad.length) await deps.markFailed(bad);
    deleted += ok.length;
    failed += bad.length;
    if (ok.length === 0 || rows.length < BATCH) break;
  }
  return { deleted, failed };
}

/** Compares the shared secret without leaking where it differs. */
export function sameSecret(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
