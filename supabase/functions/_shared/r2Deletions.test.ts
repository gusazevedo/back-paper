import { assertEquals } from 'jsr:@std/assert@1';
import { BATCH, processQueue, QueueRow, sameSecret } from './r2Deletions.ts';

function fakeQueue(keys: string[], failing: Set<string> = new Set()) {
  let rows: (QueueRow & { attempts: number })[] = keys.map((k, i) => ({ id: i + 1, object_key: k, attempts: 0 }));
  const deletedKeys: string[] = [];
  return {
    rows: () => rows,
    deletedKeys,
    deps: {
      fetchBatch: (limit: number) => Promise.resolve(rows.filter((r) => r.attempts < 10).slice(0, limit)),
      deleteKey: (key: string) => {
        if (failing.has(key)) return Promise.reject(new Error('boom'));
        deletedKeys.push(key);
        return Promise.resolve();
      },
      removeRows: (ids: number[]) => {
        rows = rows.filter((r) => !ids.includes(r.id));
        return Promise.resolve();
      },
      markFailed: (ids: number[]) => {
        rows = rows.map((r) => (ids.includes(r.id) ? { ...r, attempts: r.attempts + 1 } : r));
        return Promise.resolve();
      },
    },
  };
}

Deno.test('deletes every queued key and empties the queue', async () => {
  const q = fakeQueue(['w/a/original.jpg', 'w/a/thumb.webp']);
  assertEquals(await processQueue(q.deps), { deleted: 2, failed: 0 });
  assertEquals(q.deletedKeys, ['w/a/original.jpg', 'w/a/thumb.webp']);
  assertEquals(q.rows(), []);
});

Deno.test('a failing key stays queued with one more attempt, the others go', async () => {
  const q = fakeQueue(['ok1', 'bad', 'ok2'], new Set(['bad']));
  assertEquals(await processQueue(q.deps), { deleted: 2, failed: 1 });
  assertEquals(q.rows(), [{ id: 2, object_key: 'bad', attempts: 1 }]);
});

Deno.test('works through several batches', async () => {
  const keys = Array.from({ length: BATCH * 2 + 5 }, (_, i) => `k${i}`);
  const q = fakeQueue(keys);
  assertEquals(await processQueue(q.deps), { deleted: keys.length, failed: 0 });
  assertEquals(q.rows(), []);
});

Deno.test('stops when a whole batch fails instead of retrying in a loop', async () => {
  const q = fakeQueue(['a', 'b'], new Set(['a', 'b']));
  assertEquals(await processQueue(q.deps), { deleted: 0, failed: 2 });
  assertEquals(q.rows().map((r) => r.attempts), [1, 1]);
});

Deno.test('sameSecret', () => {
  assertEquals(sameSecret('s3cret', 's3cret'), true);
  assertEquals(sameSecret('s3creT', 's3cret'), false);
  assertEquals(sameSecret('short', 's3cret'), false);
  assertEquals(sameSecret(null, 's3cret'), false);
  assertEquals(sameSecret('x', undefined), false);
});
