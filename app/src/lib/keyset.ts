/** Cursor for the keyset-paginated RPCs, ordered by (created_at, id) desc. */
export type KeysetCursor = { created_at: string; id: string };

/** Cursor for the page after `last`, or undefined when `last` was the final page. */
export function nextCursor<T extends KeysetCursor>(
  last: T[],
  pageSize: number,
): KeysetCursor | undefined {
  if (last.length < pageSize) return undefined;
  const tail = last[last.length - 1];
  return { created_at: tail.created_at, id: tail.id };
}
