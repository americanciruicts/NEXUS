'use client';

import { useEffect } from 'react';

/**
 * Global error boundary (Next.js App Router).
 * Catches errors thrown in the ROOT layout itself — the last line of defense
 * against a fully blank white screen. It must render its own <html>/<body>
 * because it replaces the root layout, so styles are inlined (Tailwind/global
 * CSS from the layout are not guaranteed to be available here).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error boundary caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          padding: 16,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            background: '#ffffff',
            borderRadius: 16,
            padding: 32,
            boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
            border: '1px solid #fecaca',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#64748b', margin: '0 0 24px' }}>
            The app hit an unexpected error. Try again, or reload the page.
          </p>
          <p
            style={{
              fontSize: 13,
              fontFamily: 'monospace',
              color: '#dc2626',
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: 10,
              padding: 12,
              margin: '0 0 24px',
              wordBreak: 'break-word',
            }}
          >
            {error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            style={{
              width: '100%',
              background: '#dc2626',
              color: '#fff',
              fontWeight: 600,
              padding: '12px 16px',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              background: '#f1f5f9',
              color: '#1e293b',
              fontWeight: 600,
              padding: '12px 16px',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      </body>
    </html>
  );
}
