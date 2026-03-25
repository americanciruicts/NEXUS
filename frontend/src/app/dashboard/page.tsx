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
  ClockIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/solid';

// Dashboard components
import DateRangePicker from './components/DateRangePicker';
import MetricsGrid from './components/MetricsGrid';
import LaborTrendsChart from './components/LaborTrendsChart';
import WorkCenterUtilizationChart from './components/WorkCenterUtilizationChart';
import WorkCenterStatusCard from './components/WorkCenterStatusCard';
import StuckTravelersCard from './components/StuckTravelersCard';
import ForecastCard from './components/ForecastCard';

import OperatorDashboard from './components/OperatorDashboard';
import { API_BASE_URL } from '@/config/api';
import { DEPARTMENT_BAR_COLORS } from '@/data/workCenters';

interface DeptProgress {
  department: string;
  total_steps: number;
  completed_steps: number;
  percent_complete: number;
}

interface LaborProgress {
  total_hours: number;
  entries_count: number;
  active_entries: number;
  steps_with_labor: number;
  total_steps: number;
  percent: number;
}

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
  ship_date?: string;
  created_at?: string;
  total_steps: number;
  completed_steps: number;
  percent_complete: number;
  current_step: string;
  current_work_center?: string;
  qty_accepted: number;
  qty_rejected: number;
  department_progress?: DeptProgress[];
  labor_progress?: LaborProgress;
}

interface RawTrackingEntry {
  job_number: string;
  work_center: string;
  employee_name: string;
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
  'IN_PROGRESS': { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', label: 'In Progress' },
  'PREP': { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500', label: 'Prep & Kitting' },
  'PRODUCTION_STARTED': { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500', label: 'Production Started' },
  'IN_MANUFACTURING': { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500', label: 'In Manufacturing' },
  'TESTING': { bg: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500', label: 'Testing & QC' },
  'FINAL_INSPECTION': { bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-500', label: 'Final Inspection' },
  'COMPLETED': { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500', label: 'Completed' },
  'ON_HOLD': { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500', label: 'On Hold' },
  'DRAFT': { bg: 'bg-gray-50 dark:bg-slate-700', text: 'text-gray-600 dark:text-slate-300', dot: 'bg-gray-400', label: 'Draft' },
  'CREATED': { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-400', label: 'Awaiting Start' },
  'CANCELLED': { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500', label: 'Cancelled' },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  'URGENT': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Urgent' },
  'PREMIUM': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', label: 'Premium' },
  'HIGH': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', label: 'High' },
  'NORMAL': { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-300', label: 'Normal' },
  'LOW': { bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-500 dark:text-slate-400', label: 'Low' },
};

const TYPE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  'PCB_ASSEMBLY': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'ASSY' },
  'ASSY': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'ASSY' },
  'PCB': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', label: 'PCB' },
  'CABLE': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'CABLE' },
  'CABLES': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'CABLE' },
  'PURCHASING': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: 'PURCH' },
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
  const [travelerPage, setTravelerPage] = useState(1);
  const travelerPageSize = 10;

  useEffect(() => {
    fetchTrackingEntries();

    const interval = setInterval(() => {
      fetchTrackingEntries();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  // Fetch all travelers on mount + auto-refresh every 30s for live progress updates
  useEffect(() => {
    fetchDashboardTravelers();
    const interval = setInterval(() => {
      fetchDashboardTravelers();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Derive overdue jobs from dashboard travelers
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const overdue = dashTravelers
      .filter((t) => {
        if (t.status !== 'IN_PROGRESS' || !t.due_date) return false;
        const dueDateStr = t.due_date.substring(0, 10); // extract YYYY-MM-DD
        return dueDateStr < todayStr;
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

  const fetchDashboardTravelers = async (retryCount = 0) => {
    try {
      const token = localStorage.getItem('nexus_token');
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/travelers/dashboard-summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDashTravelers(data);
      } else if (retryCount < 1) {
        fetchDashboardTravelers(retryCount + 1);
      }
    } catch (err) {
      console.error('Error fetching dashboard travelers:', err);
      if (retryCount < 1) {
        setTimeout(() => fetchDashboardTravelers(retryCount + 1), 1000);
      }
    }
  };

  const fetchTrackingEntries = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/labor/`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
            operator_name: entry.employee_name || 'Unknown',
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

  const getStatusBadge = (status: string, progress?: number) => {
    let configKey = status;
    if ((status === 'IN_PROGRESS' || status === 'CREATED') && typeof progress === 'number' && progress > 0) {
      if (progress >= 90) configKey = 'FINAL_INSPECTION';
      else if (progress >= 70) configKey = 'TESTING';
      else if (progress >= 40) configKey = 'IN_MANUFACTURING';
      else if (progress >= 10) configKey = 'PRODUCTION_STARTED';
      else configKey = 'PREP';
    }
    const info = STATUS_CONFIG[configKey] || STATUS_CONFIG['IN_PROGRESS'];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${info.bg} ${info.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${info.dot} mr-1.5 ${status === 'COMPLETED' ? '' : 'animate-pulse'}`} />
        {info.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const info = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['NORMAL'];
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${info.bg} ${info.text}`}>
        {info.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const info = TYPE_CONFIG[type] || { bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-600 dark:text-slate-300', label: type };
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${info.bg} ${info.text}`}>
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

  const travelerTotalPages = Math.max(1, Math.ceil(filteredTravelers.length / travelerPageSize));
  const safeTravelerPage = Math.min(travelerPage, travelerTotalPages);
  const displayedTravelers = filteredTravelers.slice((safeTravelerPage - 1) * travelerPageSize, safeTravelerPage * travelerPageSize);

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-4">
        {/* Dashboard Header */}
        <div className="mb-4 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white rounded-xl p-4 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-white/15 backdrop-blur-sm p-2 rounded-lg border border-white/20">
                  <Squares2X2Icon className="w-5 h-5 text-teal-300" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">Manufacturing Dashboard</h1>
                  <p className="text-xs text-teal-200/80">Real-time operations overview</p>
                </div>
              </div>
              <div className="flex flex-row gap-2">
                <Link href="/travelers/new" className="inline-flex items-center px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg shadow-md transition-all gap-1.5">
                  <PlusCircleIcon className="w-4 h-4" />
                  New Traveler
                </Link>
                <Link href="/labor-tracking" className="inline-flex items-center px-3 py-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-bold rounded-lg border border-white/25 transition-all gap-1.5">
                  <MapPinIcon className="w-4 h-4" />
                  Track
                </Link>
                <Link href="/reports/analytics" className="inline-flex items-center px-3 py-1.5 bg-purple-500/60 hover:bg-purple-500/80 backdrop-blur-sm text-white text-xs font-bold rounded-lg border border-purple-400/30 transition-all gap-1.5">
                  <BoltIcon className="w-4 h-4" />
                  Analytics
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
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Loading dashboard data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-xl p-5 mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-lg">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <div>
                <p className="text-red-800 dark:text-red-300 text-sm font-semibold">Error loading dashboard data</p>
                <p className="text-red-600 dark:text-red-400 text-xs mt-0.5">{error}</p>
              </div>
              <button onClick={() => refetch()} className="ml-auto px-4 py-1.5 text-xs font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 rounded-lg transition-colors">
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && dashboardData && (
          <>
            {/* Metrics Row */}
            <MetricsGrid data={dashboardData} />

            {/* Traveler Table */}
            <div className="mt-4 bg-white dark:bg-slate-800 shadow-lg rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-3 py-2.5 flex items-center justify-between relative overflow-hidden">
                <div className="relative z-10 flex items-center gap-2">
                  <div className="bg-white/15 backdrop-blur-sm p-1.5 rounded-lg border border-white/20">
                    <ClipboardDocumentListIcon className="w-4 h-4 text-cyan-300" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Traveler Status & Progress</h2>
                    <p className="text-[10px] text-teal-200/80">Click any traveler to view details</p>
                  </div>
                </div>
                <div className="relative z-10 flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
                    {filteredTravelers.length} travelers
                  </span>
                  <Link href="/travelers" className="bg-white/15 hover:bg-white/25 text-white text-[10px] font-semibold px-2 py-1 rounded-lg border border-white/20 transition-colors">
                    View All
                  </Link>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 flex items-center gap-1.5 flex-wrap">
                {STATUS_TABS.map((tab) => {
                  const count = tab === 'All' ? dashTravelers.length : dashTravelers.filter(t => t.status === tab).length;
                  const isActive = travelerFilter === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => { setTravelerFilter(tab); setTravelerPage(1); }}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600'
                      }`}
                    >
                      {tab === 'All' ? 'All' : (STATUS_CONFIG[tab]?.label || tab)}
                      <span className={`px-1 py-0 rounded-full text-[11px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-slate-400'
                      }`}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Table */}
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <table className="w-full divide-y divide-gray-100 dark:divide-slate-700 min-w-[900px]" style={{tableLayout: 'fixed'}}>
                  <colgroup>
                    <col style={{width: '8%'}} />
                    <col style={{width: '15%'}} />
                    <col style={{width: '6%'}} />
                    <col style={{width: '12%'}} />
                    <col style={{width: '12%'}} />
                    <col style={{width: '15%'}} />
                    <col style={{width: '12%'}} />
                    <col style={{width: '6%'}} />
                    <col style={{width: '8%'}} />
                    <col style={{width: '6%'}} />
                  </colgroup>
                  <thead className="bg-gray-50/80 dark:bg-slate-900/80">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Job #</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Part / Desc</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Type</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Status</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Steps</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Depts</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Work Center</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Qty</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Due</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Pri</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-50 dark:divide-slate-700">
                    {displayedTravelers.map((t) => (
                      <Link
                        key={t.id}
                        href={`/travelers/${t.id}`}
                        className="table-row hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-2 py-2 whitespace-nowrap text-sm font-semibold text-blue-700 dark:text-blue-400 group-hover:text-blue-900 dark:group-hover:text-blue-300 truncate">
                          {t.job_number}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-700 dark:text-slate-300">
                          <div className="truncate font-medium text-xs">{t.part_number}</div>
                          <div className="truncate text-xs text-gray-400 dark:text-slate-500">{t.part_description}</div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          {getTypeBadge(t.traveler_type)}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          {getStatusBadge(t.status, t.percent_complete)}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-col items-center gap-1">
                            <div className="relative w-11 h-11 flex-shrink-0">
                              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                                <circle cx="22" cy="22" r="19" fill="none" stroke="#e5e7eb" strokeWidth="2.5" className="dark:stroke-slate-600" />
                                <circle cx="22" cy="22" r="19" fill="none"
                                  stroke={t.percent_complete >= 100 ? '#16a34a' : t.percent_complete >= 75 ? '#2563eb' : t.percent_complete >= 50 ? '#f59e0b' : t.percent_complete >= 25 ? '#f97316' : '#ef4444'}
                                  strokeWidth="2.5" strokeLinecap="round"
                                  strokeDasharray={`${t.percent_complete * 1.194} 119.4`}
                                />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-gray-700 dark:text-slate-300">{t.completed_steps}/{t.total_steps}</span>
                            </div>
                            <span className="text-[11px] font-bold" style={{ color: t.percent_complete >= 100 ? '#16a34a' : t.percent_complete >= 75 ? '#2563eb' : t.percent_complete >= 50 ? '#f59e0b' : t.percent_complete >= 25 ? '#f97316' : '#ef4444' }}>{t.percent_complete}%</span>
                            <div className="w-full bg-gray-100 dark:bg-slate-600 rounded-full h-1.5 overflow-hidden">
                              <div className="h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${t.percent_complete}%`, backgroundColor: t.percent_complete >= 100 ? '#16a34a' : t.percent_complete >= 75 ? '#2563eb' : t.percent_complete >= 50 ? '#f59e0b' : '#f97316' }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          {t.department_progress && t.department_progress.length > 0 ? (
                            <div className="space-y-0.5">
                              {t.department_progress.map((dept) => {
                                const isDone = dept.percent_complete >= 100;
                                const isNone = dept.completed_steps === 0;
                                return (
                                  <div key={dept.department} className="flex items-center gap-0.5">
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDone ? 'bg-green-500' : isNone ? 'bg-gray-300 dark:bg-slate-500' : 'bg-blue-500 animate-pulse'}`} />
                                    <span className="text-xs font-semibold w-14 truncate" style={{ color: DEPARTMENT_BAR_COLORS[dept.department] || '#6b7280' }}>{dept.department}</span>
                                    <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                      <div className="h-2 rounded-full" style={{ width: `${dept.percent_complete}%`, backgroundColor: isDone ? '#16a34a' : (DEPARTMENT_BAR_COLORS[dept.department] || '#6b7280') }} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 w-8 text-right">{dept.percent_complete}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-300 dark:text-slate-600">—</div>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-gray-600 dark:text-slate-400">
                          <div className="truncate text-xs">{t.current_step || t.current_work_center || t.work_center || '—'}</div>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-700 dark:text-slate-300">{t.quantity}</div>
                          {(t.qty_accepted > 0 || t.qty_rejected > 0) && (
                            <div className="text-xs text-gray-400 dark:text-slate-500">
                              <span className="text-green-600">{t.qty_accepted}ok</span>
                              {t.qty_rejected > 0 && <span className="text-red-500 ml-0.5">{t.qty_rejected}rej</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400 font-mono truncate">
                          {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {getPriorityBadge(t.priority)}
                        </td>
                      </Link>
                    ))}
                  </tbody>
                </table>
                {displayedTravelers.length === 0 && (
                  <div className="text-center py-8">
                    <ClipboardDocumentListIcon className="w-8 h-8 text-gray-200 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-gray-400 dark:text-slate-500 text-xs font-medium">No travelers found</p>
                  </div>
                )}
              </div>
              {travelerTotalPages > 1 && (
                <div className="px-3 py-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 dark:text-slate-400">
                    {(safeTravelerPage - 1) * travelerPageSize + 1}-{Math.min(safeTravelerPage * travelerPageSize, filteredTravelers.length)} of {filteredTravelers.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTravelerPage(p => Math.max(1, p - 1))}
                      disabled={safeTravelerPage <= 1}
                      className="px-1.5 py-0.5 text-[10px] font-medium rounded border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Prev
                    </button>
                    {Array.from({ length: travelerTotalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setTravelerPage(p)}
                        className={`w-6 h-6 text-[10px] font-medium rounded border transition-colors ${p === safeTravelerPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setTravelerPage(p => Math.min(travelerTotalPages, p + 1))}
                      disabled={safeTravelerPage >= travelerTotalPages}
                      className="px-1.5 py-0.5 text-[10px] font-medium rounded border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Live Tracking + Alerts Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Live Labor Tracking */}
              <div className="bg-white dark:bg-slate-800 shadow-md rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="px-3 py-1.5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-gray-50/80 dark:bg-slate-900/50">
                  <div className="flex items-center gap-1.5">
                    <SignalIcon className="w-3.5 h-3.5 text-emerald-500" />
                    <h2 className="text-xs font-bold text-gray-700 dark:text-slate-300">Live Tracking</h2>
                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                      {liveUpdates.filter(u => u.is_active).length} live
                    </span>
                  </div>
                  <Link href="/labor-tracking" className="text-blue-600 dark:text-blue-400 text-[11px] font-semibold hover:underline">
                    View All
                  </Link>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50/50 dark:bg-slate-900/30">
                    <tr>
                      <th className="px-2 py-1 text-left text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">Job</th>
                      <th className="px-2 py-1 text-left text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">Location</th>
                      <th className="px-2 py-1 text-left text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">Operator</th>
                      <th className="px-2 py-1 text-left text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                    {liveUpdates.length > 0 ? liveUpdates.slice(0, 6).map((update, index) => (
                      <tr key={index} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-2 py-1 whitespace-nowrap">
                          <Link href={`/travelers?search=${encodeURIComponent(update.job_number)}`} className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline">
                            {update.job_number}
                          </Link>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-600 dark:text-slate-400">{update.work_center}</td>
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-600 dark:text-slate-400">{update.operator_name}</td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold ${update.is_active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400'}`}>
                            {update.is_active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            {update.is_active ? 'Active' : 'Done'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-2 py-4 text-center text-xs text-gray-400 dark:text-slate-500">No active production updates</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Alerts */}
              <div className="bg-white dark:bg-slate-800 shadow-md rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="px-3 py-1.5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-1.5 bg-gray-50/80 dark:bg-slate-900/50">
                  <BoltIcon className="w-3.5 h-3.5 text-amber-500" />
                  <h2 className="text-xs font-bold text-gray-700 dark:text-slate-300">Alerts & Actions</h2>
                </div>
                <div className="p-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { title: 'Pending', count: dashboardData.pending_approvals || 0, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', href: '/travelers?status=DRAFT' },
                      { title: 'On Hold', count: dashboardData.on_hold_travelers || 0, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', href: '/travelers?status=ON_HOLD' },
                      { title: 'Overdue', count: dashboardData.overdue_travelers || 0, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', href: '/travelers?view=active' },
                      { title: 'Active Labor', count: dashboardData.active_labor_entries || 0, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', href: '/labor-tracking' },
                    ].map((alert, i) => (
                      <Link key={i} href={alert.href} className={`${alert.bg} rounded-lg p-2 hover:shadow-sm transition-all`}>
                        <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase">{alert.title}</p>
                        <p className={`text-lg font-extrabold ${alert.color} leading-none mt-0.5`}>{alert.count}</p>
                      </Link>
                    ))}
                  </div>
                  {overdueJobs.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                      <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase mb-1.5">Overdue Jobs</p>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {overdueJobs.slice(0, 3).map((job) => (
                          <Link key={job.id} href={`/travelers/${job.id}`} className="flex items-center justify-between p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate">{job.job_number}</p>
                              <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{job.part_description}</p>
                            </div>
                            <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold whitespace-nowrap ml-2">{new Date(job.due_date).toLocaleDateString()}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white dark:bg-slate-800 shadow-md rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="px-3 py-1.5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-1.5 bg-gray-50/80 dark:bg-slate-900/50">
                  <ClockIcon className="w-3.5 h-3.5 text-blue-500" />
                  <h2 className="text-[11px] font-bold text-gray-700 dark:text-slate-300">Recent Activity</h2>
                </div>
                <div className="p-2 max-h-[220px] overflow-y-auto">
                  {(() => {
                    const events: { type: string; job: string; wc: string; op: string; time: Date }[] = [];
                    trackingEntries.forEach((entry) => {
                      if (entry.start_time) events.push({ type: 'start', job: entry.job_number, wc: entry.work_center, op: entry.employee_name || 'Unknown', time: new Date(entry.start_time) });
                      if (entry.end_time) events.push({ type: 'done', job: entry.job_number, wc: entry.work_center, op: entry.employee_name || 'Unknown', time: new Date(entry.end_time) });
                    });
                    events.sort((a, b) => b.time.getTime() - a.time.getTime());
                    const recent = events.slice(0, 8);
                    if (recent.length === 0) return <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center py-4">No recent activity</p>;
                    return (
                      <div className="space-y-1">
                        {recent.map((ev, i) => {
                          const diffMs = Date.now() - ev.time.getTime();
                          const diffMins = Math.floor(diffMs / 60000);
                          const timeStr = diffMins < 1 ? 'Now' : diffMins < 60 ? `${diffMins}m` : `${Math.floor(diffMins / 60)}h`;
                          return (
                            <div key={i} className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ev.type === 'start' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                              <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${ev.type === 'start' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                                {ev.type === 'start' ? 'IN' : 'OUT'}
                              </span>
                              <Link href={`/travelers?search=${encodeURIComponent(ev.job)}`} className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 hover:underline truncate">{ev.job}</Link>
                              <span className="text-[9px] text-gray-400 dark:text-slate-500 truncate">{ev.op}</span>
                              <span className="text-[9px] text-gray-400 dark:text-slate-500 ml-auto flex-shrink-0">{timeStr}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Stuck Travelers & Forecast Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <StuckTravelersCard data={dashboardData.stuck_travelers} />
              <ForecastCard data={dashboardData.forecast} />
            </div>

            {/* Work Center Utilization */}
            <div className="grid grid-cols-1 gap-4 mt-4">
              <WorkCenterUtilizationChart data={dashboardData.labor_by_work_center} />
            </div>

            {/* Labor Trends (full width) */}
            <div className="mt-4">
              <LaborTrendsChart data={dashboardData.labor_trend} departmentData={dashboardData.department_trend} />
            </div>

            {/* Work Center Status */}
            <div className="mt-4">
              <WorkCenterStatusCard liveUpdates={liveUpdates} />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
