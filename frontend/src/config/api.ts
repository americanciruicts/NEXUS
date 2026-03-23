/**
 * API Configuration
 * Centralizes API endpoint configuration
 *
 * Local/Docker: uses http://acidashboard.aci.local:100/api (detected by hostname)
 * Vercel/External: uses /api which is rewritten by vercel.json to the Vercel backend
 */

// Runtime-only detection — no env vars to avoid Next.js build-time inlining issues
const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('192.168.') || host.includes('.local') || host === 'localhost') {
      return 'http://acidashboard.aci.local:100/api';
    }
  }
  return '/api';
};

// Lazy getter so it evaluates at call time (client-side), not at module load (SSR)
let _cachedBaseUrl: string | null = null;
export const getApiUrl = (): string => {
  if (_cachedBaseUrl === null) {
    _cachedBaseUrl = getApiBaseUrl();
  }
  return _cachedBaseUrl;
};

// For backwards compat — but on SSR this will be /api, on client it re-evaluates
export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    ME: `${API_BASE_URL}/auth/me`,
    RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
  },
  // Users
  USERS: `${API_BASE_URL}/users`,
  // Travelers
  TRAVELERS: `${API_BASE_URL}/travelers`,
  // Work Orders
  WORK_ORDERS: `${API_BASE_URL}/work-orders`,
  // Approvals
  APPROVALS: `${API_BASE_URL}/approvals`,
  // Labor
  LABOR: `${API_BASE_URL}/labor`,
  // Barcodes
  BARCODES: `${API_BASE_URL}/barcodes`,
  // Notifications
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  // Search
  SEARCH: `${API_BASE_URL}/search`,
};

export default API_BASE_URL;
