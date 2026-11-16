import { useSyncExternalStore } from 'react';

export type FeedSort = 'recent' | 'liked';

/** Selected category slugs; empty means all categories (R-CAT-2). */
export type FeedFilter = { sort: FeedSort; categories: string[] };

const INITIAL: FeedFilter = { sort: 'recent', categories: [] };

let current = INITIAL;
const listeners = new Set<() => void>();

function set(next: FeedFilter) {
  current = next;
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The feed's sort and category filter. Kept outside the Feed screen so the
 * detail screen can replace it (R-DET-1) before navigating back.
 */
export function useFeedFilter(): FeedFilter {
  return useSyncExternalStore(subscribe, () => current);
}

export function setFeedSort(sort: FeedSort) {
  if (sort !== current.sort) set({ ...current, sort });
}

export function toggleFeedCategory(slug: string) {
  const has = current.categories.includes(slug);
  set({
    ...current,
    categories: has
      ? current.categories.filter(c => c !== slug)
      : [...current.categories, slug],
  });
}

export function clearFeedCategories() {
  if (current.categories.length) set({ ...current, categories: [] });
}

/** R-DET-1: a category chip in the detail replaces the selection with only that category. */
export function showOnlyCategory(slug: string) {
  set({ ...current, categories: [slug] });
}

/** Tests start from the default filter. */
export function resetFeedFilter() {
  set(INITIAL);
}
