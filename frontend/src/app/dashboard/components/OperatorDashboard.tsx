'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CubeIcon, ClockIcon, CheckCircleIcon, PlayIcon, Squares2X2Icon, MapPinIcon } from '@heroicons/react/24/outline';
import { ClipboardDocumentListIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/solid';
import { API_BASE_URL } from '@/config/api';

interface TrackingEntry {
  id?: number;
  job_number: string;
  work_center: string;
  operator_name: string;
  start_time: string;
  end_time: string | null;
  hours_worked: number;
}

interface OperatorDashboardProps {
  username: string;
  firstName?: string;
}

export default function OperatorDashboard({ username, firstName }: OperatorDashboardProps) {
  const [recentActivity, setRecentActivity] = useState<TrackingEntry[]>([]);
  const [todayStats, setTodayStats] = useState({ tracked: 0, completed: 0, hoursWorked: 0, activeNow: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyActivity();
    const interval = setInterval(fetchMyActivity, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchMyActivity = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tracking/?limit=50`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token') || ''}` }
      });
      if (response.ok) {
        const data: TrackingEntry[] = await response.json();

        // Filter to only this operator's entries
        const myEntries = data.filter(e => {
          const name = e.operator_name.toLowerCase().trim();
          const uname = username.toLowerCase().trim();
          const fname = (firstName || '').toLowerCase().trim();
          return name === uname || (fname && name === fname);
        });

        setRecentActivity(myEntries.slice(0, 10));

        // Calculate today's stats
        const today = new Date().toDateString();
        const todayEntries = myEntries.filter(e => new Date(e.start_time).toDateString() === today);

        setTodayStats({
          tracked: todayEntries.length,
          completed: todayEntries.filter(e => e.end_time).length,
          hoursWorked: todayEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0),
          activeNow: todayEntries.filter(e => !e.end_time).length
        });
      }
    } catch (err) {
      console.error('Error fetching activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      {/* Header - matching navbar gradient with decorative bubbles */}
      <div className="mb-6 sm:mb-8 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white rounded-2xl p-5 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative white circle bubbles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-0 left-2/3 w-24 h-24 bg-white rounded-full -translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                <Squares2X2Icon className="w-7 h-7 text-blue-300" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Welcome, {firstName || username}!
                </h1>
                <p className="text-sm text-blue-200/80 mt-0.5">Track your work and view your activity</p>
              </div>
            </div>
            <Link
              href="/travelers/tracking"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-bold rounded-xl border border-white/25 shadow-lg transition-all duration-200 hover:-translate-y-0.5 gap-2"
            >
              <MapPinIcon className="w-5 h-5" />
              Track Traveler
            </Link>
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 group hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Tracked Today</p>
              <p className="text-2xl font-bold text-gray-800">{todayStats.tracked}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:scale-110 transition-transform">
              <CubeIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 group hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Completed</p>
              <p className="text-2xl font-bold text-gray-800">{todayStats.completed}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 group-hover:scale-110 transition-transform">
              <CheckCircleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 group hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Hours Logged</p>
              <p className="text-2xl font-bold text-gray-800">{todayStats.hoursWorked.toFixed(1)}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 group-hover:scale-110 transition-transform">
              <ClockIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 group hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Active Now</p>
              <p className="text-2xl font-bold text-gray-800">{todayStats.activeNow}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 group-hover:scale-110 transition-transform">
              <PlayIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Link href="/travelers/tracking" className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-all border border-gray-100 group">
          <div className="flex items-center gap-4">
            <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 shadow group-hover:scale-110 transition-transform">
              <CubeIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Scan Traveler</h3>
              <p className="text-sm text-gray-500">Start or end tracking</p>
            </div>
          </div>
        </Link>

        <Link href="/travelers" className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-all border border-gray-100 group">
          <div className="flex items-center gap-4">
            <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 shadow group-hover:scale-110 transition-transform">
              <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">View Travelers</h3>
              <p className="text-sm text-gray-500">Browse all travelers</p>
            </div>
          </div>
        </Link>

        <Link href="/labor-tracking" className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-all border border-gray-100 group">
          <div className="flex items-center gap-4">
            <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 shadow group-hover:scale-110 transition-transform">
              <WrenchScrewdriverIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Labor Tracking</h3>
              <p className="text-sm text-gray-500">Log work hours</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 px-5 sm:px-6 py-4 relative overflow-hidden">
          {/* Decorative bubbles */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/4 w-16 h-16 bg-white/10 rounded-full translate-y-1/2" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-white/15 backdrop-blur-sm p-2 rounded-xl border border-white/20">
              <ClockIcon className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Your Recent Activity</h2>
              <p className="text-xs text-blue-200/80">Your tracking history</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="text-center py-12">
            <CubeIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No tracking activity yet</p>
            <Link href="/travelers/tracking" className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm mt-2 inline-block">
              Start tracking →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentActivity.map((entry, index) => (
              <div key={index} className={`px-5 py-4 hover:bg-gray-50 transition-colors ${!entry.end_time ? 'bg-indigo-50/50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${!entry.end_time ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gray-200'}`}>
                      <CubeIcon className={`w-5 h-5 ${!entry.end_time ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{entry.job_number}</p>
                      <p className="text-sm text-gray-500">{entry.work_center}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {formatDate(entry.start_time)} • {formatTime(entry.start_time)}
                      {entry.end_time && ` - ${formatTime(entry.end_time)}`}
                    </p>
                    {!entry.end_time ? (
                      <span className="inline-flex items-center text-xs font-semibold text-indigo-600">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full mr-1.5 animate-pulse"></span>
                        In Progress
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">{entry.hours_worked?.toFixed(1) || '0.0'} hrs</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
