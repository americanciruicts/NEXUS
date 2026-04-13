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
import { CubeIcon } from '@heroicons/react/24/outline';
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
        {loading && (
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

        {!loading && !error && dashboardData && (
          <>
            {/* Kitting Status card — always visible on Insights, Trends, Forecast */}
            {(activeTab === 'insights' || activeTab === 'trends' || activeTab === 'forecast') && (() => {
              const ka = (dashboardData.analytics as any)?.kitting_analytics;
              const s = ka?.summary || {};
              const f = ka?.forecast || {};
              const waitingJobs = (ka?.active_jobs || []).filter((j: any) => j.waiting_on_parts);
              return (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-800 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="bg-white/15 backdrop-blur-sm p-1.5 rounded-lg border border-white/20">
                        <CubeIcon className="h-4 w-4 text-sky-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-white">Kitting Status</h3>
                        <p className="text-[10px] text-sky-200/80">{s.active_jobs ?? 0} active · {s.waiting_on_parts ?? 0} waiting parts · {s.ready_to_kit ?? 0} ready</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[
                        { label: '30d Hours', value: `${s.total_hours_30d ?? 0}h`, color: 'text-blue-600' },
                        { label: 'Avg / Kit', value: `${s.avg_hours_per_kit ?? 0}h`, color: 'text-indigo-600' },
                        { label: 'Done 30d', value: s.completed_count_30d ?? 0, color: 'text-green-600' },
                        { label: 'Active', value: s.active_jobs ?? 0, color: 'text-sky-600' },
                        { label: 'Ready', value: s.ready_to_kit ?? 0, color: 'text-emerald-600' },
                        { label: 'Waiting', value: s.waiting_on_parts ?? 0, color: 'text-red-600' },
                      ].map(item => (
                        <div key={item.label} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-1.5 text-center">
                          <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase">{item.label}</p>
                          <p className={`text-base font-extrabold ${item.color} dark:opacity-80 leading-tight`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-2">
                        <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Hrs to clear (ready)</p>
                        <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{f.remaining_hours_ready ?? 0}h</p>
                        <p className="text-[9px] text-emerald-600/80">~{f.days_to_clear_one_kitter ?? 0}d @ 1 kitter</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-2">
                        <p className="text-[9px] font-bold text-red-700 dark:text-red-300 uppercase">Hrs blocked (parts)</p>
                        <p className="text-lg font-extrabold text-red-700 dark:text-red-300">{f.remaining_hours_waiting_parts ?? 0}h</p>
                        <p className="text-[9px] text-red-600/80">unblocks when KOSH receives</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-2">
                        <p className="text-[9px] font-bold text-blue-700 dark:text-blue-300 uppercase">Hrs / kit</p>
                        <p className="text-lg font-extrabold text-blue-700 dark:text-blue-300">{f.hours_per_kit_used ?? 0}h</p>
                        <p className="text-[9px] text-blue-600/80">{(s.avg_hours_per_kit ?? 0) > 0 ? '30d avg' : 'estimate'}</p>
                      </div>
                    </div>
                    {waitingJobs.length > 0 && (
                      <div>
                        <p className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase mb-1">Jobs waiting on parts</p>
                        <div className="space-y-0.5 max-h-28 overflow-y-auto">
                          {waitingJobs.map((j: any) => (
                            <div key={j.traveler_id} className="flex items-center gap-2 px-2 py-1 rounded bg-red-50/50 dark:bg-red-900/10 text-[11px]">
                              <span className="font-bold text-blue-600">{j.job_number}</span>
                              <span className="text-gray-500 truncate flex-1">{j.customer_name}</span>
                              <span className="font-bold text-red-600">{j.parts_short}/{j.parts_total} short</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

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
                <AdvancedAnalytics />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
