/**
 * API Utility Functions
 * Provides centralized API call handling with timeout, error handling, and authentication
 */

import { API_BASE_URL } from '@/config/api';

// Shorter default so a slow/unreachable backend fails fast and retries,
// instead of hanging the UI for 30s. Callers can override per request.
const DEFAULT_TIMEOUT = 12000; // 12 seconds

// Status codes that indicate a transient backend/tunnel hiccup worth retrying.
const TRANSIENT_STATUS = new Set([502, 503, 504]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  requireAuth?: boolean;
  /** Number of automatic retries on transient failures. Defaults to 2 for
   *  idempotent methods (GET/HEAD) and 0 for everything else (to avoid
   *  double-submitting POST/PUT/PATCH/DELETE). Set explicitly to override. */
  retries?: number;
}

/**
 * Enhanced fetch with timeout, authentication, and automatic retry of
 * transient failures (network errors, timeouts, 502/503/504). Retries use
 * exponential backoff and only apply to idempotent requests unless overridden.
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    requireAuth = true,
    headers = {},
    retries,
    ...fetchOptions
  } = options;

  const method = (fetchOptions.method || 'GET').toUpperCase();
  const isIdempotent = method === 'GET' || method === 'HEAD';
  const maxRetries = retries ?? (isIdempotent ? 2 : 0);

  let lastError: Error = new Error('Unknown error occurred');
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await attemptFetch<T>(url, { timeout, requireAuth, headers, ...fetchOptions });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      const transient =
        lastError.name === 'AbortError' ||
        /Request timeout|Failed to fetch|NetworkError|Load failed/i.test(lastError.message) ||
        [...TRANSIENT_STATUS].some((s) => lastError.message.includes(`(${s})`));

      if (attempt < maxRetries && transient) {
        await sleep(400 * Math.pow(2, attempt)); // 400ms, 800ms, ...
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

async function attemptFetch<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    requireAuth = true,
    headers = {},
    ...fetchOptions
  } = options;

  // Build headers as Record for type safety
  const finalHeaders: Record<string, string> = {};

  // Copy existing headers
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        finalHeaders[key] = value;
      }
    });
  }

  if (requireAuth) {
    try {
      const token = localStorage.getItem('nexus_token');
      if (token) {
        finalHeaders['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
  }

  // Set default content type for JSON requests
  if (!finalHeaders['Content-Type'] && (fetchOptions.method === 'POST' || fetchOptions.method === 'PUT')) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...fetchOptions,
      headers: finalHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error (${response.status}): ${error}`);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text() as T;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
}

/**
 * Helper functions for common HTTP methods
 */
export const api = {
  get: <T = unknown>(url: string, options?: ApiRequestOptions) =>
    apiFetch<T>(url, { ...options, method: 'GET' }),

  post: <T = unknown>(url: string, data?: unknown, options?: ApiRequestOptions) =>
    apiFetch<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = unknown>(url: string, data?: unknown, options?: ApiRequestOptions) =>
    apiFetch<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = unknown>(url: string, options?: ApiRequestOptions) =>
    apiFetch<T>(url, { ...options, method: 'DELETE' }),

  patch: <T = unknown>(url: string, data?: unknown, options?: ApiRequestOptions) =>
    apiFetch<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
};

export default api;
