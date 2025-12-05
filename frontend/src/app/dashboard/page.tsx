'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { DocumentTextIcon, ClockIcon, ChartBarIcon, CheckCircleIcon, PlayIcon, ArrowTrendingUpIcon, CubeIcon, UserGroupIcon } from '@heroicons/react/24/outline';

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
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);
  const [stats, setStats] = useState({
    inProgress: 0,
    completed: 0,
  });

  useEffect(() => {
    fetchTravelers();
    // Fetch live updates every 1 hour
    const interval = setInterval(() => {
      fetchLiveUpdates();
    }, 3600000); // 3600000ms = 1 hour

    fetchLiveUpdates(); // Initial fetch

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTravelers = async () => {
    try {
      const response = await fetch('http://acidashboard.aci.local:100/api/travelers/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const activeTravelers = data.filter((t: Traveler & { is_active?: boolean }) => t.is_active !== false);

        // Calculate stats from ALL travelers
        const inProgress = activeTravelers.filter((t: Traveler) =>
          t.status === 'IN_PROGRESS'
        ).length;

        const completed = activeTravelers.filter((t: Traveler) =>
          t.status === 'COMPLETED'
        ).length;

        // Set recent 5 for display in table
        setTravelers(activeTravelers.slice(0, 5));

        // Set stats calculated from ALL travelers
        setStats({
          inProgress,
          completed,
        });
      }
    } catch (error) {
      console.error('Error fetching travelers:', error);
    }
  };

  const fetchLiveUpdates = async () => {
    try {
      const response = await fetch('http://acidashboard.aci.local:100/api/tracking/?limit=20', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Map tracking entries to live updates format
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
          const isActive = !entry.end_time; // No end_time means still in progress

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

        // Sort: active entries first, then by start time descending
        updates.sort((a, b) => {
          if (a.is_active && !b.is_active) return -1;
          if (!a.is_active && b.is_active) return 1;
          return 0;
        });

        setLiveUpdates(updates.slice(0, 10)); // Show top 10
      }
    } catch (error) {
      console.error('Error fetching live updates:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; dot: string }> = {
      'IN_PROGRESS': {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        dot: 'bg-blue-500'
      },
      'COMPLETED': {
        bg: 'bg-green-50',
        text: 'text-green-700',
        dot: 'bg-green-500'
      },
      'ON_HOLD': {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        dot: 'bg-yellow-500'
      }
    };

    const statusInfo = statusMap[status] || statusMap['IN_PROGRESS'];
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot} mr-1.5`}></span>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="w-full space-y-4 p-4 lg:p-6">
          {/* Dashboard Header */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1 flex items-center space-x-2">
                  <ChartBarIcon className="w-7 h-7 text-white" />
                  <span>Manufacturing Dashboard</span>
                </h1>
                <p className="text-sm text-blue-100">Real-time operations overview</p>
              </div>
              <div className="hidden md:flex space-x-3">
                <Link href="/travelers/new" className="inline-flex items-center px-4 py-2.5 bg-white text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors shadow-md">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Traveler
                </Link>
                <Link href="/travelers/tracking" className="inline-flex items-center px-4 py-2.5 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors shadow-md">
                  <CubeIcon className="w-4 h-4 mr-2" />
                  Track Traveler
                </Link>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* In Progress */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-blue-100 mb-1 uppercase tracking-wide">In Progress</dt>
                    <dd className="text-4xl font-bold text-white">{stats.inProgress}</dd>
                    <p className="text-xs text-blue-100 mt-2 flex items-center">
                      <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                      Active travelers
                    </p>
                  </div>
                  <div className="flex-shrink-0 bg-white/20 p-3 rounded-lg">
                    <DocumentTextIcon className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Completed */}
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <dt className="text-sm font-medium text-green-100 mb-1 uppercase tracking-wide">Completed</dt>
                    <dd className="text-4xl font-bold text-white">{stats.completed}</dd>
                    <p className="text-xs text-green-100 mt-2">Total completed travelers</p>
                  </div>
                  <div className="flex-shrink-0 bg-white/20 p-3 rounded-lg">
                    <CheckCircleIcon className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
              <p className="text-xs text-gray-500">Access your most important features</p>
            </div>
            <div className={`grid grid-cols-2 sm:grid-cols-3 ${user?.role === 'ADMIN' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3`}>
              {/* View Travelers Card */}
              <Link href="/travelers" className="group bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg p-4 transition-colors">
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

              {/* Traveler Tracking Card */}
              <Link href="/travelers/tracking" className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-lg p-4 transition-colors">
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

              {/* Labor Tracking Card */}
              <Link href="/labor-tracking" className="group bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-lg p-4 transition-colors">
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

              {/* Reports Card */}
              <Link href="/reports" className="group bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-lg p-4 transition-colors">
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

              {/* User Management Card - Admin Only */}
              {user?.role === 'ADMIN' && (
                <Link href="/users" className="group bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-lg p-4 transition-colors">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center">
                      <UserGroupIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">User Management</h3>
                      <p className="text-xs text-orange-100 mt-1">Manage users</p>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Live Traveler Tracking */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Live Traveler Tracking</h2>
                    <p className="text-xs text-gray-500">Real-time traveler location and work center activity</p>
                  </div>
                </div>
                <Link
                  href="/travelers/tracking"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                >
                  <span>View All</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entered At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exited At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time in Step</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {liveUpdates.length > 0 ? (
                    liveUpdates.map((update, index) => (
                      <tr key={index} className={`hover:bg-blue-50 transition-colors ${update.is_active ? 'bg-green-50' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-semibold text-blue-600 flex items-center space-x-2">
                            {update.is_active && <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                            <span>{update.job_number}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                            {update.work_center}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{update.operator_name}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-700">{update.start_time}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-sm ${update.is_active ? 'text-green-600 font-semibold' : 'text-gray-700'}`}>
                            {update.end_time}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {update.is_active && (
                              <svg className="w-4 h-4 text-orange-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            <span className="text-sm font-medium text-gray-900">{update.time_in_step}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            update.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${update.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                            {update.is_active ? 'In Progress' : 'Completed'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center">
                        <div className="text-gray-400">
                          <svg className="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-sm">No tracking entries found</p>
                          <p className="text-xs mt-1">Start tracking on the Traveler Tracking page</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Travelers */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Active Travelers</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Center</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {travelers.map((traveler) => (
                    <tr key={traveler.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{traveler.job_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{traveler.part_description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(traveler.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{traveler.work_center}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{traveler.quantity || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link
                          href={`/travelers/${traveler.job_number}`}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                        >
                          View
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
