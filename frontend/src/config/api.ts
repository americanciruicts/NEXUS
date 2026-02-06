/**
 * API Configuration
 * Centralizes API endpoint configuration
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://acidashboard.aci.local:100/api';

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
  // Tracking
  TRACKING: `${API_BASE_URL}/tracking`,
  // Notifications
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  // Search
  SEARCH: `${API_BASE_URL}/search`,
};

export default API_BASE_URL;
