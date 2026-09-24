'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  ChartBarSquareIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/solid';
import AdvancedAnalytics from '../dashboard/components/AdvancedAnalytics';
import Link from 'next/link';

import DateRangePicker from '../dashboard/components/DateRangePicker';

// Lazy load analytics sections - only load the active tab
const LazyPlaceholder = () => <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md h-64 animate-pulse" />;
const InsightsSection = dynamic(() => import('../dashboard/components/InsightsSection'), { loading: LazyPlaceholder });
const AnalyticsSection = dynamic(() => import('../dashboard/components/AnalyticsSection'), { loading: LazyPlaceholder });
const ForecastCard = dynamic(() => import('../dashboard/components/ForecastCard'), { loading: LazyPlaceholder });
const LaborTrendsChart = dynamic(() => import('../dashboard/components/LaborTrendsChart'), { loading: LazyPlaceholder });
const WorkCenterUtilizationChart = dynamic(() => import('../dashboard/components/WorkCenterUtilizationChart'), { loading: LazyPlaceholder });
const WorkCenterStatusCard = dynamic(() => import('../dashboard/components/WorkCenterStatusCard'), { loading: LazyPlaceholder });


interface LiveUpdate {
  job_number: string;
  work_center: string;
  operator_name: string;
  start_time: string;
  end_time: string;
  time_in_step: string;
  hours_worked: number;
  status: string;
  is_active: boolean;
}

interface RawTrackingEntry {
  job_number: string;
  work_center: string;
  employee_name: string;
  start_time: string;
  end_time: string | null;
  hours_worked: number;
}

const TABS = [
  { id: 'insights', label: 'Insights' },
  { id: 'trends', label: 'Trends' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'production', label: 'Production Analytics' },
  { id: 'advanced', label: 'Advanced' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('insights');

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());

  const { data: dashboardData, loading, error, refetch } = useDashboardData(startDate, endDate);

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Build live updates for work center status card
  const liveUpdates: LiveUpdate[] = (() => {
    if (!dashboardData?.labor_entries || !Array.isArray(dashboardData.labor_entries)) return [];
    const entries = dashboardData.labor_entries as unknown as RawTrackingEntry[];
    return entries.map((entry) => {
      const startTime = new Date(entry.start_time);
      const endTime = entry.end_time ? new Date(entry.end_time) : new Date();
      const diffMs = endTime.getTime() - startTime.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const isActive = !entry.end_time;
      return {
        job_number: entry.job_number,
        work_center: entry.work_center,
        operator_name: entry.employee_name || 'Unknown',
        start_time: startTime.toLocaleTimeString(),
        end_time: entry.end_time ? new Date(entry.end_time).toLocaleTimeString() : 'In Progress',
        time_in_step: `${hours}h ${minutes}m`,
        hours_worked: entry.hours_worked || 0,
        status: isActive ? 'IN_PROGRESS' : 'COMPLETED',
        is_active: isActive,
      };
    }).sort((a, b) => (a.is_active && !b.is_active ? -1 : !a.is_active && b.is_active ? 1 : 0)).slice(0, 15);
  })();

  // Redirect non-admin users
  if (user && user.role === 'OPERATOR') {
    return (
      <Layout fullWidth>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-lg text-gray-600 dark:text-slate-400">Analytics is available for admin users only.</p>
            <Link href="/dashboard" className="text-blue-600 hover:underline mt-2 inline-block">Back to Dashboard</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-4">
        {/* Header */}
        <div className="mb-4 bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-800 text-white rounded-xl p-4 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white rounded-full translate-y-1/2" />
          </div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-white/15 backdrop-blur-sm p-2 rounded-lg border border-white/20">
                  <ChartBarSquareIcon className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">Analytics & Insights</h1>
                  <p className="text-xs text-purple-200/80">Deep-dive into production performance</p>
                </div>
              </div>
              <div className="flex flex-row gap-2">
                <Link href="/dashboard" className="inline-flex items-center px-3 py-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-bold rounded-lg border border-white/25 transition-all gap-1.5">
                  <ArrowLeftIcon className="w-4 h-4" />
                  Dashboard
                </Link>
              </div>
            </div>
            <DateRangePicker startDate={startDate} endDate={endDate} onDateChange={handleDateChange} />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-4 flex items-center gap-1.5 flex-wrap bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm border border-gray-100 dark:border-slate-700">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && !dashboardData && (
          <div className="flex flex-col items-center justify-center py-16">
            <ArrowPathIcon className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Loading analytics data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-xl p-5 mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <p className="text-red-800 dark:text-red-300 text-sm font-semibold">Error loading analytics data</p>
              <button onClick={() => refetch()} className="ml-auto px-4 py-1.5 text-xs font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 rounded-lg transition-colors">
                Retry
              </button>
            </div>
          </div>
        )}

        {!error && dashboardData && (
          <>
            {/* Insights Tab */}
            {activeTab === 'insights' && (
              <div className="space-y-4">
                <InsightsSection data={dashboardData.insights} />
              </div>
            )}

            {/* Trends Tab */}
            {activeTab === 'trends' && (
              <div className="space-y-4">
                <LaborTrendsChart data={dashboardData.labor_trend} departmentData={dashboardData.department_trend} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <WorkCenterUtilizationChart data={dashboardData.labor_by_work_center} />
                  <WorkCenterStatusCard liveUpdates={liveUpdates} />
                </div>
              </div>
            )}

            {/* Forecast Tab */}
            {activeTab === 'forecast' && (
              <div className="space-y-4">
                <ForecastCard data={dashboardData.forecast} />
              </div>
            )}

            {/* Production Analytics Tab */}
            {activeTab === 'production' && (
              <div className="space-y-4">
                <AnalyticsSection data={dashboardData.analytics} />
              </div>
            )}

            {/* Advanced Analytics Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-4">
                <AdvancedAnalytics startDate={startDate} endDate={endDate} />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
