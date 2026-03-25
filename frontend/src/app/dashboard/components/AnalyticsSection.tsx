'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/config/api';
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
} from '@heroicons/react/24/outline';

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
interface AnalyticsData {
  anomalies: Anomaly[]; due_date_heatmap: DueDateItem[]; est_vs_actual: EstVsActualItem[];
  yield_data: YieldItem[]; department_yield: DeptYield[]; daily_summary: DailySummary;
  bottlenecks: Bottleneck[]; operator_scorecards: OperatorScorecard[];
}

function Section({ title, icon, badge, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; badge?: React.ReactNode;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-800 hover:from-gray-100 dark:hover:from-slate-750 transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xs font-bold text-gray-800 dark:text-slate-200">{title}</h2>
          {badge}
        </div>
        {open ? <ChevronUpIcon className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />}
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

export default function AnalyticsSection() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('nexus_token');
        const res = await fetch(`${API_BASE_URL}/analytics/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setData(await res.json());
      } catch { /* silent */ } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  if (loading) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 text-center">
      <div className="animate-pulse text-xs text-gray-400">Loading analytics...</div>
    </div>
  );

  if (!data) return null;

  const { anomalies, due_date_heatmap, est_vs_actual, yield_data, department_yield, daily_summary, bottlenecks, operator_scorecards } = data;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 rounded-xl px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DocumentChartBarIcon className="w-4 h-4 text-purple-200" />
          <h2 className="text-sm font-bold text-white">Production Analytics</h2>
        </div>
        <span className="text-[10px] text-purple-200/80">{new Date().toLocaleDateString()}</span>
      </div>

      {/* 1. DAILY SUMMARY */}
      <Section title="Daily Summary" icon={<DocumentChartBarIcon className="w-3.5 h-3.5 text-indigo-500" />}
        badge={<span className="text-[10px] font-bold text-gray-400">{daily_summary.hours_logged}h logged today</span>} defaultOpen={true}>
        <div className="p-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-3">
            {[
              { label: 'Started', value: daily_summary.entries_started, color: 'text-blue-600' },
              { label: 'Completed', value: daily_summary.entries_completed, color: 'text-green-600' },
              { label: 'Hours', value: `${daily_summary.hours_logged}h`, color: 'text-purple-600' },
              { label: 'Steps Done', value: daily_summary.steps_completed, color: 'text-indigo-600' },
              { label: 'Jobs Done', value: daily_summary.travelers_completed, color: 'text-emerald-600' },
              { label: 'Active', value: daily_summary.active_timers, color: 'text-orange-600' },
              { label: 'Paused', value: daily_summary.paused_timers, color: 'text-amber-600' },
              { label: 'Operators', value: daily_summary.unique_operators, color: 'text-cyan-600' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase">{item.label}</p>
                <p className={`text-lg font-extrabold ${item.color} dark:opacity-80 leading-tight`}>{item.value}</p>
              </div>
            ))}
          </div>
          {daily_summary.work_center_breakdown.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Hours by Work Center</p>
                <div className="space-y-1">
                  {daily_summary.work_center_breakdown.map((wc) => {
                    const maxH = Math.max(...daily_summary.work_center_breakdown.map(w => w.hours));
                    return (
                      <div key={wc.work_center} className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-gray-600 dark:text-slate-400 w-24 truncate">{wc.work_center}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                          <div className="h-2.5 rounded-full bg-indigo-500" style={{ width: `${maxH > 0 ? wc.hours / maxH * 100 : 0}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300 w-10 text-right">{wc.hours}h</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {daily_summary.top_operators.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Top Operators Today</p>
                  <div className="space-y-1">
                    {daily_summary.top_operators.map((op, i) => (
                      <div key={op.name} className="flex items-center gap-1.5">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-gray-300'}`}>{i + 1}</span>
                        <span className="text-[11px] font-medium text-gray-700 dark:text-slate-300 flex-1 truncate">{op.name}</span>
                        <span className="text-[11px] font-bold text-indigo-600">{op.hours}h</span>
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
      <Section title="Labor Anomaly Detection" icon={<ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-500" />}
        badge={anomalies.length > 0 ? (
          <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{anomalies.length} issues</span>
        ) : <span className="bg-green-100 dark:bg-green-900/30 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">All clear</span>}
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
      <Section title="Due Date Heatmap" icon={<CalendarDaysIcon className="w-3.5 h-3.5 text-orange-500" />}
        badge={<span className="text-[10px] font-bold text-gray-400">{due_date_heatmap.filter(d => d.urgency === 'overdue').length} overdue, {due_date_heatmap.filter(d => ['due_today', 'critical'].includes(d.urgency)).length} critical</span>}>
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
                <thead className="bg-gray-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-2 py-1 text-left font-bold text-gray-500 uppercase">Job</th>
                    <th className="px-2 py-1 text-left font-bold text-gray-500 uppercase">Part</th>
                    <th className="px-2 py-1 text-left font-bold text-gray-500 uppercase">Due</th>
                    <th className="px-2 py-1 text-left font-bold text-gray-500 uppercase">Days</th>
                    <th className="px-2 py-1 text-left font-bold text-gray-500 uppercase">Urgency</th>
                    <th className="px-2 py-1 text-left font-bold text-gray-500 uppercase">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {due_date_heatmap.map(d => {
                    const uc = urgencyColors[d.urgency] || urgencyColors.on_track;
                    return (
                      <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
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
      <Section title="Estimated vs Actual Time" icon={<ClockIcon className="w-3.5 h-3.5 text-purple-500" />}
        badge={<span className="text-[10px] font-bold text-gray-400">{est_vs_actual.filter(e => e.variance_hours > 0).length} over, {est_vs_actual.filter(e => e.variance_hours < 0).length} under</span>}>
        <div className="p-3">
          {est_vs_actual.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-2 py-1 text-left font-bold text-gray-500 uppercase">Job</th>
                    <th className="px-2 py-1 text-left font-bold text-gray-500 uppercase">Part</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-500 uppercase">Est.</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-500 uppercase">Actual</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-500 uppercase">Var</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-500 uppercase">%</th>
                    <th className="px-2 py-1 w-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {est_vs_actual.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer" onClick={() => e.steps.length > 0 && toggleRow(e.id)}>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
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
      <Section title="Yield Dashboard" icon={<CheckBadgeIcon className="w-3.5 h-3.5 text-green-500" />}
        badge={<span className="text-[10px] font-bold text-gray-400">{yield_data.length} travelers</span>}
        defaultOpen={yield_data.length > 0}>
        <div className="p-3">
          {department_yield.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">By Department</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {department_yield.map(dy => (
                  <div key={dy.department} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 flex items-center gap-2">
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
                <thead className="bg-gray-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-2 py-1 text-left font-bold text-gray-500 uppercase">Job</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-500 uppercase">Qty</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-500 uppercase">OK</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-500 uppercase">Rej</th>
                    <th className="px-2 py-1 text-right font-bold text-gray-500 uppercase">Yield</th>
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
      <Section title="Bottleneck Detection" icon={<FunnelIcon className="w-3.5 h-3.5 text-amber-500" />}
        badge={<span className="text-[10px] font-bold text-gray-400">{bottlenecks.length} work centers (30d)</span>}>
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
      <Section title="Operator Scorecard" icon={<UserGroupIcon className="w-3.5 h-3.5 text-cyan-500" />}
        badge={<span className="text-[10px] font-bold text-gray-400">{operator_scorecards.length} operators (30d)</span>}>
        <div className="p-3">
          {operator_scorecards.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-1.5 py-1 text-left font-bold text-gray-500 uppercase">#</th>
                    <th className="px-1.5 py-1 text-left font-bold text-gray-500 uppercase">Operator</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-500 uppercase">Hours</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-500 uppercase">Avg/Day</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-500 uppercase">Entries</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-500 uppercase">Steps</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-500 uppercase">Jobs</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-500 uppercase">Days</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-500 uppercase">Pauses</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-500 uppercase">Pause</th>
                    <th className="px-1.5 py-1 text-right font-bold text-gray-500 uppercase">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {operator_scorecards.map((op, i) => (
                    <tr key={op.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="px-1.5 py-1">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white inline-flex ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-300'}`}>{i + 1}</span>
                      </td>
                      <td className="px-1.5 py-1 font-semibold text-gray-700 dark:text-slate-300">{op.name}</td>
                      <td className="px-1.5 py-1 text-right font-mono font-bold text-indigo-600">{op.total_hours}h</td>
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
    </div>
  );
}
