'use client';

/**
 * Helpers for "instant-load + live refresh" on multi-user data pages.
 *
 * - readLiveCache / writeLiveCache persist the last successful payload to
 *   localStorage so a page can paint its last-known data instantly on load,
 *   then revalidate in the background (no blank/skeleton wait).
 * - notifyDataUpdated is intentionally silent: background polls update the page
 *   in place with no toast/notification (per product decision).
 */

export function readLiveCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeLiveCache(key: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota / serialization — ignore */
  }
}

// No-op: the page still refreshes silently in place every 30s; we just don't
// surface any toast/notification when remote data changes.
export function notifyDataUpdated(_message?: string): void {
  /* intentionally silent */
}

/** Background auto-refresh interval for live data pages. */
export const LIVE_REFRESH_MS = 30000;
