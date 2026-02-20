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

interface Traveler {
  id: number;
  job_number: string;
  part_description: string;
  status: string;
  due_date?: string;
  is_active?: boolean;
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

export default function Dashboard() {
  const { user } = useAuth();

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());

  const { data: dashboardData, loading, error, refetch } = useDashboardData(startDate, endDate);

  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [trackingEntries, setTrackingEntries] = useState<RawTrackingEntry[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);
  const [overdueJobs, setOverdueJobs] = useState<OverdueJob[]>([]);

  useEffect(() => {
    fetchTravelers();
    fetchTrackingEntries();

    const interval = setInterval(() => {
      fetchTrackingEntries();
    }, 300000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Derive overdue jobs from travelers
  useEffect(() => {
    const today = new Date();
    const overdue = travelers
      .filter((t) => {
        if (t.status !== 'IN_PROGRESS' || !t.due_date) return false;
        let dueDate: Date;
        if (t.due_date.indexOf('-') === 4) {
          dueDate = new Date(t.due_date + 'T23:59:59');
        } else {
          dueDate = new Date(t.due_date);
        }
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
  }, [travelers]);

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const fetchTravelers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/travelers/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTravelers(data.filter((t: Traveler) => t.is_active !== false));
      }
    } catch (err) {
      console.error('Error fetching travelers:', err);
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

        // Derive liveUpdates for the tracking table
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
    const statusMap: Record<string, { bg: string; text: string; dot: string }> = {
      'IN_PROGRESS': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
      'COMPLETED': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
      'ON_HOLD': { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
      'DRAFT': { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' }
    };

    const statusInfo = statusMap[status] || statusMap['IN_PROGRESS'];
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot} mr-1.5 ${status === 'COMPLETED' ? '' : 'animate-pulse'}`}></span>
        {status.replace('_', ' ')}
      </span>
    );
  };

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
          {/* Background pattern */}
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

            {/* Labor & Tracking Section */}
            <div className="flex items-center gap-3 mt-8 mb-3">
              <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg">
                <SignalIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Labor & Tracking</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-emerald-200 to-transparent" />
            </div>
            <TodaySnapshotGrid entries={trackingEntries} />

            {/* Charts Row */}
            <div className="flex items-center gap-3 mt-8 mb-3">
              <div className="flex items-center gap-2 bg-violet-100 text-violet-700 px-3 py-1.5 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                <span className="text-xs font-bold uppercase tracking-wider">Analytics</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-violet-200 to-transparent" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <StatusDistributionChart data={dashboardData.status_distribution} />
              <WorkCenterUtilizationChart data={dashboardData.labor_by_work_center} />
            </div>

            {/* Labor Trends */}
            <div className="mt-6 sm:mt-8">
              <LaborTrendsChart data={dashboardData.labor_trend} />
            </div>

            {/* Live Status + Alerts */}
            <div className="flex items-center gap-3 mt-8 mb-3">
              <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span className="text-xs font-bold uppercase tracking-wider">Live Operations</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-amber-200 to-transparent" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <WorkCenterStatusCard liveUpdates={liveUpdates} />
              <AlertsSummaryCard data={dashboardData} overdueJobs={overdueJobs} />
            </div>

            {/* Live Tracking Table + Activity Feed */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
              {/* Live Tracking Table */}
              <div className="xl:col-span-2 bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
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
                  {liveUpdates.length > 0 && (
                    <span className="relative z-10 bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                      {liveUpdates.filter(u => u.is_active).length} live
                    </span>
                  )}
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
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{update.job_number}</td>
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

              {/* Recent Activity Feed */}
              <RecentActivityFeed entries={trackingEntries} />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
