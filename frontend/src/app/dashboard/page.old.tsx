'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DocumentTextIcon, ClockIcon, ChartBarIcon, CubeIcon, UserGroupIcon } from '@heroicons/react/24/outline';

// Import dashboard components
import DateRangePicker from './components/DateRangePicker';
import MetricsGrid from './components/MetricsGrid';
import StatusDistributionChart from './components/StatusDistributionChart';
import LaborTrendsChart from './components/LaborTrendsChart';
import WorkCenterUtilizationChart from './components/WorkCenterUtilizationChart';
import EmployeePerformanceChart from './components/EmployeePerformanceChart';
import AlertsSummaryCard from './components/AlertsSummaryCard';
import { API_BASE_URL } from '@/config/api';

interface Traveler {
  id: number;
  job_number: string;
  part_description: string;
  revision: string;
  status: string;
  work_center: string;
  created_at: string;
  quantity?: number;
  due_date?: string;
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

export default function Dashboard() {
  const { user } = useAuth();

  // Date range state for dashboard data
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to last 7 days
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());

  // Fetch dashboard data with custom hook
  const { data: dashboardData, loading, error, refetch } = useDashboardData(startDate, endDate);

  // Legacy data for existing tables
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);

  useEffect(() => {
    fetchTravelers();
    fetchLiveUpdates();

    const interval = setInterval(() => {
      fetchLiveUpdates();
    }, 3600000); // Refresh live updates every hour

    return () => clearInterval(interval);
  }, []);

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const fetchTravelers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/travelers/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nexus_token') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const activeTravelers = data.filter((t: Traveler & { is_active?: boolean }) => t.is_active !== false);
        setTravelers(activeTravelers.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching travelers:', error);
    }
  };

  const fetchLiveUpdates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tracking/?limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nexus_token') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const updates: LiveUpdate[] = data.map((entry: {
          job_number: string;
          work_center: string;
          operator_name: string;
          start_time: string;
          end_time?: string | null;
          hours_worked: number;
        }) => {
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

        setLiveUpdates(updates.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching live updates:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; dot: string }> = {
      'IN_PROGRESS': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
      'COMPLETED': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
      'ON_HOLD': { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' }
    };

    const statusInfo = statusMap[status] || statusMap['IN_PROGRESS'];
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot} mr-1.5 ${statusInfo.dot === 'bg-green-500' ? '' : 'animate-pulse'}`}></span>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
        {/* Dashboard Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <ChartBarIcon className="w-7 h-7 text-blue-600" />
                <span>Manufacturing Dashboard</span>
              </h1>
              <p className="text-sm text-gray-600">Real-time operations overview with analytics</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Link href="/travelers/new" className="inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md transition-all">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Traveler
              </Link>
              <Link href="/travelers/tracking" className="inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-semibold rounded-lg shadow-md transition-all">
                <CubeIcon className="w-4 h-4 mr-2" />
                Track Traveler
              </Link>
            </div>
          </div>

          {/* Date Range Picker */}
          <DateRangePicker startDate={startDate} endDate={endDate} onDateChange={handleDateChange} />
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">Error loading dashboard data: {error}</p>
            <button onClick={() => refetch()} className="mt-2 text-red-600 hover:text-red-800 text-sm font-semibold">
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && dashboardData && (
          <>
            {/* Metrics Grid */}
            <MetricsGrid data={dashboardData} />

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8">
              <StatusDistributionChart data={dashboardData.status_distribution} />
              <LaborTrendsChart data={dashboardData.labor_trend} />
            </div>

            {/* Work Center Utilization - Full Width */}
            <div className="mt-6 sm:mt-8">
              <WorkCenterUtilizationChart data={dashboardData.labor_by_work_center} />
            </div>

            {/* Employee Performance and Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8">
              <EmployeePerformanceChart data={dashboardData.top_employees} />
              <AlertsSummaryCard data={dashboardData} />
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 sm:p-6 mt-6 sm:mt-8">
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Quick Actions</h2>
            <p className="text-xs text-gray-500">Access your most important features</p>
          </div>
          <div className={`grid grid-cols-2 sm:grid-cols-3 ${user?.role === 'ADMIN' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3`}>
            <Link href="/travelers" className="group bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg p-4 transition-all">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">View Travelers</h3>
                  <p className="text-xs text-blue-100 mt-1">Browse travelers</p>
                </div>
              </div>
            </Link>

            <Link href="/travelers/tracking" className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-lg p-4 transition-all">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center">
                  <CubeIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Traveler Tracking</h3>
                  <p className="text-xs text-purple-100 mt-1">Track locations</p>
                </div>
              </div>
            </Link>

            <Link href="/labor-tracking" className="group bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-lg p-4 transition-all">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Labor Tracking</h3>
                  <p className="text-xs text-indigo-100 mt-1">Track hours</p>
                </div>
              </div>
            </Link>

            <Link href="/reports" className="group bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-lg p-4 transition-all">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Reports</h3>
                  <p className="text-xs text-green-100 mt-1">View reports</p>
                </div>
              </div>
            </Link>

            {user?.role === 'ADMIN' && (
              <Link href="/users" className="group bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-lg p-4 transition-all">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center">
                    <UserGroupIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Users</h3>
                    <p className="text-xs text-red-100 mt-1">Manage users</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Live Traveler Tracking Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 mt-6 sm:mt-8">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Live Traveler Tracking</h2>
            <p className="text-xs text-gray-500">Real-time work center activity</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Job Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Operator</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Entry Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Exit Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Time in Step</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {liveUpdates.map((update, index) => (
                  <tr key={index} className={`${update.is_active ? 'bg-green-50' : ''} hover:bg-gray-50 transition-colors`}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{update.job_number}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{update.work_center}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{update.operator_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{update.start_time}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{update.end_time}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{update.time_in_step}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{getStatusBadge(update.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Active Travelers Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 mt-6 sm:mt-8">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Recent Active Travelers</h2>
            <p className="text-xs text-gray-500">Most recently active travelers</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Job Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Part Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Work Center</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {travelers.map((traveler) => (
                  <tr key={traveler.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{traveler.job_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{traveler.part_description}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{getStatusBadge(traveler.status)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{traveler.work_center || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{traveler.quantity || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <Link href={`/travelers/${traveler.id}`} className="text-blue-600 hover:text-blue-800 font-semibold">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
