'use client';

import { useEffect, useRef, useState } from 'react';
import { getApiUrl } from '@/config/api';

/**
 * Backend reachability indicator.
 *
 * The browser can be online (navigator.onLine === true) while the backend /
 * API tunnel is unreachable — in that case the app would otherwise silently
 * fail with blank screens. This pings the backend /health endpoint and, after
 * a couple of consecutive failures, shows a "Reconnecting to server…" banner so
 * users get a clear, honest status instead of a broken-looking app. The banner
 * clears automatically as soon as the backend responds again.
 */
const PING_INTERVAL_MS = 20000; // every 20s
const PING_TIMEOUT_MS = 5000;
const FAILURES_BEFORE_BANNER = 2;

export default function BackendStatus() {
  const [down, setDown] = useState(false);
  const failuresRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const ping = async () => {
      // If the browser itself is offline, let OfflineIndicator handle it.
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
      try {
        const res = await fetch(`${getApiUrl()}/health`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(t);
        if (cancelled) return;
        if (res.ok) {
          failuresRef.current = 0;
          setDown(false);
        } else {
          throw new Error(`status ${res.status}`);
        }
      } catch {
        clearTimeout(t);
        if (cancelled) return;
        failuresRef.current += 1;
        if (failuresRef.current >= FAILURES_BEFORE_BANNER) setDown(true);
      }
    };

    // Initial check shortly after mount (let the app settle first).
    const initial = setTimeout(ping, 1500);
    timer = setInterval(ping, PING_INTERVAL_MS);

    // Re-check promptly when the tab regains focus or the network returns.
    const onFocus = () => ping();
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      if (timer) clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
    };
  }, []);

  if (!down) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-orange-600 text-white text-center py-1.5 px-4 text-xs font-bold shadow-lg flex items-center justify-center gap-2">
      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
        <path d="M12 2a10 10 0 019.8 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      Reconnecting to server&hellip; some data may be temporarily unavailable.
    </div>
  );
}
