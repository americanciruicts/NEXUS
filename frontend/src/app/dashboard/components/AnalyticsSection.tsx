'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckBadgeIcon,
  DocumentChartBarIcon,
  FunnelIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { API_BASE_URL } from '@/config/api';

// Per-traveler kitting timer state shape (matches /kitting/timer/{id})
interface KittingSessionRow {
  id: number;
  session_type: 'ACTIVE' | 'WAITING_PARTS';
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  note: string | null;
}
interface KittingEventRow {
  id: number;
  event_type: string;
  source: string;
  actor_id: number | null;
  session_id: number | null;
  payload: string | null;
  created_at: string;
}
interface KittingTimerState {
  traveler_id: number;
  job_number: string | null;
  state: 'IDLE' | 'ACTIVE' | 'WAITING_PARTS' | 'COMPLETED';
  total_active_seconds: number;
  total_waiting_seconds: number;
  waiting_event_count: number;
  avg_waiting_seconds: number;
  longest_waiting_seconds: number;
  sessions: KittingSessionRow[];
  events: KittingEventRow[];
}

function fmtDur(secs: number): string {
  if (!secs || secs < 1) return '0s';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(secs)}s`;
}

interface Anomaly {
  type: string; severity: string; entry_id: number; job_number: string;
  employee_name: string; work_center: string; hours_running: number;
  start_time: string; message: string;
}
interface DueDateItem {
  id: number; job_number: string; part_number: string; due_date: string;
  days_until: number; urgency: string; status: string; priority: string;
  percent_complete: number; total_steps: number; completed_steps: number;
}
interface EstVsActualItem {
  id: number; job_number: string; part_number: string; status: string;
  estimated_hours: number; actual_hours: number; variance_hours: number;
  variance_percent: number;
  steps: { operation: string; estimated: number; actual: number; variance: number; is_completed: boolean }[];
}
interface YieldItem {
  id: number; job_number: string; part_number: string; quantity: number;
  accepted: number; rejected: number; yield_rate: number; status: string;
}
interface DeptYield { department: string; accepted: number; rejected: number; yield_rate: number; }
interface DailySummary {
  date: string; entries_started: number; entries_completed: number;
  hours_logged: number; steps_completed: number; travelers_completed: number;
  active_timers: number; paused_timers: number; unique_operators: number;
  work_center_breakdown: { work_center: string; hours: number; entries: number }[];
  top_operators: { name: string; hours: number; entries: number }[];
}
interface Bottleneck {
  work_center: string; avg_hours: number; max_hours: number; total_hours: number;
  entry_count: number; active_now: number; waiting_travelers: number; bottleneck_score: number;
}
interface OperatorScorecard {
  id: number; name: string; total_entries: number; completed_entries: number;
  total_hours: number; avg_hours_per_entry: number; avg_hours_per_day: number;
  steps_completed: number; unique_jobs: number; active_days: number;
  total_pauses: number; total_pause_minutes: number; pause_percent: number;
}
interface KittingActiveJob {
  traveler_id: number; job_number: string; part_description: string;
  customer_name: string; status: string; kosh_status: string | null;
  due_date: string | null; days_until_due: number | null;
  hours_logged: number; estimated_hours: number; active_now: boolean;
  parts_total: number; parts_short: number; waiting_on_parts: boolean;
}
interface KittingAnalytics {
  summary: {
    total_hours_30d: number; avg_hours_per_kit: number; completed_count_30d: number;
    active_jobs: number; waiting_on_parts: number; ready_to_kit: number;
  };
  waiting_metrics?: {
    total_waiting_hours_30d: number;
    waiting_event_count_30d: number;
    avg_waiting_hours: number;
    longest_waiting_hours: number;
    currently_waiting_count: number;
  };
  active_jobs: KittingActiveJob[];
  trend_14d: { date: string; day: string; hours: number }[];
  throughput_8w: { week: string; completed: number }[];
  forecast: {
    remaining_hours_ready: number; remaining_hours_waiting_parts: number;
    days_to_clear_one_kitter: number; hours_per_kit_used: number;
  };
}
interface AnalyticsData {
  anomalies: Anomaly[]; due_date_heatmap: DueDateItem[]; est_vs_actual: EstVsActualItem[];
  yield_data: YieldItem[]; department_yield: DeptYield[]; daily_summary: DailySummary;
  bottlenecks: Bottleneck[]; operator_scorecards: OperatorScorecard[];
  kitting_analytics?: KittingAnalytics;
}

function Section({ title, icon, badge, children, defaultOpen = false, headerGradient }: {
  title: string; icon: React.ReactNode; badge?: React.ReactNode;
  children: React.ReactNode; defaultOpen?: boolean; headerGradient?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasGradient = !!headerGradient;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className={`w-full px-4 py-2.5 flex items-center justify-between transition-colors relative overflow-hidden ${
          hasGradient
            ? `bg-gradient-to-br ${headerGradient}`
            : 'bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-800 hover:from-teal-50 hover:to-emerald-50 dark:hover:from-slate-700 dark:hover:to-slate-700'
        }`}>
        {hasGradient && (
          <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
          </div>
        )}
        <div className="flex items-center gap-2 relative z-10">
          {icon}
          <h2 className={`text-xs font-bold ${hasGradient ? 'text-white' : 'text-gray-800 dark:text-slate-200'}`}>{title}</h2>
          {badge}
        </div>
        {open
          ? <ChevronUpIcon className={`w-3.5 h-3.5 relative z-10 ${hasGradient ? 'text-white/70' : 'text-gray-400'}`} />
          : <ChevronDownIcon className={`w-3.5 h-3.5 relative z-10 ${hasGradient ? 'text-white/70' : 'text-gray-400'}`} />
        }
      </button>
      {open && <div className="border-t border-gray-100 dark:border-slate-700">{children}</div>}
    </div>
  );
}

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

export default function AnalyticsSection({ data: rawData }: { data?: Record<string, unknown> | null }) {
  const data = rawData as AnalyticsData | null;
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Per-traveler kitting timeline cache, populated on demand when admin
  // expands a row in the active kitting queue table.
  const [timelineCache, setTimelineCache] = useState<Record<number, KittingTimerState>>({});
  const [timelineLoading, setTimelineLoading] = useState<Set<number>>(new Set());
  const [expandedTimelineIds, setExpandedTimelineIds] = useState<Set<number>>(new Set());

  const toggleRow = (id: number) => {
    setExpandedRows(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleTimeline = async (travelerId: number) => {
    setExpandedTimelineIds(prev => {
      const next = new Set(prev);
      if (next.has(travelerId)) next.delete(travelerId);
      else next.add(travelerId);
      return next;
    });
    // Fetch on first expand. Refetch silently each open so the live clock
    // on running sessions stays current.
    if (timelineCache[travelerId] && expandedTimelineIds.has(travelerId)) return;
    setTimelineLoading(prev => new Set(prev).add(travelerId));
    try {
      const token = localStorage.getItem('nexus_token');
      const res = await fetch(`${API_BASE_URL}/kitting/timer/${travelerId}`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (res.ok) {
        const json = (await res.json()) as KittingTimerState;
        setTimelineCache(prev => ({ ...prev, [travelerId]: json }));
      }
    } catch {
      // silent — timeline view is best-effort
    } finally {
      setTimelineLoading(prev => {
        const next = new Set(prev);
        next.delete(travelerId);
        return next;
      });
    }
  };

  if (!data) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 text-center">
      <div className="text-xs text-gray-400">No analytics data</div>
    </div>
  );

  if (!data) return null;

  // Reverse all list data to show newest/most relevant first
  const anomalies = [...(data.anomalies || [])].reverse();
  const due_date_heatmap = [...(data.due_date_heatmap || [])];
  const est_vs_actual = [...(data.est_vs_actual || [])];
  const yield_data = [...(data.yield_data || [])].reverse();
  const department_yield = [...(data.department_yield || [])];
  const { daily_summary, bottlenecks: rawBottlenecks, operator_scorecards: rawScorecards } = data;
  const bottlenecks = [...(rawBottlenecks || [])];
  const operator_scorecards = [...(rawScorecards || [])];
  const kitting = data.kitting_analytics;
  const kittingTrend = kitting ? [...kitting.trend_14d] : [];
  const kittingThroughput = kitting ? [...kitting.throughput_8w] : [];
  const maxKitHrs = Math.max(...kittingTrend.map(d => d.hours), 1);
  const maxKitThru = Math.max(...kittingThroughput.map(d => d.completed), 1);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 rounded-xl px-4 py-2.5 flex items-center justify-between relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <DocumentChartBarIcon className="w-4 h-4 text-teal-200" />
          <h2 className="text-sm font-bold text-white">Production Analytics</h2>
        </div>
        <span className="text-[10px] text-teal-200/80 relative z-10">{new Date().toLocaleDateString()}</span>
      </div>

      {/* 1. DAILY SUMMARY */}
      <Section title="Daily Summary" icon={<DocumentChartBarIcon className="w-3.5 h-3.5 text-white" />}
        headerGradient="from-indigo-600 via-indigo-700 to-purple-800"
        badge={<span className="text-[10px] font-bold text-indigo-200/80">{daily_summary.hours_logged}h logged today</span>} defaultOpen={true}>
        <div className="p-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 mb-3">
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
              <div key={item.label} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2 text-center">
                <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase">{item.label}</p>
                <p className={`text-lg font-extrabold ${item.color} dark:opacity-80 leading-tight`}>{item.value}</p>
              </div>
            ))}
          </div>
          {daily_summary.work_center_breakdown.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold text-gray-600 dark:text-slate-300 uppercase mb-1.5">Hours by Work Center</p>
                <div className="space-y-1">
                  {daily_summary.work_center_breakdown.map((wc) => {
                    const maxH = Math.max(...daily_summary.work_center_breakdown.map(w => w.hours));
                    return (
                      <div key={wc.work_center} className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-gray-600 dark:text-slate-400 w-24 truncate">{wc.work_center}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                          <div className="h-2.5 rounded-full bg-teal-500" style={{ width: `${maxH > 0 ? wc.hours / maxH * 100 : 0}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300 w-10 text-right">{wc.hours}h</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {daily_summary.top_operators.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-600 dark:text-slate-300 uppercase mb-1.5">Top Operators Today</p>
                  <div className="space-y-1">
                    {daily_summary.top_operators.map((op, i) => (
                      <div key={op.name} className="flex items-center gap-1.5">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-gray-300'}`}>{i + 1}</span>
                        <span className="text-[11px] font-medium text-gray-700 dark:text-slate-300 flex-1 truncate">{op.name}</span>
                        <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">{op.hours}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* 2. LABOR ANOMALIES */}
      <Section title="Labor Anomaly Detection" icon={<ExclamationTriangleIcon className="w-3.5 h-3.5 text-white" />}
        headerGradient="from-red-600 via-red-700 to-rose-800"
        badge={anomalies.length > 0 ? (
          <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{anomalies.length} issues</span>
        ) : <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">All clear</span>}
        defaultOpen={anomalies.length > 0}>
        <div className="p-3">
          {anomalies.length === 0 ? (
            <p className="text-xs text-green-600 text-center py-2">No anomalies detected.</p>
          ) : (
            <div className="space-y-1.5">
              {anomalies.map((a, i) => {
                const sev = severityColors[a.severity] || severityColors.low;
                return (
                  <div key={i} className={`${sev.bg} rounded-lg p-2.5`}>
                    <div className="flex items-start gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${sev.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[11px] font-bold ${sev.text} uppercase`}>
                            {a.type === 'forgotten_clockout' ? 'Forgotten Clock-Out' : a.type === 'suspiciously_short' ? 'Short Entry' : 'Long Entry'}
                          </span>
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${sev.text}`}>{a.severity}</span>
                        </div>
                        <p className="text-[11px] text-gray-600 dark:text-slate-400">{a.message}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                          <span className="font-semibold text-blue-600">{a.job_number}</span>
                          <span>{a.employee_name}</span>
                          <span>{a.work_center}</span>
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

      {/* 3. DUE DATE HEATMAP */}
      <Section title="Due Date Heatmap" icon={<CalendarDaysIcon className="w-3.5 h-3.5 text-white" />}
        headerGradient="from-amber-600 via-amber-700 to-orange-800"
        badge={<span className="text-[10px] font-bold text-amber-200/80">{due_date_heatmap.filter(d => d.urgency === 'overdue').length} overdue, {due_date_heatmap.filter(d => ['due_today', 'critical'].includes(d.urgency)).length} critical</span>}>
        <div className="p-3">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-3">
            {['overdue', 'due_today', 'critical', 'warning', 'upcoming', 'on_track'].map(urg => {
              const uc = urgencyColors[urg];
              const count = due_date_heatmap.filter(d => d.urgency === urg).length;
              return (
                <div key={urg} className={`${uc.bg} rounded-lg p-1.5 text-center`}>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">{uc.label}</p>
                  <p className={`text-base font-extrabold ${uc.text} leading-tight`}>{count}</p>
                </div>
              );
            })}
          </div>
          {due_date_heatmap.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-100 dark:bg-slate-900">
                  <tr>
                    <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Job</th>
                    <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Part</th>
                    <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Due</th>
                    <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Days</th>
                    <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Urgency</th>
                    <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {due_date_heatmap.map(d => {
                    const uc = urgencyColors[d.urgency] || urgencyColors.on_track;
                    return (
                      <tr key={d.id} className="hover:bg-blue-50 dark:hover:bg-slate-700">
                        <td className="px-2 py-1"><Link href={`/travelers/${d.id}`} className="font-semibold text-blue-600 hover:underline">{d.job_number}</Link></td>
                        <td className="px-2 py-1 text-gray-600 dark:text-slate-400 truncate max-w-[100px]">{d.part_number}</td>
                        <td className="px-2 py-1 text-gray-600 font-mono">{d.due_date}</td>
                        <td className="px-2 py-1"><span className={`font-bold ${d.days_until < 0 ? 'text-red-600' : d.days_until <= 2 ? 'text-orange-600' : 'text-gray-600'}`}>{d.days_until < 0 ? `${Math.abs(d.days_until)}d late` : d.days_until === 0 ? 'Today' : `${d.days_until}d`}</span></td>
                        <td className="px-2 py-1"><span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${uc.bg} ${uc.text}`}>{uc.label}</span></td>
                        <td className="px-2 py-1">
                          <div className="flex items-center gap-1">
                            <div className="w-12 bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div className="h-1.5 rounded-full" style={{ width: `${d.percent_complete}%`, backgroundColor: d.percent_complete >= 100 ? '#16a34a' : d.percent_complete >= 50 ? '#2563eb' : '#f59e0b' }} />
                            </div>
                            <span className="font-bold text-gray-600 text-[10px]">{d.percent_complete}%</span>
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

      {/* 4. EST VS ACTUAL */}
      <Section title="Estimated vs Actual Time" icon={<ClockIcon className="w-3.5 h-3.5 text-white" />}
        headerGradient="from-purple-600 via-purple-700 to-violet-800"
        badge={<span className="text-[10px] font-bold text-purple-200/80">{est_vs_actual.filter(e => e.variance_hours > 0).length} over, {est_vs_actual.filter(e => e.variance_hours < 0).length} under</span>}>
        <div className="p-3">
          {est_vs_actual.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-100 dark:bg-slate-900">
                  <tr>
                    <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Job</th>
                    <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Part</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Est.</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Actual</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Var</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">%</th>
                    <th className="px-2 py-1 w-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {est_vs_actual.map(e => (
                    <tr key={e.id} className="hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer" onClick={() => e.steps.length > 0 && toggleRow(e.id)}>
                      <td className="px-2 py-1"><Link href={`/travelers/${e.id}`} className="font-semibold text-blue-600 hover:underline" onClick={ev => ev.stopPropagation()}>{e.job_number}</Link></td>
                      <td className="px-2 py-1 text-gray-600 truncate max-w-[100px]">{e.part_number}</td>
                      <td className="px-2 py-1 text-right font-mono text-gray-600">{e.estimated_hours}h</td>
                      <td className="px-2 py-1 text-right font-mono text-gray-600">{e.actual_hours}h</td>
                      <td className="px-2 py-1 text-right"><span className={`font-bold ${e.variance_hours > 0 ? 'text-red-600' : e.variance_hours < -1 ? 'text-green-600' : 'text-gray-500'}`}>{e.variance_hours > 0 ? '+' : ''}{e.variance_hours}h</span></td>
                      <td className="px-2 py-1 text-right"><span className={`font-bold ${e.variance_percent > 10 ? 'text-red-600' : e.variance_percent < -10 ? 'text-green-600' : 'text-gray-500'}`}>{e.variance_percent > 0 ? '+' : ''}{e.variance_percent}%</span></td>
                      <td className="px-2 py-1 text-center">{e.steps.length > 0 && (expandedRows.has(e.id) ? <ChevronUpIcon className="w-3 h-3 text-gray-400 inline" /> : <ChevronDownIcon className="w-3 h-3 text-gray-400 inline" />)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Expanded step details rendered below table */}
              {est_vs_actual.filter(e => expandedRows.has(e.id) && e.steps.length > 0).map(e => (
                <div key={`exp-${e.id}`} className="px-3 py-2 bg-gray-50/50 dark:bg-slate-900/30 border-t border-gray-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-gray-500 mb-1">{e.job_number} — Step Breakdown</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
                    {e.steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${s.is_completed ? 'bg-green-500' : 'bg-blue-500'}`} />
                        <span className="text-gray-600 truncate flex-1">{s.operation}</span>
                        <span className="font-mono text-gray-400">{s.estimated}h</span>
                        <span className="font-mono text-gray-600">{s.actual}h</span>
                        <span className={`font-bold ${s.variance > 0 ? 'text-red-500' : s.variance < 0 ? 'text-green-500' : 'text-gray-400'}`}>{s.variance > 0 ? '+' : ''}{s.variance}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* 5. YIELD */}
      <Section title="Yield Dashboard" icon={<CheckBadgeIcon className="w-3.5 h-3.5 text-white" />}
        headerGradient="from-emerald-600 via-emerald-700 to-green-800"
        badge={<span className="text-[10px] font-bold text-emerald-200/80">{yield_data.length} travelers</span>}
        defaultOpen={yield_data.length > 0}>
        <div className="p-3">
          {department_yield.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold text-gray-600 dark:text-slate-300 uppercase mb-1.5">By Department</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                {department_yield.map(dy => (
                  <div key={dy.department} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-700 dark:text-slate-300 truncate">{dy.department}</p>
                      <p className="text-[9px] text-gray-400"><span className="text-green-600">{dy.accepted} ok</span> / <span className="text-red-500">{dy.rejected} rej</span></p>
                    </div>
                    <span className={`text-base font-extrabold ${dy.yield_rate >= 95 ? 'text-green-600' : dy.yield_rate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{dy.yield_rate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {yield_data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-100 dark:bg-slate-900">
                  <tr>
                    <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Job</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Qty</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">OK</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Rej</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Yield</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {yield_data.map(y => (
                    <tr key={y.id}>
                      <td className="px-2 py-1"><Link href={`/travelers/${y.id}`} className="font-semibold text-blue-600 hover:underline">{y.job_number}</Link></td>
                      <td className="px-2 py-1 text-right font-mono">{y.quantity}</td>
                      <td className="px-2 py-1 text-right font-mono text-green-600">{y.accepted}</td>
                      <td className="px-2 py-1 text-right font-mono text-red-600">{y.rejected}</td>
                      <td className="px-2 py-1 text-right"><span className={`font-bold ${y.yield_rate >= 95 ? 'text-green-600' : y.yield_rate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{y.yield_rate}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-gray-400 text-center py-2">No yield data yet</p>}
        </div>
      </Section>

      {/* 6. BOTTLENECKS */}
      <Section title="Bottleneck Detection" icon={<FunnelIcon className="w-3.5 h-3.5 text-white" />}
        headerGradient="from-rose-600 via-rose-700 to-pink-800"
        badge={<span className="text-[10px] font-bold text-rose-200/80">{bottlenecks.length} work centers (30d)</span>}>
        <div className="p-3">
          {bottlenecks.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">Not enough data yet</p>
          ) : (
            <div className="space-y-1.5">
              {bottlenecks.map((b, i) => {
                const maxScore = bottlenecks[0]?.bottleneck_score || 1;
                const pct = Math.min((b.bottleneck_score / maxScore) * 100, 100);
                const isHot = i < 3;
                return (
                  <div key={b.work_center} className={`rounded-lg p-2.5 border ${isHot ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-slate-700/30 border-gray-100 dark:border-slate-700'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {isHot && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1 py-0.5 rounded">#{i + 1}</span>}
                        <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300">{b.work_center}</span>
                      </div>
                      <span className={`text-[11px] font-bold ${isHot ? 'text-amber-600' : 'text-gray-500'}`}>{b.bottleneck_score}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden mb-1">
                      <div className={`h-1.5 rounded-full ${isHot ? 'bg-amber-500' : 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-[10px] text-gray-500">
                      <span>Avg: <b className="text-gray-700">{b.avg_hours}h</b></span>
                      <span>Max: <b className="text-gray-700">{b.max_hours}h</b></span>
                      <span>Total: <b className="text-gray-700">{b.total_hours}h</b></span>
                      <span>Entries: <b>{b.entry_count}</b></span>
                      {b.active_now > 0 && <span>Active: <b className="text-green-600">{b.active_now}</b></span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Section>

      {/* 7. OPERATOR SCORECARD */}
      <Section title="Operator Scorecard" icon={<UserGroupIcon className="w-3.5 h-3.5 text-white" />}
        headerGradient="from-cyan-600 via-cyan-700 to-teal-800"
        badge={<span className="text-[10px] font-bold text-cyan-200/80">{operator_scorecards.length} operators (30d)</span>}>
        <div className="p-3">
          {operator_scorecards.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-100 dark:bg-slate-900">
                  <tr>
                    <th className="px-1.5 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">#</th>
                    <th className="px-1.5 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Operator</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Hours</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Avg/Day</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Entries</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Steps</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Jobs</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Days</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Pauses</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Pause</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {operator_scorecards.map((op, i) => (
                    <tr key={op.id} className="hover:bg-blue-50 dark:hover:bg-slate-700">
                      <td className="px-1.5 py-1">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white inline-flex ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-300'}`}>{i + 1}</span>
                      </td>
                      <td className="px-1.5 py-1 font-semibold text-gray-700 dark:text-slate-300">{op.name}</td>
                      <td className="px-1.5 py-1 text-right font-mono font-bold text-teal-600 dark:text-teal-400">{op.total_hours}h</td>
                      <td className="px-1.5 py-1 text-right font-mono text-gray-600">{op.avg_hours_per_day}h</td>
                      <td className="px-1.5 py-1 text-right">{op.total_entries}</td>
                      <td className="px-1.5 py-1 text-right text-green-600 font-bold">{op.steps_completed}</td>
                      <td className="px-1.5 py-1 text-right">{op.unique_jobs}</td>
                      <td className="px-1.5 py-1 text-right">{op.active_days}</td>
                      <td className="px-1.5 py-1 text-right">{op.total_pauses}</td>
                      <td className="px-1.5 py-1 text-right font-mono text-amber-600">{op.total_pause_minutes > 0 ? `${op.total_pause_minutes}m` : '0'}</td>
                      <td className="px-1.5 py-1 text-right"><span className={`font-bold ${op.pause_percent > 15 ? 'text-red-600' : op.pause_percent > 5 ? 'text-amber-600' : 'text-green-600'}`}>{op.pause_percent}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>

      {/* 8. KITTING ANALYTICS — always shown even with 0 tracked hours */}
      <Section title="Kitting Analytics" icon={<CubeIcon className="w-3.5 h-3.5 text-white" />}
        headerGradient="from-sky-600 via-blue-700 to-indigo-800"
        badge={
          <span className="flex items-center gap-1.5">
            <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {kitting?.summary.active_jobs ?? 0} active
            </span>
            {(kitting?.summary.waiting_on_parts ?? 0) > 0 && (
              <span className="bg-red-500/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {kitting?.summary.waiting_on_parts} waiting parts
              </span>
            )}
          </span>
        }
        defaultOpen={true}>
        {!kitting ? (
          <div className="p-4 text-center text-xs text-gray-400">Kitting data loading…</div>
        ) : (
        <div className="p-3 space-y-3">
          {/* Summary tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { label: '30d Hours', value: `${kitting.summary.total_hours_30d}h`, color: 'text-blue-600' },
              { label: 'Avg / Kit', value: `${kitting.summary.avg_hours_per_kit}h`, color: 'text-indigo-600' },
              { label: 'Done 30d', value: kitting.summary.completed_count_30d, color: 'text-green-600' },
              { label: 'Active Jobs', value: kitting.summary.active_jobs, color: 'text-sky-600' },
              { label: 'Ready', value: kitting.summary.ready_to_kit, color: 'text-emerald-600' },
              { label: 'Waiting Parts', value: kitting.summary.waiting_on_parts, color: 'text-red-600' },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2 text-center">
                <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase">{item.label}</p>
                <p className={`text-lg font-extrabold ${item.color} dark:opacity-80 leading-tight`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Waiting-time metrics row (manual WAITING_PARTS pauses) */}
          {kitting.waiting_metrics && (
            <div className="bg-rose-50/40 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase">Waiting-on-Parts (last 30 days)</p>
                {kitting.waiting_metrics.currently_waiting_count > 0 && (
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/30 px-1.5 py-0.5 rounded-full animate-pulse">
                    {kitting.waiting_metrics.currently_waiting_count} waiting now
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Total Waiting', value: `${kitting.waiting_metrics.total_waiting_hours_30d}h` },
                  { label: 'Events', value: kitting.waiting_metrics.waiting_event_count_30d },
                  { label: 'Avg Wait', value: `${kitting.waiting_metrics.avg_waiting_hours}h` },
                  { label: 'Longest', value: `${kitting.waiting_metrics.longest_waiting_hours}h` },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <p className="text-[9px] font-bold text-rose-500/80 dark:text-rose-300/80 uppercase">{m.label}</p>
                    <p className="text-base font-extrabold text-rose-700 dark:text-rose-300 leading-tight">{m.value}</p>
                  </div>
                ))}
              </div>
              {/* Active-vs-idle % horizontal bar (kit hours vs waiting hours, 30d) */}
              {(() => {
                const active = kitting.summary.total_hours_30d || 0;
                const waiting = kitting.waiting_metrics.total_waiting_hours_30d || 0;
                const total = active + waiting;
                if (total <= 0) return null;
                const activePct = Math.round((active / total) * 100);
                const waitingPct = 100 - activePct;
                return (
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-bold text-gray-600 dark:text-slate-400 uppercase">Active vs Idle (30d)</p>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{activePct}% active</span>
                        <span className="mx-1">·</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">{waitingPct}% waiting</span>
                      </p>
                    </div>
                    <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700">
                      <div className="bg-gradient-to-r from-emerald-500 to-green-500 h-full" style={{ width: `${activePct}%` }} title={`Active: ${active}h`} />
                      <div className="bg-gradient-to-r from-rose-500 to-red-500 h-full" style={{ width: `${waitingPct}%` }} title={`Waiting: ${waiting}h`} />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Forecast banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Hours to clear (ready)</p>
              <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">{kitting.forecast.remaining_hours_ready}h</p>
              <p className="text-[10px] text-emerald-600/80">~{kitting.forecast.days_to_clear_one_kitter} days w/ 1 kitter @ 8h/d</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-red-700 dark:text-red-300 uppercase">Hours blocked (waiting parts)</p>
              <p className="text-xl font-extrabold text-red-700 dark:text-red-300">{kitting.forecast.remaining_hours_waiting_parts}h</p>
              <p className="text-[10px] text-red-600/80">unblocks once KOSH receives parts</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">Hours per kit (used)</p>
              <p className="text-xl font-extrabold text-blue-700 dark:text-blue-300">{kitting.forecast.hours_per_kit_used}h</p>
              <p className="text-[10px] text-blue-600/80">{kitting.summary.avg_hours_per_kit > 0 ? 'rolling 30-day average' : 'fallback estimate'}</p>
            </div>
          </div>

          {/* Trend + Throughput */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-gray-600 dark:text-slate-300 uppercase mb-1.5">Kitting Hours (14 days)</p>
              <div className="flex items-end gap-1 h-[100px]">
                {kittingTrend.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-[9px] font-bold text-gray-600 dark:text-slate-400 mb-0.5">{d.hours > 0 ? d.hours : ''}</span>
                    <div
                      className={`w-full rounded-t transition-all ${d.hours > 0 ? 'bg-gradient-to-t from-blue-600 to-sky-400' : 'bg-gray-200 dark:bg-slate-700'}`}
                      style={{ height: `${Math.max((d.hours / maxKitHrs) * 100, 2)}%`, minHeight: '2px' }}
                    />
                    <span className="text-[8px] text-gray-400 mt-0.5">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-gray-600 dark:text-slate-300 uppercase mb-1.5">Kit Steps Completed (8 weeks)</p>
              <div className="flex items-end gap-2 h-[100px]">
                {kittingThroughput.map((d) => (
                  <div key={d.week} className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-[9px] font-bold text-gray-600 dark:text-slate-400 mb-0.5">{d.completed > 0 ? d.completed : ''}</span>
                    <div
                      className={`w-full rounded-t transition-all ${d.completed > 0 ? 'bg-gradient-to-t from-indigo-600 to-blue-400' : 'bg-gray-200 dark:bg-slate-700'}`}
                      style={{ height: `${Math.max((d.completed / maxKitThru) * 100, 2)}%`, minHeight: '2px' }}
                    />
                    <span className="text-[8px] text-gray-400 mt-0.5">{d.week}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active kitting jobs */}
          <div>
            <p className="text-[10px] font-bold text-gray-600 dark:text-slate-300 uppercase mb-1.5">Active Kitting Queue</p>
            {kitting.active_jobs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No active kitting jobs</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-100 dark:bg-slate-900">
                    <tr>
                      <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Job</th>
                      <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Customer</th>
                      <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Due</th>
                      <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Logged</th>
                      <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Parts</th>
                      <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Status</th>
                      <th className="px-2 py-1 w-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                    {kitting.active_jobs.map((k) => {
                      const blocked = k.waiting_on_parts;
                      const rowBg = blocked
                        ? 'bg-red-50/40 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'hover:bg-blue-50 dark:hover:bg-slate-700';
                      const isExpanded = expandedTimelineIds.has(k.traveler_id);
                      const isLoading = timelineLoading.has(k.traveler_id);
                      const timeline = timelineCache[k.traveler_id];
                      return (
                        <React.Fragment key={k.traveler_id}>
                          <tr
                            className={`${rowBg} cursor-pointer`}
                            onClick={() => toggleTimeline(k.traveler_id)}
                          >
                            <td className="px-2 py-1">
                              <Link href={`/travelers/${k.traveler_id}`} className="font-semibold text-blue-600 hover:underline" onClick={ev => ev.stopPropagation()}>{k.job_number}</Link>
                              {k.active_now && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" title="Currently being kitted" />}
                            </td>
                            <td className="px-2 py-1 text-gray-600 dark:text-slate-400 truncate max-w-[120px]">{k.customer_name}</td>
                            <td className="px-2 py-1">
                              {k.due_date ? (
                                <span className={`font-bold ${k.days_until_due !== null && k.days_until_due < 0 ? 'text-red-600' : k.days_until_due !== null && k.days_until_due <= 2 ? 'text-orange-600' : 'text-gray-600'}`}>
                                  {k.days_until_due === null ? k.due_date : k.days_until_due < 0 ? `${Math.abs(k.days_until_due)}d late` : k.days_until_due === 0 ? 'Today' : `${k.days_until_due}d`}
                                </span>
                              ) : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-2 py-1 text-right font-mono text-gray-600">{k.hours_logged}h / {k.estimated_hours}h</td>
                            <td className="px-2 py-1 text-right">
                              {k.parts_total === 0 ? (
                                <span className="text-gray-400 text-[10px]">no KOSH</span>
                              ) : k.parts_short > 0 ? (
                                <span className="font-bold text-red-600">{k.parts_short}/{k.parts_total} short</span>
                              ) : (
                                <span className="font-bold text-green-600">all in</span>
                              )}
                            </td>
                            <td className="px-2 py-1">
                              {blocked ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Waiting Parts</span>
                              ) : k.active_now ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">In Progress</span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Ready</span>
                              )}
                            </td>
                            <td className="px-2 py-1 text-center">
                              {isExpanded
                                ? <ChevronUpIcon className="w-3 h-3 text-gray-400 inline" />
                                : <ChevronDownIcon className="w-3 h-3 text-gray-400 inline" />}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-gray-50/70 dark:bg-slate-900/40">
                              <td colSpan={7} className="px-3 py-2">
                                {isLoading && (
                                  <p className="text-[11px] text-gray-400 text-center py-2">Loading timeline…</p>
                                )}
                                {!isLoading && !timeline && (
                                  <p className="text-[11px] text-gray-400 text-center py-2">No kitting timer history yet for this job. The timer captures sessions automatically when an operator starts a kitting labor entry.</p>
                                )}
                                {!isLoading && timeline && (
                                  <KittingTimeline state={timeline} />
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-2 italic">Parts status auto-syncs from KOSH inventory on each refresh — once warehouse receives parts, &quot;Waiting Parts&quot; flips to &quot;Ready&quot; here and on the job page. Click any row to see the kitting session timeline.</p>
          </div>
        </div>
        )}
      </Section>
    </div>
  );
}

// ─── Per-job kitting timeline (Gantt-lite) ─────────────────────────────
// Renders all sessions for one traveler as alternating green (ACTIVE) and
// red (WAITING_PARTS) horizontal bars, proportional to duration. Open
// sessions count from start_time to "now" so the running clock is visible.
function KittingTimeline({ state }: { state: KittingTimerState }) {
  const sessions = state.sessions || [];
  if (sessions.length === 0) {
    return (
      <p className="text-[11px] text-gray-400 text-center py-2">
        No kitting sessions yet. The first session is created when an operator
        starts a kitting labor entry on the labor-tracking page.
      </p>
    );
  }

  const now = Date.now();
  // Pre-compute durations including running open sessions
  const enriched = sessions.map(s => {
    const start = new Date(s.start_time).getTime();
    const end = s.end_time ? new Date(s.end_time).getTime() : now;
    const dur = Math.max((end - start) / 1000, 0);
    return { ...s, _start: start, _end: end, _dur: dur };
  });
  const totalDur = enriched.reduce((acc, s) => acc + s._dur, 0) || 1;

  // Sum totals (live)
  const activeSum = enriched.filter(s => s.session_type === 'ACTIVE').reduce((a, s) => a + s._dur, 0);
  const waitingSum = enriched.filter(s => s.session_type === 'WAITING_PARTS').reduce((a, s) => a + s._dur, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold text-gray-600 dark:text-slate-300 uppercase">Kitting Timeline ({sessions.length} session{sessions.length === 1 ? '' : 's'})</p>
        <p className="text-[10px] text-gray-500 dark:text-slate-400">
          State: <span className={`font-bold ${state.state === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : state.state === 'WAITING_PARTS' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500'}`}>{state.state}</span>
        </p>
      </div>
      {/* Stacked bar */}
      <div className="flex w-full h-4 rounded overflow-hidden bg-gray-200 dark:bg-slate-700">
        {enriched.map(s => {
          const widthPct = (s._dur / totalDur) * 100;
          if (widthPct < 0.2) return null;
          const isOpen = s.end_time === null;
          const bg = s.session_type === 'ACTIVE'
            ? (isOpen ? 'bg-gradient-to-r from-emerald-500 to-green-600 animate-pulse' : 'bg-gradient-to-r from-emerald-500 to-green-600')
            : (isOpen ? 'bg-gradient-to-r from-rose-500 to-red-600 animate-pulse' : 'bg-gradient-to-r from-rose-500 to-red-600');
          const tip = `${s.session_type === 'ACTIVE' ? 'Active' : 'Waiting'} — ${fmtDur(s._dur)}\n${new Date(s._start).toLocaleString()}${s.end_time ? ` → ${new Date(s._end).toLocaleString()}` : ' → now'}`;
          return (
            <div
              key={s.id}
              className={`${bg} h-full border-r border-white/30 dark:border-slate-900/40 last:border-r-0`}
              style={{ width: `${widthPct}%` }}
              title={tip}
            />
          );
        })}
      </div>
      {/* Legend + totals */}
      <div className="flex items-center justify-between mt-1.5 text-[10px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-gray-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-sm bg-emerald-500" /> Active <b>{fmtDur(activeSum)}</b>
          </span>
          <span className="flex items-center gap-1 text-gray-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-sm bg-rose-500" /> Waiting <b>{fmtDur(waitingSum)}</b>
          </span>
          {state.waiting_event_count > 0 && (
            <span className="text-gray-500 dark:text-slate-500">
              · {state.waiting_event_count} wait events · longest <b>{fmtDur(state.longest_waiting_seconds)}</b>
            </span>
          )}
        </div>
        <span className="text-gray-400">Total {fmtDur(totalDur)}</span>
      </div>

      {/* Event log (collapsed-friendly) */}
      {state.events && state.events.length > 0 && (
        <div className="mt-2 border-t border-gray-200 dark:border-slate-700 pt-1.5">
          <p className="text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Event log</p>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {state.events.slice(-12).reverse().map(e => (
              <div key={e.id} className="flex items-center gap-2 text-[10px]">
                <span className="text-gray-400 font-mono w-28 truncate">{new Date(e.created_at).toLocaleString()}</span>
                <span className={`font-bold ${e.event_type === 'PARTS_RECEIVED' ? 'text-emerald-600 dark:text-emerald-400' : e.event_type === 'TIMER_PAUSED_WAITING' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-slate-300'}`}>{e.event_type}</span>
                <span className="text-gray-500">({e.source})</span>
                {e.payload && <span className="text-gray-400 italic truncate">— {e.payload}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
