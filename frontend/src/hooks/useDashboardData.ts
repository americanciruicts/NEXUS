'use client';

import { useState, useEffect } from 'react';

export interface DashboardData {
  start_date: string;
  end_date: string;
  status_distribution: { [key: string]: number };
  total_labor_hours: number;
  labor_by_work_center: Array<{ workCenter: string; hours: number }>;
  labor_trend: Array<{ date: string; hours: number }>;
  travelers_created: number;
  travelers_completed: number;
  completion_rate: number;
  avg_completion_time_hours: number;
  work_center_utilization: Array<{ workCenter: string; hours: number }>;
  top_employees: Array<{ name: string; value: number; hours: number }>;
  pending_approvals: number;
  on_hold_travelers: number;
  overdue_travelers: number;
  active_labor_entries: number;
  active_tracking_entries: number;
}

export function useDashboardData(startDate: Date, endDate: Date) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('nexus_token');
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Format dates as YYYY-MM-DD using local time (not UTC)
      const pad = (n: number) => n.toString().padStart(2, '0');
      const startDateStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
      const endDateStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;

      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(
        `${apiBase}/api/dashboard/stats?start_date=${startDateStr}&end_date=${endDateStr}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }

      const dashboardData = await response.json();
      setData(dashboardData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  return { data, loading, error, refetch: fetchDashboardData };
}
