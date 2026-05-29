'use client';

import { toast } from 'sonner';

/**
 * Helpers for "instant-load + live refresh" on multi-user data pages.
 *
 * - readLiveCache / writeLiveCache persist the last successful payload to
 *   localStorage so a page can paint its last-known data instantly on load,
 *   then revalidate in the background (no blank/skeleton wait).
 * - notifyDataUpdated shows a brief, non-alarming toast when a background poll
 *   detects that another user changed the data, so the in-place update isn't
 *   silent. Throttled so concurrent page updates don't stack toasts.
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

let lastNotify = 0;
export function notifyDataUpdated(message = 'Updated with latest changes'): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (now - lastNotify < 4000) return; // throttle stacked toasts
  lastNotify = now;
  try {
    toast.info(message, { duration: 3000 });
  } catch {
    /* sonner not mounted — ignore */
  }
}

/** Background auto-refresh interval for live data pages. */
export const LIVE_REFRESH_MS = 30000;
