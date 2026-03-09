'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  Squares2X2Icon,
  PlusCircleIcon,
  MapPinIcon,
  SignalIcon,
  ArrowPathIcon,
  BoltIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/solid';

// Dashboard components
import DateRangePicker from './components/DateRangePicker';
import MetricsGrid from './components/MetricsGrid';
import StatusDistributionChart from './components/StatusDistributionChart';
import LaborTrendsChart from './components/LaborTrendsChart';
import WorkCenterUtilizationChart from './components/WorkCenterUtilizationChart';
import AlertsSummaryCard from './components/AlertsSummaryCard';
import TodaySnapshotGrid from './components/TodaySnapshotGrid';
import WorkCenterStatusCard from './components/WorkCenterStatusCard';
import RecentActivityFeed from './components/RecentActivityFeed';
import OperatorDashboard from './components/OperatorDashboard';
import { API_BASE_URL } from '@/config/api';

interface DashboardTraveler {
  id: number;
  job_number: string;
  part_number: string;
  part_description: string;
  traveler_type: string;
  quantity: number;
  status: string;
  priority: string;
  work_center: string;
  due_date?: string;
  created_at?: string;
  total_steps: number;
  completed_steps: number;
  percent_complete: number;
  current_step: string;
  current_work_center?: string;
  qty_accepted: number;
  qty_rejected: number;
}

interface RawTrackingEntry {
  job_number: string;
  work_center: string;
  operator_name: string;
  start_time: string;
  end_time: string | null;
  hours_worked: number;
}

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

interface OverdueJob {
  id: number;
  job_number: string;
  part_description: string;
  due_date: string;
  status: string;
}

const STATUS_TABS = ['All', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CREATED', 'DRAFT'] as const;

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  'IN_PROGRESS': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'In Progress' },
  'COMPLETED': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Completed' },
  'ON_HOLD': { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'On Hold' },
  'DRAFT': { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Draft' },
  'CREATED': { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', label: 'Created' },
  'CANCELLED': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Cancelled' },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string }> = {
  'URGENT': { bg: 'bg-red-100', text: 'text-red-700' },
  'HIGH': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'NORMAL': { bg: 'bg-blue-50', text: 'text-blue-600' },
  'LOW': { bg: 'bg-gray-100', text: 'text-gray-500' },
};

const TYPE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  'PCB_ASSEMBLY': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'ASSY' },
  'ASSY': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'ASSY' },
  'PCB': { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'PCB' },
  'CABLE': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'CABLE' },
  'CABLES': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'CABLE' },
  'PURCHASING': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'PURCH' },
};

export default function Dashboard() {
  const { user } = useAuth();

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());

  const { data: dashboardData, loading, error, refetch } = useDashboardData(startDate, endDate);

  const [dashTravelers, setDashTravelers] = useState<DashboardTraveler[]>([]);
  const [travelerFilter, setTravelerFilter] = useState<string>('All');
  const [trackingEntries, setTrackingEntries] = useState<RawTrackingEntry[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);
  const [overdueJobs, setOverdueJobs] = useState<OverdueJob[]>([]);

  useEffect(() => {
    fetchDashboardTravelers();
    fetchTrackingEntries();

    const interval = setInterval(() => {
      fetchTrackingEntries();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  // Derive overdue jobs from dashboard travelers
  useEffect(() => {
    const today = new Date();
    const overdue = dashTravelers
      .filter((t) => {
        if (t.status !== 'IN_PROGRESS' || !t.due_date) return false;
        const dueDate = new Date(t.due_date.indexOf('-') === 4 ? t.due_date + 'T23:59:59' : t.due_date);
        return dueDate < today;
      })
      .map((t) => ({
        id: t.id,
        job_number: t.job_number,
        part_description: t.part_description,
        due_date: t.due_date!,
        status: t.status
      }));
    setOverdueJobs(overdue);
  }, [dashTravelers]);

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const fetchDashboardTravelers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/travelers/dashboard-summary`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDashTravelers(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard travelers:', err);
    }
  };

  const fetchTrackingEntries = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tracking/?limit=100`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token') || ''}` }
      });
      if (response.ok) {
        const data: RawTrackingEntry[] = await response.json();
        setTrackingEntries(data);

        const updates: LiveUpdate[] = data.map((entry) => {
          const startTime = new Date(entry.start_time);
          const endTime = entry.end_time ? new Date(entry.end_time) : new Date();
          const diffMs = endTime.getTime() - startTime.getTime();
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const isActive = !entry.end_time;

          return {
            job_number: entry.job_number,
            work_center: entry.work_center,
            operator_name: entry.operator_name,
            start_time: startTime.toLocaleTimeString(),
            end_time: entry.end_time ? new Date(entry.end_time).toLocaleTimeString() : 'In Progress',
            time_in_step: `${hours}h ${minutes}m`,
            hours_worked: entry.hours_worked || 0,
            status: isActive ? 'IN_PROGRESS' : 'COMPLETED',
            is_active: isActive
          };
        });

        updates.sort((a, b) => {
          if (a.is_active && !b.is_active) return -1;
          if (!a.is_active && b.is_active) return 1;
          return 0;
        });

        setLiveUpdates(updates.slice(0, 15));
      }
    } catch (err) {
      console.error('Error fetching tracking entries:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const info = STATUS_CONFIG[status] || STATUS_CONFIG['IN_PROGRESS'];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${info.bg} ${info.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${info.dot} mr-1.5 ${status === 'COMPLETED' ? '' : 'animate-pulse'}`} />
        {info.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const info = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['NORMAL'];
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${info.bg} ${info.text}`}>
        {priority}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const info = TYPE_CONFIG[type] || { bg: 'bg-gray-100', text: 'text-gray-600', label: type };
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${info.bg} ${info.text}`}>
        {info.label}
      </span>
    );
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-green-500';
    if (percent >= 75) return 'bg-emerald-500';
    if (percent >= 50) return 'bg-blue-500';
    if (percent >= 25) return 'bg-indigo-500';
    return 'bg-violet-500';
  };

  // Filter travelers
  const filteredTravelers = travelerFilter === 'All'
    ? dashTravelers
    : dashTravelers.filter(t => t.status === travelerFilter);

  const displayedTravelers = filteredTravelers.slice(0, 12);

  // Show operator dashboard for non-admin users
  if (user && user.role !== 'ADMIN') {
    return (
      <Layout fullWidth>
        <OperatorDashboard username={user.username} firstName={user.first_name} />
      </Layout>
    );
  }

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
        {/* Dashboard Header */}
        <div className="mb-6 sm:mb-8 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white rounded-2xl p-5 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                  <Squares2X2Icon className="w-7 h-7 text-blue-300" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Manufacturing Dashboard</h1>
                  <p className="text-sm text-blue-200/80 mt-0.5">Real-time operations overview with complete analytics</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Link href="/travelers/new" className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 gap-2">
                  <PlusCircleIcon className="w-5 h-5" />
                  New Traveler
                </Link>
                <Link href="/travelers/tracking" className="inline-flex items-center justify-center px-5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-bold rounded-xl border border-white/25 shadow-lg transition-all duration-200 hover:-translate-y-0.5 gap-2">
                  <MapPinIcon className="w-5 h-5" />
                  Track Traveler
                </Link>
              </div>
            </div>
            <DateRangePicker startDate={startDate} endDate={endDate} onDateChange={handleDateChange} />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <ArrowPathIcon className="w-10 h-10 text-blue-500 animate-spin mb-3" />
            <p className="text-sm text-gray-500 font-medium">Loading dashboard data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-5 mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <div>
                <p className="text-red-800 text-sm font-semibold">Error loading dashboard data</p>
                <p className="text-red-600 text-xs mt-0.5">{error}</p>
              </div>
              <button onClick={() => refetch()} className="ml-auto px-4 py-1.5 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors">
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && dashboardData && (
          <>
            {/* Traveler Overview Section */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className="text-xs font-bold uppercase tracking-wider">Traveler Overview</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent" />
            </div>
            <MetricsGrid data={dashboardData} />

            {/* All Travelers Table (full width) */}
            <div className="flex items-center gap-3 mt-8 mb-3">
              <div className="flex items-center gap-2 bg-cyan-100 text-cyan-700 px-3 py-1.5 rounded-lg">
                <ClipboardDocumentListIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">All Travelers</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-cyan-200 to-transparent" />
            </div>
            <div className="bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 px-5 sm:px-6 py-4 flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="bg-white/15 backdrop-blur-sm p-2 rounded-xl border border-white/20">
                    <ClipboardDocumentListIcon className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white">Traveler Status & Progress</h2>
                    <p className="text-xs text-blue-200/80">Click any traveler to view full details</p>
                  </div>
                </div>
                <div className="relative z-10 flex items-center gap-3">
                  <span className="bg-blue-500/20 text-blue-200 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-400/30">
                    {filteredTravelers.length} travelers
                  </span>
                  <Link href="/travelers" className="bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/20 transition-colors">
                    View All
                  </Link>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="px-4 sm:px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 overflow-x-auto">
                {STATUS_TABS.map((tab) => {
                  const count = tab === 'All' ? dashTravelers.length : dashTravelers.filter(t => t.status === tab).length;
                  const isActive = travelerFilter === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setTravelerFilter(tab)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {tab === 'All' ? 'All' : (STATUS_CONFIG[tab]?.label || tab)}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Job #</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Part / Description</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider min-w-[180px]">Progress</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Work Center</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {displayedTravelers.map((t) => (
                      <Link
                        key={t.id}
                        href={`/travelers/${t.id}`}
                        className="table-row hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-700 group-hover:text-blue-900">
                          {t.job_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-[180px]">
                          <div className="truncate font-medium">{t.part_number}</div>
                          <div className="truncate text-[11px] text-gray-400">{t.part_description}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {getTypeBadge(t.traveler_type)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {getStatusBadge(t.status)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[80px]">
                              <div
                                className={`h-full rounded-full transition-all ${getProgressColor(t.percent_complete)}`}
                                style={{ width: `${Math.min(t.percent_complete, 100)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                              {t.completed_steps}/{t.total_steps}
                              <span className="text-gray-400 ml-1">({t.percent_complete}%)</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px]">
                          <div className="truncate text-xs">{t.current_step || t.current_work_center || t.work_center || '—'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="text-xs font-semibold text-gray-700">{t.quantity}</div>
                          {(t.qty_accepted > 0 || t.qty_rejected > 0) && (
                            <div className="text-[10px] text-gray-400">
                              <span className="text-green-600">{t.qty_accepted} ok</span>
                              {t.qty_rejected > 0 && <span className="text-red-500 ml-1">{t.qty_rejected} rej</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 font-mono">
                          {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {getPriorityBadge(t.priority)}
                        </td>
                      </Link>
                    ))}
                  </tbody>
                </table>
                {displayedTravelers.length === 0 && (
                  <div className="text-center py-12">
                    <ClipboardDocumentListIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm font-medium">No travelers found</p>
                  </div>
                )}
              </div>
              {filteredTravelers.length > 12 && (
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                  <Link href={travelerFilter === 'All' ? '/travelers' : `/travelers?status=${travelerFilter}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
                    View all {filteredTravelers.length} travelers
                    <ChevronRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Labor & Tracking Section */}
            <div className="flex items-center gap-3 mt-8 mb-3">
              <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg">
                <SignalIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Labor, Tracking & Analytics</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-emerald-200 to-transparent" />
            </div>

            {/* Today's Snapshot (full width) */}
            <TodaySnapshotGrid entries={trackingEntries} />

            {/* 2x2 Grid: Charts + Activity + Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4">
              <StatusDistributionChart data={dashboardData.status_distribution} />
              <RecentActivityFeed entries={trackingEntries} />
              <WorkCenterUtilizationChart data={dashboardData.labor_by_work_center} />
              <AlertsSummaryCard data={dashboardData} overdueJobs={overdueJobs} />
            </div>

            {/* Labor Trends (full width) */}
            <div className="mt-4">
              <LaborTrendsChart data={dashboardData.labor_trend} />
            </div>

            {/* Live Operations */}
            <div className="flex items-center gap-3 mt-8 mb-3">
              <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span className="text-xs font-bold uppercase tracking-wider">Live Operations</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-amber-200 to-transparent" />
            </div>
            <WorkCenterStatusCard liveUpdates={liveUpdates} />

            {/* Live Tracking Table */}
            <div className="mt-6 sm:mt-8">
              <div className="bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 px-5 sm:px-6 py-4 flex items-center justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="bg-white/15 backdrop-blur-sm p-2 rounded-xl border border-white/20">
                      <SignalIcon className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white">Live Traveler Tracking</h2>
                      <p className="text-xs text-blue-200/80">Real-time work center activity</p>
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center gap-3">
                    {liveUpdates.length > 0 && (
                      <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                        {liveUpdates.filter(u => u.is_active).length} live
                      </span>
                    )}
                    <Link href="/travelers/tracking" className="bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/20 transition-colors">
                      View All
                    </Link>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Job Number</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Operator</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Entry Time</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Exit Time</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                      {liveUpdates.map((update, index) => (
                        <tr key={index} className={`${update.is_active ? 'bg-emerald-50/50' : ''} hover:bg-gray-50/80 transition-colors`}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                            <Link href={`/travelers?search=${encodeURIComponent(update.job_number)}`} className="text-blue-700 hover:text-blue-900 hover:underline">
                              {update.job_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{update.work_center}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{update.operator_name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">{update.start_time}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">{update.end_time}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">{update.time_in_step}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">{getStatusBadge(update.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {liveUpdates.length === 0 && (
                    <div className="text-center py-12">
                      <SignalIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm font-medium">No tracking activity</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
