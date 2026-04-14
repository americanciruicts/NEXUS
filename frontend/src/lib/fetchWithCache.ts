/**
 * Shared fetch utility with in-memory caching and request deduplication.
 * Prevents the same endpoint from being called multiple times simultaneously
 * and caches GET responses for a configurable TTL.
 */

const cache = new Map<string, { data: unknown; timestamp: number }>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL = 30_000; // 30 seconds

export function clearCache() {
  cache.clear();
}

export function invalidateCache(pattern: string) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

/**
 * Fetch with in-memory caching and request deduplication.
 * - If data is in cache and fresh, returns immediately (no network call).
 * - If the same URL is already being fetched, piggybacks on that request.
 * - Otherwise, fetches and caches the result.
 */
export async function fetchWithCache<T = unknown>(
  url: string,
  options?: RequestInit & { ttl?: number; skipCache?: boolean }
): Promise<T> {
  const { ttl = DEFAULT_TTL, skipCache = false, ...fetchOpts } = options || {};
  const method = (fetchOpts.method || 'GET').toUpperCase();
  const cacheKey = `${method}:${url}`;

  // Only cache GET requests
  if (method === 'GET' && !skipCache) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }

    // Deduplicate: if same request is inflight, wait for it
    const existing = inflight.get(cacheKey);
    if (existing) {
      return existing as Promise<T>;
    }
  }

  const promise = (async () => {
    const res = await fetch(url, fetchOpts);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();

    if (method === 'GET' && !skipCache) {
      cache.set(cacheKey, { data, timestamp: Date.now() });
    }

    return data as T;
  })();

  if (method === 'GET' && !skipCache) {
    inflight.set(cacheKey, promise);
    promise.finally(() => inflight.delete(cacheKey));
  }

  return promise;
}

/**
 * Get auth headers from localStorage.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nexus_token') : null;
  return {
    'Authorization': `Bearer ${token || ''}`,
    'Content-Type': 'application/json',
  };
}
