'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithCache, getAuthHeaders } from '@/lib/fetchWithCache';

export interface DashboardData {
  start_date: string;
  end_date: string;
  status_distribution: { [key: string]: number };
  total_labor_hours: number;
  labor_by_work_center: Array<{ workCenter: string; hours: number }>;
  labor_trend: Array<Record<string, any>>;
  travelers_created: number;
  travelers_completed: number;
  completion_rate: number;
  avg_completion_time_hours: number;
  work_center_utilization: Array<{ workCenter: string; hours: number }>;
  top_employees: Array<{ name: string; value: number; hours: number }>;
  pending_approvals: number;
  on_hold_travelers: number;
  overdue_travelers: number;
  department_trend: Array<Record<string, any>>;
  stuck_travelers: Array<{
    id: number;
    job_number: string;
    part_number: string;
    work_center: string;
    department: string;
    idle_hours: number;
    idle_days: number;
    last_activity: string | null;
    due_date: string | null;
    priority: string;
  }>;
  forecast: Array<{
    id: number;
    job_number: string;
    part_number: string;
    part_description: string;
    due_date: string;
    days_until_due: number | null;
    estimated_hours: number;
    buffer_hours: number;
    buffered_total: number;
    actual_hours: number;
    remaining_hours: number;
    remaining_buffered: number;
    work_hours_available: number;
    min_headcount: number;
    total_steps: number;
    completed_steps: number;
    percent_complete: number;
    priority: string;
    on_track: boolean;
    steps: Array<{
      step_number: number;
      operation: string;
      is_completed: boolean;
      estimated_hours: number;
      buffer_hours: number;
      buffered_total: number;
      actual_hours: number;
      operators_needed: number;
    }>;
  }>;
  active_labor_entries: number;
  // Merged data from parallel endpoints
  insights?: Record<string, unknown>;
  analytics?: Record<string, unknown>;
  travelers_list?: Record<string, unknown>[];
  labor_entries?: Record<string, unknown>[];
}

// Cache TTLs - avoid hammering the backend
const STATS_TTL = 60_000;      // 60s for core stats
const INSIGHTS_TTL = 120_000;  // 2 min for insights (heavy)
const ANALYTICS_TTL = 120_000; // 2 min for analytics (heavy)
const TRAVELERS_TTL = 45_000;  // 45s for traveler list
const LABOR_TTL = 30_000;      // 30s for labor (more real-time)

// Polling interval: 5 minutes instead of 60 seconds
const POLL_INTERVAL = 5 * 60 * 1000;

export function useDashboardData(startDate: Date, endDate: Date) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const token = localStorage.getItem('nexus_token');
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const pad = (n: number) => n.toString().padStart(2, '0');
      const startDateStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
      const endDateStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;

      const { API_BASE_URL } = await import('@/config/api');
      const headers = getAuthHeaders();

      // Fetch core stats first (fast, essential), then secondary in parallel
      const statsData = await fetchWithCache<DashboardData>(
        `${API_BASE_URL}/dashboard/stats?start_date=${startDateStr}&end_date=${endDateStr}`,
        { headers, ttl: STATS_TTL }
      );

      if (!mountedRef.current) return;

      // Show stats immediately, then load secondary data
      const merged: DashboardData = { ...statsData };
      setData(merged);
      if (!silent) setLoading(false);

      // Secondary data in parallel (cached, won't re-fetch if fresh)
      const [insights, analytics, travelers, labor] = await Promise.all([
        fetchWithCache(`${API_BASE_URL}/dashboard/insights`, { headers, ttl: INSIGHTS_TTL }).catch(() => null),
        fetchWithCache(`${API_BASE_URL}/analytics/all`, { headers, ttl: ANALYTICS_TTL }).catch(() => null),
        fetchWithCache(`${API_BASE_URL}/travelers/dashboard-summary`, { headers, ttl: TRAVELERS_TTL }).catch(() => null),
        fetchWithCache(`${API_BASE_URL}/labor/`, { headers, ttl: LABOR_TTL }).catch(() => null),
      ]);

      if (!mountedRef.current) return;

      merged.insights = insights as Record<string, unknown> | null ?? undefined;
      merged.analytics = analytics as Record<string, unknown> | null ?? undefined;
      merged.travelers_list = travelers as Record<string, unknown>[] | null ?? undefined;
      merged.labor_entries = labor as Record<string, unknown>[] | null ?? undefined;

      setData({ ...merged });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
        setLoading(false);
      }
    }
  }, [startDate, endDate]);

  useEffect(() => {
    mountedRef.current = true;
    fetchDashboardData();

    // Poll every 5 minutes instead of 60 seconds
    const interval = setInterval(() => fetchDashboardData(true), POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchDashboardData]);

  return { data, loading, error, refetch: fetchDashboardData };
}
