'use client';

import { useEffect } from 'react';

/**
 * Route-segment error boundary (Next.js App Router).
 * Catches render/data errors in any route under app/ and shows a recoverable
 * card with a Retry button (re-renders the segment via reset(), no full reload)
 * instead of a blank white screen. Logs the real error to the console.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error boundary caught:', error);
  }, [error]);

  const message = error?.message || 'An unexpected error occurred.';
  const looksLikeNetwork =
    /timeout|failed to fetch|networkerror|load failed|api error \(50[0-9]\)|api error \(0\)/i.test(message);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4 transition-colors">
      <div className="max-w-lg w-full bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-8 border border-red-200 dark:border-red-900/50">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30">
          <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-slate-100 mb-2">
          {looksLikeNetwork ? 'Could not reach the server' : 'Something went wrong'}
        </h2>
        <p className="text-center text-gray-500 dark:text-slate-400 mb-6">
          {looksLikeNetwork
            ? 'The server did not respond in time. This is usually temporary — please try again.'
            : 'An unexpected error occurred. You can try again without losing your place.'}
        </p>

        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl mb-6 border border-red-100 dark:border-red-900/30">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">Details</p>
          <p className="text-sm text-red-600 dark:text-red-400 font-mono break-words">{message}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => reset()}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-md"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
