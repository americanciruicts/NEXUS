'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config/api';
import {
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckBadgeIcon,
  DocumentChartBarIcon,
  FunnelIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface Anomaly {
  type: string;
  severity: string;
  entry_id: number;
  job_number: string;
  employee_name: string;
  work_center: string;
  hours_running: number;
  start_time: string;
  message: string;
}

interface DueDateItem {
  id: number;
  job_number: string;
  part_number: string;
  due_date: string;
  days_until: number;
  urgency: string;
  status: string;
  priority: string;
  percent_complete: number;
  total_steps: number;
  completed_steps: number;
}

interface EstVsActualItem {
  id: number;
  job_number: string;
  part_number: string;
  status: string;
  estimated_hours: number;
  actual_hours: number;
  variance_hours: number;
  variance_percent: number;
  steps: { operation: string; estimated: number; actual: number; variance: number; is_completed: boolean }[];
}

interface YieldItem {
  id: number;
  job_number: string;
  part_number: string;
  quantity: number;
  accepted: number;
  rejected: number;
  yield_rate: number;
  status: string;
}

interface DeptYield {
  department: string;
  accepted: number;
  rejected: number;
  yield_rate: number;
}

interface DailySummary {
  date: string;
  entries_started: number;
  entries_completed: number;
  hours_logged: number;
  steps_completed: number;
  travelers_completed: number;
  active_timers: number;
  paused_timers: number;
  unique_operators: number;
  work_center_breakdown: { work_center: string; hours: number; entries: number }[];
  top_operators: { name: string; hours: number; entries: number }[];
}

interface Bottleneck {
  work_center: string;
  avg_hours: number;
  max_hours: number;
  total_hours: number;
  entry_count: number;
  active_now: number;
  waiting_travelers: number;
  bottleneck_score: number;
}

interface OperatorScorecard {
  id: number;
  name: string;
  total_entries: number;
  completed_entries: number;
  total_hours: number;
  avg_hours_per_entry: number;
  avg_hours_per_day: number;
  steps_completed: number;
  unique_jobs: number;
  active_days: number;
  total_pauses: number;
  total_pause_minutes: number;
  pause_percent: number;
}

interface AnalyticsData {
  anomalies: Anomaly[];
  due_date_heatmap: DueDateItem[];
  est_vs_actual: EstVsActualItem[];
  yield_data: YieldItem[];
  department_yield: DeptYield[];
  daily_summary: DailySummary;
  bottlenecks: Bottleneck[];
  operator_scorecards: OperatorScorecard[];
}

// Collapsible section wrapper
function Section({ title, icon, badge, children, defaultOpen = true, headerGradient }: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  headerGradient?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasGradient = !!headerGradient;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full px-4 py-3 flex items-center justify-between transition-all duration-200 relative overflow-hidden ${
          hasGradient
            ? `bg-gradient-to-br ${headerGradient}`
            : 'bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-750 hover:from-teal-50 hover:to-emerald-50 dark:hover:from-slate-700 dark:hover:to-slate-700'
        }`}
      >
        {hasGradient && (
          <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
          </div>
        )}
        <div className="flex items-center gap-2 relative z-10">
          {icon}
          <h2 className={`text-sm font-bold ${hasGradient ? 'text-white' : 'text-gray-800 dark:text-slate-100'}`}>{title}</h2>
          {badge}
        </div>
        {open
          ? <ChevronUpIcon className={`w-4 h-4 relative z-10 ${hasGradient ? 'text-white/70' : 'text-gray-500 dark:text-slate-400'}`} />
          : <ChevronDownIcon className={`w-4 h-4 relative z-10 ${hasGradient ? 'text-white/70' : 'text-gray-500 dark:text-slate-400'}`} />
        }
      </button>
      {open && <div className="border-t border-gray-100 dark:border-slate-700">{children}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('nexus_token');
      const res = await fetch(`${API_BASE_URL}/analytics/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const urgencyColors: Record<string, { bg: string; text: string; label: string }> = {
    overdue: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Overdue' },
    due_today: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', label: 'Due Today' },
    critical: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', label: '1-2 Days' },
    warning: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: '3-5 Days' },
    upcoming: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', label: '6-10 Days' },
    on_track: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', label: '10+ Days' },
  };

  const severityColors: Record<string, { bg: string; text: string; dot: string }> = {
    high: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
    medium: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
    low: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-400' },
  };

  if (loading) {
    return (
      <Layout fullWidth>
        <div className="flex flex-col items-center justify-center py-24">
          <ArrowPathIcon className="w-10 h-10 text-blue-500 animate-spin mb-3" />
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading analytics...</p>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout fullWidth>
        <div className="p-6">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200">
            <p className="text-red-700 dark:text-red-300 text-sm font-semibold">Error: {error}</p>
            <button onClick={fetchData} className="mt-2 text-xs font-bold text-red-600 underline">Retry</button>
          </div>
        </div>
      </Layout>
    );
  }

  const { anomalies, due_date_heatmap, est_vs_actual, yield_data, department_yield, daily_summary, bottlenecks, operator_scorecards } = data;

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-3 sm:p-5">
        {/* Header */}
        <div className="mb-4 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white rounded-xl p-4 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/4 w-20 h-20 bg-white rounded-full translate-y-1/2" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/reports" className="bg-white/15 hover:bg-white/25 backdrop-blur-sm p-2 rounded-lg border border-white/20 transition-colors">
                <ArrowLeftIcon className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight">Production Analytics</h1>
                <p className="text-xs text-teal-200/80">Labor anomalies, due dates, efficiency, yield, bottlenecks & operator performance</p>
              </div>
            </div>
            <button onClick={fetchData} className="bg-white/15 hover:bg-white/25 backdrop-blur-sm p-2 rounded-lg border border-white/20 transition-colors">
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4">

          {/* ===== 1. DAILY SUMMARY ===== */}
          <Section
            title="Daily Summary"
            icon={<DocumentChartBarIcon className="w-4 h-4 text-white" />}
            headerGradient="from-indigo-600 via-indigo-700 to-purple-800"
            badge={<span className="text-[10px] font-bold text-indigo-200/80">{new Date().toLocaleDateString()}</span>}
          >
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 mb-4">
                {[
                  { label: 'Started', value: daily_summary.entries_started, color: 'text-blue-600' },
                  { label: 'Completed', value: daily_summary.entries_completed, color: 'text-green-600' },
                  { label: 'Hours', value: `${daily_summary.hours_logged}h`, color: 'text-purple-600' },
                  { label: 'Steps Done', value: daily_summary.steps_completed, color: 'text-teal-600' },
                  { label: 'Jobs Done', value: daily_summary.travelers_completed, color: 'text-emerald-600' },
                  { label: 'Active', value: daily_summary.active_timers, color: 'text-orange-600' },
                  { label: 'Paused', value: daily_summary.paused_timers, color: 'text-amber-600' },
                  { label: 'Operators', value: daily_summary.unique_operators, color: 'text-cyan-600' },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2.5 text-center border border-gray-100 dark:border-slate-600">
                    <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">{item.label}</p>
                    <p className={`text-xl font-extrabold ${item.color} leading-tight`}>{item.value}</p>
                  </div>
                ))}
              </div>

              {daily_summary.work_center_breakdown.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-2">Hours by Work Center</p>
                    <div className="space-y-1.5">
                      {daily_summary.work_center_breakdown.map((wc) => {
                        const maxHours = Math.max(...daily_summary.work_center_breakdown.map(w => w.hours));
                        const pct = maxHours > 0 ? (wc.hours / maxHours * 100) : 0;
                        return (
                          <div key={wc.work_center} className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-700 dark:text-slate-300 w-28 truncate">{wc.work_center}</span>
                            <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                              <div className="h-3 rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-bold text-gray-700 dark:text-slate-300 w-12 text-right">{wc.hours}h</span>
                            <span className="text-[10px] text-gray-400 w-6 text-right">{wc.entries}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {daily_summary.top_operators.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-2">Top Operators Today</p>
                      <div className="space-y-1.5">
                        {daily_summary.top_operators.map((op, i) => (
                          <div key={op.name} className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-300'}`}>{i + 1}</span>
                            <span className="text-xs font-medium text-gray-700 dark:text-slate-300 flex-1 truncate">{op.name}</span>
                            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{op.hours}h</span>
                            <span className="text-[10px] text-gray-400">{op.entries} entries</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>

          {/* ===== 2. LABOR ANOMALY DETECTION ===== */}
          <Section
            title="Labor Anomaly Detection"
            icon={<ExclamationTriangleIcon className="w-4 h-4 text-white" />}
            headerGradient="from-red-600 via-red-700 to-rose-800"
            badge={anomalies.length > 0 ? (
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {anomalies.length} {anomalies.length === 1 ? 'issue' : 'issues'}
              </span>
            ) : (
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">All clear</span>
            )}
          >
            <div className="p-3">
              {anomalies.length === 0 ? (
                <p className="text-sm text-green-600 dark:text-green-400 text-center py-4 font-medium">No anomalies detected. All labor data looks healthy.</p>
              ) : (
                <div className="space-y-2">
                  {anomalies.map((a, i) => {
                    const sev = severityColors[a.severity] || severityColors.low;
                    return (
                      <div key={i} className={`${sev.bg} rounded-lg p-3 border border-transparent`}>
                        <div className="flex items-start gap-2">
                          <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${sev.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-bold ${sev.text} uppercase`}>
                                {a.type === 'forgotten_clockout' ? 'Forgotten Clock-Out' : a.type === 'suspiciously_short' ? 'Suspiciously Short' : 'Unusually Long'}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sev.bg} ${sev.text} border border-current/10`}>{a.severity}</span>
                            </div>
                            <p className="text-xs text-gray-700 dark:text-slate-300 mt-0.5">{a.message}</p>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 dark:text-slate-500">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">{a.job_number}</span>
                              <span>{a.employee_name}</span>
                              <span>{a.work_center}</span>
                              {a.start_time && <span>{new Date(a.start_time).toLocaleString()}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Section>

          {/* ===== 3. DUE DATE HEATMAP ===== */}
          <Section
            title="Due Date Heatmap"
            icon={<CalendarDaysIcon className="w-4 h-4 text-white" />}
            headerGradient="from-amber-600 via-amber-700 to-orange-800"
            badge={
              <span className="text-[10px] font-bold text-amber-200/80">
                {due_date_heatmap.filter(d => d.urgency === 'overdue').length} overdue,{' '}
                {due_date_heatmap.filter(d => ['due_today', 'critical'].includes(d.urgency)).length} critical
              </span>
            }
          >
            <div className="p-3">
              {/* Urgency summary cards */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                {['overdue', 'due_today', 'critical', 'warning', 'upcoming', 'on_track'].map(urg => {
                  const uc = urgencyColors[urg];
                  const count = due_date_heatmap.filter(d => d.urgency === urg).length;
                  return (
                    <div key={urg} className={`${uc.bg} rounded-lg p-2 text-center`}>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">{uc.label}</p>
                      <p className={`text-lg font-extrabold ${uc.text} leading-tight`}>{count}</p>
                    </div>
                  );
                })}
              </div>

              {/* Table */}
              {due_date_heatmap.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 dark:bg-slate-900">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Job</th>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Part</th>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Due Date</th>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Days</th>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Urgency</th>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                      {due_date_heatmap.map(d => {
                        const uc = urgencyColors[d.urgency] || urgencyColors.on_track;
                        return (
                          <tr key={d.id} className="hover:bg-blue-50 dark:hover:bg-slate-700">
                            <td className="px-2 py-1.5">
                              <Link href={`/travelers/${d.id}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">{d.job_number}</Link>
                            </td>
                            <td className="px-2 py-1.5 text-gray-700 dark:text-slate-300 truncate max-w-[120px]">{d.part_number}</td>
                            <td className="px-2 py-1.5 text-gray-700 dark:text-slate-300 font-mono">{d.due_date}</td>
                            <td className="px-2 py-1.5">
                              <span className={`font-bold ${d.days_until < 0 ? 'text-red-600' : d.days_until <= 2 ? 'text-orange-600' : 'text-gray-600'}`}>
                                {d.days_until < 0 ? `${Math.abs(d.days_until)}d late` : d.days_until === 0 ? 'Today' : `${d.days_until}d`}
                              </span>
                            </td>
                            <td className="px-2 py-1.5">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${uc.bg} ${uc.text}`}>{uc.label}</span>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                  <div className="h-2 rounded-full transition-all" style={{
                                    width: `${d.percent_complete}%`,
                                    backgroundColor: d.percent_complete >= 100 ? '#16a34a' : d.percent_complete >= 50 ? '#2563eb' : '#f59e0b'
                                  }} />
                                </div>
                                <span className="font-bold text-gray-700 dark:text-slate-300">{d.percent_complete}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Section>

          {/* ===== 4. EST VS ACTUAL TIME ===== */}
          <Section
            title="Estimated vs Actual Time"
            icon={<ClockIcon className="w-4 h-4 text-white" />}
            headerGradient="from-purple-600 via-purple-700 to-violet-800"
            badge={
              <span className="text-[10px] font-bold text-purple-200/80">
                {est_vs_actual.filter(e => e.variance_hours > 0).length} over, {est_vs_actual.filter(e => e.variance_hours < 0).length} under
              </span>
            }
          >
            <div className="p-3">
              {est_vs_actual.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">No traveler data with labor hours available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 dark:bg-slate-900">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Job</th>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Part</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Est.</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Actual</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Variance</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">%</th>
                        <th className="px-2 py-1.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                      {est_vs_actual.map(e => (
                        <>
                          <tr key={e.id} className="hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer" onClick={() => toggleRow(e.id)}>
                            <td className="px-2 py-1.5">
                              <Link href={`/travelers/${e.id}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline" onClick={ev => ev.stopPropagation()}>{e.job_number}</Link>
                            </td>
                            <td className="px-2 py-1.5 text-gray-700 dark:text-slate-300 truncate max-w-[120px]">{e.part_number}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-gray-700 dark:text-slate-300">{e.estimated_hours}h</td>
                            <td className="px-2 py-1.5 text-right font-mono text-gray-700 dark:text-slate-300">{e.actual_hours}h</td>
                            <td className="px-2 py-1.5 text-right">
                              <span className={`font-bold ${e.variance_hours > 0 ? 'text-red-600' : e.variance_hours < -1 ? 'text-green-600' : 'text-gray-600'}`}>
                                {e.variance_hours > 0 ? '+' : ''}{e.variance_hours}h
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <span className={`font-bold ${e.variance_percent > 10 ? 'text-red-600' : e.variance_percent < -10 ? 'text-green-600' : 'text-gray-500'}`}>
                                {e.variance_percent > 0 ? '+' : ''}{e.variance_percent}%
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {e.steps.length > 0 && (expandedRows.has(e.id) ? <ChevronUpIcon className="w-3 h-3 text-gray-400 inline" /> : <ChevronDownIcon className="w-3 h-3 text-gray-400 inline" />)}
                            </td>
                          </tr>
                          {expandedRows.has(e.id) && e.steps.length > 0 && (
                            <tr key={`${e.id}-steps`}>
                              <td colSpan={7} className="px-4 py-2 bg-gray-50/50 dark:bg-slate-900/30">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                                  {e.steps.map((s, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[11px]">
                                      <span className={`w-1.5 h-1.5 rounded-full ${s.is_completed ? 'bg-green-500' : 'bg-blue-500'}`} />
                                      <span className="text-gray-700 dark:text-slate-300 truncate flex-1">{s.operation}</span>
                                      <span className="font-mono text-gray-400">{s.estimated}h</span>
                                      <span className="font-mono text-gray-600 dark:text-slate-300">{s.actual}h</span>
                                      <span className={`font-bold ${s.variance > 0 ? 'text-red-500' : s.variance < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                                        {s.variance > 0 ? '+' : ''}{s.variance}h
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Section>

          {/* ===== 5. YIELD DASHBOARD ===== */}
          <Section
            title="Yield Dashboard"
            icon={<CheckBadgeIcon className="w-4 h-4 text-white" />}
            headerGradient="from-emerald-600 via-emerald-700 to-green-800"
            badge={<span className="text-[10px] font-bold text-emerald-200/80">{yield_data.length} travelers with yield data</span>}
            defaultOpen={yield_data.length > 0}
          >
            <div className="p-3">
              {/* Department yield summary */}
              {department_yield.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-2">Yield by Department</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {department_yield.map(dy => (
                      <div key={dy.department} className="bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-lg p-2.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-700 dark:text-slate-300 truncate">{dy.department}</p>
                          <p className="text-[10px] text-gray-400">
                            <span className="text-green-600">{dy.accepted} ok</span> / <span className="text-red-500">{dy.rejected} rej</span>
                          </p>
                        </div>
                        <div className={`text-lg font-extrabold ${dy.yield_rate >= 95 ? 'text-green-600' : dy.yield_rate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                          {dy.yield_rate}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-traveler yield */}
              {yield_data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 dark:bg-slate-900">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Job</th>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Part</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Qty</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Accepted</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Rejected</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Yield</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                      {yield_data.map(y => (
                        <tr key={y.id} className="hover:bg-blue-50 dark:hover:bg-slate-700">
                          <td className="px-2 py-1.5">
                            <Link href={`/travelers/${y.id}`} className="font-semibold text-blue-600 hover:underline">{y.job_number}</Link>
                          </td>
                          <td className="px-2 py-1.5 text-gray-700 dark:text-slate-300 truncate max-w-[120px]">{y.part_number}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{y.quantity}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-green-600">{y.accepted}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-red-600">{y.rejected}</td>
                          <td className="px-2 py-1.5 text-right">
                            <span className={`font-bold ${y.yield_rate >= 95 ? 'text-green-600' : y.yield_rate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                              {y.yield_rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">No yield data available. Accepted/rejected quantities will appear here once steps are completed with qty data.</p>
              )}
            </div>
          </Section>

          {/* ===== 6. BOTTLENECK DETECTION ===== */}
          <Section
            title="Bottleneck Detection"
            icon={<FunnelIcon className="w-4 h-4 text-white" />}
            headerGradient="from-rose-600 via-rose-700 to-pink-800"
            badge={<span className="text-[10px] font-bold text-rose-200/80">{bottlenecks.length} work centers analyzed (30 days)</span>}
          >
            <div className="p-3">
              {bottlenecks.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">Not enough data to detect bottlenecks yet.</p>
              ) : (
                <div className="space-y-2">
                  {bottlenecks.map((b, i) => {
                    const maxScore = bottlenecks[0]?.bottleneck_score || 1;
                    const pct = Math.min((b.bottleneck_score / maxScore) * 100, 100);
                    const isHot = i < 3;
                    return (
                      <div key={b.work_center} className={`rounded-lg p-3 border ${isHot ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700' : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            {isHot && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">#{i + 1}</span>}
                            <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{b.work_center}</span>
                          </div>
                          <span className={`text-xs font-bold ${isHot ? 'text-amber-600' : 'text-gray-500'}`}>Score: {b.bottleneck_score}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden mb-1.5">
                          <div className={`h-2 rounded-full transition-all ${isHot ? 'bg-amber-500' : 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-gray-500 dark:text-slate-400">
                          <span>Avg: <b className="text-gray-700 dark:text-slate-300">{b.avg_hours}h</b></span>
                          <span>Max: <b className="text-gray-700 dark:text-slate-300">{b.max_hours}h</b></span>
                          <span>Total: <b className="text-gray-700 dark:text-slate-300">{b.total_hours}h</b></span>
                          <span>Entries: <b className="text-gray-700 dark:text-slate-300">{b.entry_count}</b></span>
                          {b.active_now > 0 && <span>Active: <b className="text-green-600">{b.active_now}</b></span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Section>

          {/* ===== 7. OPERATOR SCORECARD ===== */}
          <Section
            title="Operator Scorecard"
            icon={<UserGroupIcon className="w-4 h-4 text-white" />}
            headerGradient="from-cyan-600 via-cyan-700 to-teal-800"
            badge={<span className="text-[10px] font-bold text-cyan-200/80">{operator_scorecards.length} operators (30 days)</span>}
          >
            <div className="p-3">
              {operator_scorecards.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">No operator data in the last 30 days.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 dark:bg-slate-900">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">#</th>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Operator</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Total Hrs</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Avg/Day</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Entries</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Steps</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Jobs</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Days</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Pauses</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Pause Time</th>
                        <th className="px-2 py-1.5 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Pause %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                      {operator_scorecards.map((op, i) => (
                        <tr key={op.id} className="hover:bg-blue-50 dark:hover:bg-slate-700">
                          <td className="px-2 py-1.5">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white inline-flex ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-300'}`}>{i + 1}</span>
                          </td>
                          <td className="px-2 py-1.5 font-semibold text-gray-700 dark:text-slate-300">{op.name}</td>
                          <td className="px-2 py-1.5 text-right font-mono font-bold text-teal-600 dark:text-teal-400">{op.total_hours}h</td>
                          <td className="px-2 py-1.5 text-right font-mono text-gray-700 dark:text-slate-300">{op.avg_hours_per_day}h</td>
                          <td className="px-2 py-1.5 text-right">{op.total_entries}</td>
                          <td className="px-2 py-1.5 text-right text-green-600 font-bold">{op.steps_completed}</td>
                          <td className="px-2 py-1.5 text-right">{op.unique_jobs}</td>
                          <td className="px-2 py-1.5 text-right">{op.active_days}</td>
                          <td className="px-2 py-1.5 text-right">{op.total_pauses}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-amber-600">{op.total_pause_minutes > 0 ? `${op.total_pause_minutes}m` : '0'}</td>
                          <td className="px-2 py-1.5 text-right">
                            <span className={`font-bold ${op.pause_percent > 15 ? 'text-red-600' : op.pause_percent > 5 ? 'text-amber-600' : 'text-green-600'}`}>
                              {op.pause_percent}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Section>

        </div>
      </div>
    </Layout>
  );
}
