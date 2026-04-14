'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CubeIcon, ClockIcon, CheckCircleIcon, Squares2X2Icon, MapPinIcon, ChartBarIcon, PlayIcon } from '@heroicons/react/24/outline';
import { ClipboardDocumentListIcon, WrenchScrewdriverIcon, BoltIcon } from '@heroicons/react/24/solid';
import { API_BASE_URL } from '@/config/api';

interface TrackingEntry {
  id?: number;
  job_number: string;
  work_center: string;
  employee_name: string;
  start_time: string;
  end_time: string | null;
  hours_worked: number;
}

interface AssignedTraveler {
  id: number;
  job_number: string;
  part_number: string;
  part_description: string;
  status: string;
  priority: string;
  percent_complete: number;
  total_steps: number;
  completed_steps: number;
  due_date?: string;
  work_center?: string;
}

interface OperatorDashboardProps {
  username: string;
  firstName?: string;
}

export default function OperatorDashboard({ username, firstName }: OperatorDashboardProps) {
  const [recentActivity, setRecentActivity] = useState<TrackingEntry[]>([]);
  const [activeTimers, setActiveTimers] = useState<TrackingEntry[]>([]);
  const [assignedTravelers, setAssignedTravelers] = useState<AssignedTraveler[]>([]);
  const [todayStats, setTodayStats] = useState({ tracked: 0, completed: 0, hoursWorked: 0, activeNow: 0 });
  const [weekStats, setWeekStats] = useState({ totalEntries: 0, totalHours: 0, avgPerDay: 0, completedJobs: 0 });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick every second for live timer display
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  useEffect(() => {
    fetchMyActivity();
    fetchAssignedTravelers();
    const interval = setInterval(() => { fetchMyActivity(); fetchAssignedTravelers(); }, 120000); // 2 min
    return () => clearInterval(interval);
  }, []);

  const isMyEntry = (entry: TrackingEntry) => {
    const name = (entry.employee_name || '').toLowerCase().trim();
    const uname = username.toLowerCase().trim();
    const fname = (firstName || '').toLowerCase().trim();
    return name === uname || (fname && name === fname);
  };

  const fetchMyActivity = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/labor/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token') || ''}` }
      });
      if (response.ok) {
        const data: TrackingEntry[] = await response.json();
        const myEntries = data.filter(isMyEntry);

        // Active timers (no end_time)
        setActiveTimers(myEntries.filter(e => !e.end_time));

        // Recent completed (has end_time)
        setRecentActivity(myEntries.slice(0, 10));

        // Today's stats
        const today = new Date().toDateString();
        const todayEntries = myEntries.filter(e => new Date(e.start_time).toDateString() === today);
        setTodayStats({
          tracked: todayEntries.length,
          completed: todayEntries.filter(e => e.end_time).length,
          hoursWorked: todayEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0),
          activeNow: todayEntries.filter(e => !e.end_time).length
        });

        // Week stats
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekEntries = myEntries.filter(e => new Date(e.start_time) >= weekAgo);
        const weekHours = weekEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
        const daysWithWork = new Set(weekEntries.map(e => new Date(e.start_time).toDateString())).size;
        setWeekStats({
          totalEntries: weekEntries.length,
          totalHours: weekHours,
          avgPerDay: daysWithWork > 0 ? weekHours / daysWithWork : 0,
          completedJobs: new Set(weekEntries.filter(e => e.end_time).map(e => e.job_number)).size,
        });
      }
    } catch (err) {
      console.error('Error fetching activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedTravelers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/travelers/dashboard-summary`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Show in-progress travelers
        const inProgress = (data as AssignedTraveler[])
          .filter((t: AssignedTraveler) => t.status === 'IN_PROGRESS' || t.status === 'CREATED')
          .slice(0, 8);
        setAssignedTravelers(inProgress);
      }
    } catch (err) {
      console.error('Error fetching travelers:', err);
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

  const formatElapsed = (startTime: string) => {
    const diffMs = now.getTime() - new Date(startTime).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return '#16a34a';
    if (percent >= 75) return '#2563eb';
    if (percent >= 50) return '#f59e0b';
    return '#f97316';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'URGENT') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (priority === 'PREMIUM') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    if (priority === 'HIGH') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-4">
      {/* Header */}
      <div className="mb-6 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                <Squares2X2Icon className="w-7 h-7 text-teal-300" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">Welcome, {firstName || username}!</h1>
                <p className="text-sm text-teal-200/80 mt-0.5">Track your work and view your activity</p>
              </div>
            </div>
            <Link href="/labor-tracking" className="inline-flex items-center justify-center px-5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-bold rounded-xl border border-white/25 shadow-lg transition-all duration-200 hover:-translate-y-0.5 gap-2">
              <MapPinIcon className="w-5 h-5" />
              Track Traveler
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Row - 4 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 dark:text-slate-400 uppercase font-semibold">Active Timers</p>
            <div className="bg-gradient-to-br from-red-500 to-orange-600 p-1.5 rounded-lg">
              <PlayIcon className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-slate-200">{todayStats.activeNow}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 dark:text-slate-400 uppercase font-semibold">Tracked Today</p>
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-1.5 rounded-lg">
              <CubeIcon className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-slate-200">{todayStats.tracked}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 dark:text-slate-400 uppercase font-semibold">Completed</p>
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-1.5 rounded-lg">
              <CheckCircleIcon className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-slate-200">{todayStats.completed}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 dark:text-slate-400 uppercase font-semibold">Hours Today</p>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-lg">
              <ClockIcon className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-slate-200">{todayStats.hoursWorked.toFixed(1)}</p>
        </div>
      </div>

      {/* Active Timers Section */}
      {activeTimers.length > 0 && (
        <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 border-emerald-200 dark:border-emerald-800 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-2.5 flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            <h2 className="text-sm font-bold text-white">Active Timers</h2>
            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{activeTimers.length} running</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {activeTimers.map((timer, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between bg-emerald-50/30 dark:bg-emerald-900/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center">
                    <CubeIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <Link href={`/travelers?search=${encodeURIComponent(timer.job_number)}`} className="font-bold text-gray-800 dark:text-slate-200 hover:text-blue-600 transition-colors">
                      {timer.job_number}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{timer.work_center}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatElapsed(timer.start_time)}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500">Started {formatTime(timer.start_time)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column: Assigned Travelers + Weekly Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Assigned / In-Progress Travelers */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-3 py-2 relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardDocumentListIcon className="w-4 h-4 text-teal-300" />
                <h2 className="text-sm font-bold text-white">Active Travelers</h2>
              </div>
              <Link href="/travelers?status=IN_PROGRESS" className="text-[10px] text-teal-200 hover:text-white font-semibold">View All</Link>
            </div>
          </div>
          {assignedTravelers.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardDocumentListIcon className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-gray-400 dark:text-slate-500">No active travelers</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-slate-700">
              {assignedTravelers.map((t) => (
                <Link key={t.id} href={`/travelers/${t.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                  {/* Progress circle */}
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="17" fill="none" stroke="#e5e7eb" strokeWidth="2.5" className="dark:stroke-slate-600" />
                      <circle cx="20" cy="20" r="17" fill="none"
                        stroke={getProgressColor(t.percent_complete)}
                        strokeWidth="2.5" strokeLinecap="round"
                        strokeDasharray={`${t.percent_complete * 1.068} 106.8`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold text-gray-700 dark:text-slate-300">{t.percent_complete}%</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-400 truncate">{t.job_number}</span>
                      {t.priority !== 'NORMAL' && (
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{t.part_number} - {t.part_description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">{t.completed_steps}/{t.total_steps} steps</p>
                    {t.due_date && <p className="text-[10px] text-gray-400 dark:text-slate-500">{new Date(t.due_date).toLocaleDateString()}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Weekly Performance Summary */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-800 px-3 py-2 relative overflow-hidden">
            <div className="relative z-10 flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4 text-purple-300" />
              <h2 className="text-sm font-bold text-white">Your Week (Last 7 Days)</h2>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">{weekStats.totalHours.toFixed(1)}</p>
                <p className="text-[10px] uppercase font-semibold text-indigo-500/70 dark:text-indigo-400/70">Total Hours</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-extrabold text-purple-700 dark:text-purple-300">{weekStats.totalEntries}</p>
                <p className="text-[10px] uppercase font-semibold text-purple-500/70 dark:text-purple-400/70">Total Entries</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{weekStats.completedJobs}</p>
                <p className="text-[10px] uppercase font-semibold text-emerald-500/70 dark:text-emerald-400/70">Jobs Worked</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300">{weekStats.avgPerDay.toFixed(1)}</p>
                <p className="text-[10px] uppercase font-semibold text-amber-500/70 dark:text-amber-400/70">Avg Hrs/Day</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-3 py-2.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-white/15 backdrop-blur-sm p-2 rounded-xl border border-white/20">
              <ClockIcon className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Recent Activity</h2>
              <p className="text-xs text-teal-200/80">Your tracking history</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="text-center py-12">
            <CubeIcon className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-slate-400">No tracking activity yet</p>
            <Link href="/labor-tracking" className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm mt-2 inline-block">
              Start tracking &rarr;
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {recentActivity.map((entry, index) => (
              <div key={index} className={`px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${!entry.end_time ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${!entry.end_time ? 'bg-gradient-to-br from-teal-600 to-emerald-700' : 'bg-gray-200 dark:bg-slate-600'}`}>
                      <CubeIcon className={`w-5 h-5 ${!entry.end_time ? 'text-white' : 'text-gray-500 dark:text-slate-400'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-slate-200">{entry.job_number}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{entry.work_center}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      {formatDate(entry.start_time)} &bull; {formatTime(entry.start_time)}
                      {entry.end_time && ` - ${formatTime(entry.end_time)}`}
                    </p>
                    {!entry.end_time ? (
                      <span className="inline-flex items-center text-xs font-semibold text-indigo-600">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full mr-1.5 animate-pulse"></span>
                        In Progress
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-slate-400">{entry.hours_worked?.toFixed(1) || '0.0'} hrs</span>
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
