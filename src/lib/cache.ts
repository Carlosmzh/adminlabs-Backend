interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

const TTL_FRESH = 60 * 60 * 1000;
const TTL_STALE = 2 * 60 * 60 * 1000;

export function getCached<T>(key: string): { data: T; isFresh: boolean } | null {
  const entry = store.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.fetchedAt;
  const isFresh = age < TTL_FRESH;
  const isStale = age < TTL_STALE;

  if (isStale) {
    return { data: entry.data as T, isFresh };
  }

  store.delete(key);
  return null;
}

export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, fetchedAt: Date.now() });
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(pattern)) {
      store.delete(key);
    }
  }
}
