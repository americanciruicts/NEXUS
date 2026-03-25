// Offline Sync Manager - replays queued actions when back online

import { getPendingActions, removePendingAction, incrementRetry } from './offlineDb';

const MAX_RETRIES = 5;

export async function syncPendingActions(): Promise<{ synced: number; failed: number }> {
  const actions = await getPendingActions();
  let synced = 0;
  let failed = 0;

  for (const action of actions) {
    if (action.retries >= MAX_RETRIES) {
      // Too many retries, remove it
      await removePendingAction(action.id!);
      failed++;
      continue;
    }

    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.method !== 'GET' ? action.body : undefined,
      });

      if (response.ok || response.status === 409) {
        // Success or conflict (duplicate) — remove from queue
        await removePendingAction(action.id!);
        synced++;
      } else if (response.status >= 500) {
        // Server error — retry later
        await incrementRetry(action.id!);
        failed++;
      } else {
        // Client error (4xx) — won't succeed on retry, remove
        await removePendingAction(action.id!);
        failed++;
      }
    } catch {
      // Network error — still offline, stop trying
      break;
    }
  }

  return { synced, failed };
}

// Wrapper for fetch that queues on failure
export async function offlineFetch(
  url: string,
  options: RequestInit & { offlineType?: string } = {}
): Promise<Response> {
  const { offlineType, ...fetchOptions } = options;

  try {
    const response = await fetch(url, fetchOptions);
    return response;
  } catch (error) {
    // Network error — we're offline
    if (offlineType && fetchOptions.method && fetchOptions.method !== 'GET') {
      // Queue the mutation for later
      const { queueOfflineAction } = await import('./offlineDb');
      await queueOfflineAction({
        type: offlineType as 'labor_start' | 'labor_stop' | 'labor_pause' | 'labor_resume' | 'labor_update',
        url,
        method: fetchOptions.method || 'POST',
        body: (fetchOptions.body as string) || '',
        headers: Object.fromEntries(
          Object.entries(fetchOptions.headers || {}).filter(([, v]) => typeof v === 'string')
        ) as Record<string, string>,
        createdAt: new Date().toISOString(),
      });

      // Return a fake "queued" response
      return new Response(
        JSON.stringify({ offline: true, queued: true, message: 'Saved offline. Will sync when back online.' }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
    }

    throw error;
  }
}
