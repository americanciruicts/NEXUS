'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPendingCount } from '@/lib/offlineDb';
import { syncPendingActions } from '@/lib/offlineSync';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch { /* IndexedDB not available */ }
  }, []);

  const handleSync = useCallback(async () => {
    if (syncing || !navigator.onLine) return;
    setSyncing(true);
    try {
      const result = await syncPendingActions();
      if (result.synced > 0) {
        // Show brief success message via a custom event
        window.dispatchEvent(new CustomEvent('nexus-toast', {
          detail: { message: `Synced ${result.synced} offline ${result.synced === 1 ? 'action' : 'actions'}`, type: 'success' }
        }));
      }
      await updatePendingCount();
    } catch { /* silent */ } finally {
      setSyncing(false);
    }
  }, [syncing, updatePendingCount]);

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine);
    updatePendingCount();

    const goOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      // Auto-sync when coming back online
      handleSync();
      setTimeout(() => setShowBanner(false), 3000);
    };

    const goOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Listen for SW sync messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'RUN_SYNC') {
        handleSync();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Poll pending count periodically
    const interval = setInterval(updatePendingCount, 10000);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, [handleSync, updatePendingCount]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) =>
        console.log('SW registration failed:', err)
      );
    }
  }, []);

  // Don't render anything if online with no pending actions and banner hidden
  if (isOnline && pendingCount === 0 && !showBanner) return null;

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center py-1.5 px-4 text-xs font-bold shadow-lg flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          You&apos;re offline &mdash; pages and data are served from cache. Changes will sync when reconnected.
          {pendingCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{pendingCount} pending</span>
          )}
        </div>
      )}

      {/* Back Online Banner */}
      {isOnline && showBanner && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-green-500 text-white text-center py-1.5 px-4 text-xs font-bold shadow-lg">
          Back online! {syncing ? 'Syncing...' : 'All synced.'}
        </div>
      )}

      {/* Persistent pending indicator (bottom-right corner) */}
      {isOnline && pendingCount > 0 && !showBanner && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="fixed bottom-4 right-4 z-[9998] bg-amber-500 hover:bg-amber-600 text-white rounded-full px-3 py-2 text-xs font-bold shadow-lg flex items-center gap-1.5 transition-colors"
        >
          {syncing ? (
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3"/><path d="M12 2a10 10 0 019.8 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          )}
          {pendingCount} pending &mdash; {syncing ? 'syncing...' : 'tap to sync'}
        </button>
      )}
    </>
  );
}
