/**
 * API Utility Functions
 * Provides centralized API call handling with timeout, error handling, and authentication
 */

import { API_BASE_URL } from '@/config/api';

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  requireAuth?: boolean;
}

/**
 * Enhanced fetch with timeout and authentication support
 */
export async function apiFetch<T = unknown>(
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
