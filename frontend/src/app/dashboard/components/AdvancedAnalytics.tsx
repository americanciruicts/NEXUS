'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/config/api';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  UserGroupIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

// ─── Types ─────────────────────────────────────────────────────────
interface AdvancedData {
  on_time_delivery: {
    weeks: { week: string; shipped: number; on_time: number; late: number; rate: number }[];
    overall_rate: number; total_shipped: number; total_on_time: number;
  };
  predictive_late_alerts: {
    traveler_id: number; job_number: string; part_description: string;
    customer_name: string; due_date: string; days_until_due: number;
    remaining_hours: number; available_hours: number; projected_days_late: number;
    percent_complete: number; total_steps: number; completed_steps: number;
  }[];
  yield_trend: { week: string; accepted: number; rejected: number; total: number; yield_pct: number | null }[];
  operator_efficiency_by_wc: {
    name: string; work_center: string; total_hours: number; entries: number;
    avg_hours_per_entry: number; team_avg: number; efficiency: number;
  }[];
  daily_scorecard: {
    date: string; jobs_shipped: number; jobs_started: number; steps_completed: number;
    hours_logged: number; active_timers: number; unique_operators: number; overdue_jobs: number;
    comparison: { hours_yesterday: number; steps_yesterday: number; hours_change_pct: number };
  };
  capacity_planning: {
    weeks: { week: string; available_hours: number; committed_hours: number; utilization_pct: number; active_operators: number }[];
    total_committed: number; total_available: number;
  };
  rejection_root_cause: {
    by_work_center: { work_center: string; total_rejected: number; total_qty: number; rejection_rate: number; affected_steps: number }[];
    by_customer: { customer: string; total_rejected: number; total_qty: number; rejection_rate: number; job_count: number }[];
  };
  floor_status: {
    work_center: string; department: string; status: string;
    active_entries: number; waiting_travelers: number; hours_today: number;
  }[];
  build_comparisons: {
    traveler_id: number; job_number: string; part_number: string; part_description: string;
    customer_name: string; current_hours: number; previous_job: string; previous_hours: number;
    previous_cycle_days: number | null; variance_hours: number; variance_pct: number;
  }[];
  kitting_enhanced: {
    priority_queue: { traveler_id: number; job_number: string; customer_name: string; priority: string; due_date: string | null; days_until_due: number | null }[];
    kit_to_production_avg_hours: number;
    operator_efficiency: { name: string; total_hours: number; entries: number; avg_per_kit: number; team_avg: number; efficiency: number }[];
  };
  labor_costs: {
    traveler_id: number; job_number: string; part_description: string; customer_name: string;
    actual_hours: number; estimated_hours: number; labor_cost_estimate: number;
    estimated_cost: number; cost_variance: number;
  }[];
}

// ─── Section wrapper ───────────────────────────────────────────────
function Card({ icon: Icon, title, iconColor, gradient, badge, children, defaultOpen = false }: {
  icon: React.ElementType; title: string; iconColor: string; gradient: string;
  badge?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className={`w-full px-4 py-2.5 flex items-center justify-between bg-gradient-to-br ${gradient} relative overflow-hidden`}>
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <div className="bg-white/15 backdrop-blur-sm p-1.5 rounded-lg border border-white/20">
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <h2 className="text-xs font-bold text-white">{title}</h2>
          {badge}
        </div>
        {open
          ? <ChevronUpIcon className="w-3.5 h-3.5 text-white/70 relative z-10" />
          : <ChevronDownIcon className="w-3.5 h-3.5 text-white/70 relative z-10" />}
      </button>
      {open && <div className="border-t border-gray-100 dark:border-slate-700 p-4">{children}</div>}
    </div>
  );
}

function Stat({ label, value, color = 'text-gray-900', sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2 text-center">
      <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase">{label}</p>
      <p className={`text-lg font-extrabold ${color} dark:opacity-80 leading-tight`}>{value}</p>
      {sub && <p className="text-[9px] text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────
export default function AdvancedAnalytics() {
  const [data, setData] = useState<AdvancedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('nexus_token');
        const res = await fetch(`${API_BASE_URL}/analytics/advanced`, {
          headers: { Authorization: `Bearer ${token || ''}` },
        });
        if (res.ok) setData(await res.json());
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16">
      <ArrowPathIcon className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
      <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Loading advanced analytics...</p>
    </div>
  );
  if (!data) return <div className="text-center py-8 text-sm text-gray-400">Failed to load advanced analytics</div>;

  const sc = data.daily_scorecard;
  const otd = data.on_time_delivery;
  const maxOtdShipped = Math.max(...otd.weeks.map(w => w.shipped), 1);
  const yieldData = data.yield_trend.filter(y => y.yield_pct !== null);
  const maxYieldTotal = Math.max(...data.yield_trend.map(y => y.total), 1);

  return (
    <div className="space-y-3">

      {/* ═══ DAILY SCORECARD ═══ */}
      <Card icon={ChartBarIcon} title="Daily Production Scorecard" iconColor="text-emerald-300"
        gradient="from-emerald-600 via-emerald-700 to-green-800"
        badge={<span className="text-[10px] font-bold text-emerald-200/80">{sc.date}</span>}
        defaultOpen={true}>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          <Stat label="Shipped" value={sc.jobs_shipped} color="text-green-600" />
          <Stat label="Started" value={sc.jobs_started} color="text-blue-600" />
          <Stat label="Steps Done" value={sc.steps_completed} color="text-teal-600"
            sub={sc.comparison.steps_yesterday > 0 ? `yday: ${sc.comparison.steps_yesterday}` : undefined} />
          <Stat label="Hours" value={`${sc.hours_logged}h`} color="text-purple-600"
            sub={sc.comparison.hours_yesterday > 0 ? `yday: ${sc.comparison.hours_yesterday}h` : undefined} />
          <Stat label="Active" value={sc.active_timers} color="text-orange-600" />
          <Stat label="Operators" value={sc.unique_operators} color="text-cyan-600" />
          <Stat label="Overdue" value={sc.overdue_jobs} color={sc.overdue_jobs > 0 ? 'text-red-600' : 'text-green-600'} />
          <Stat label="vs Yday" value={`${sc.comparison.hours_change_pct > 0 ? '+' : ''}${sc.comparison.hours_change_pct}%`}
            color={sc.comparison.hours_change_pct >= 0 ? 'text-green-600' : 'text-red-600'} />
        </div>
      </Card>

      {/* ═══ ON-TIME DELIVERY ═══ */}
      <Card icon={ClockIcon} title="On-Time Delivery" iconColor="text-blue-300"
        gradient="from-blue-600 via-blue-700 to-indigo-800"
        badge={<span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{otd.overall_rate}%</span>}
        defaultOpen={true}>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Stat label="Overall Rate" value={`${otd.overall_rate}%`} color={otd.overall_rate >= 90 ? 'text-green-600' : otd.overall_rate >= 70 ? 'text-amber-600' : 'text-red-600'} />
          <Stat label="Total Shipped" value={otd.total_shipped} color="text-blue-600" />
          <Stat label="Late" value={otd.total_shipped - otd.total_on_time} color="text-red-600" />
        </div>
        <div className="flex items-end gap-1 h-24">
          {otd.weeks.map(w => (
            <div key={w.week} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-[8px] font-bold text-gray-500 mb-0.5">{w.shipped > 0 ? `${w.rate}%` : ''}</span>
              <div className="w-full flex flex-col justify-end" style={{ height: `${Math.max((w.shipped / maxOtdShipped) * 100, 4)}%` }}>
                <div className="bg-green-500 rounded-t" style={{ height: `${w.shipped > 0 ? (w.on_time / w.shipped) * 100 : 0}%`, minHeight: w.on_time > 0 ? '2px' : '0' }} />
                <div className="bg-red-400" style={{ height: `${w.shipped > 0 ? (w.late / w.shipped) * 100 : 0}%`, minHeight: w.late > 0 ? '2px' : '0' }} />
              </div>
              <span className="text-[7px] text-gray-400 mt-0.5">{w.week}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-1.5 justify-center text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500" />On time</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400" />Late</span>
        </div>
      </Card>

      {/* ═══ PREDICTIVE LATE ALERTS ═══ */}
      <Card icon={ExclamationTriangleIcon} title="Predictive Late Alerts" iconColor="text-red-300"
        gradient="from-red-600 via-red-700 to-rose-800"
        badge={data.predictive_late_alerts.length > 0 ?
          <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{data.predictive_late_alerts.length} at risk</span> :
          <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">All clear</span>}
        defaultOpen={data.predictive_late_alerts.length > 0}>
        {data.predictive_late_alerts.length === 0 ? (
          <p className="text-sm text-green-600 font-semibold text-center py-3">All active jobs are projected to ship on time</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {data.predictive_late_alerts.map(a => (
              <div key={a.traveler_id} className="bg-red-50/50 dark:bg-red-900/10 rounded-lg p-2.5 border border-red-200/50 dark:border-red-800/30">
                <div className="flex items-center justify-between mb-1">
                  <Link href={`/travelers/${a.traveler_id}`} className="text-[11px] font-bold text-blue-600 hover:underline">{a.job_number}</Link>
                  <span className="text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">~{a.projected_days_late}d late</span>
                </div>
                <p className="text-[10px] text-gray-600 dark:text-slate-400">{a.part_description} — {a.customer_name}</p>
                <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                  <span>Due: <b>{a.due_date}</b> ({a.days_until_due}d)</span>
                  <span>Remaining: <b>{a.remaining_hours}h</b></span>
                  <span>Available: <b>{a.available_hours}h</b></span>
                  <span>Progress: <b>{a.percent_complete}%</b> ({a.completed_steps}/{a.total_steps})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ═══ FIRST PASS YIELD TREND ═══ */}
      <Card icon={ArrowTrendingUpIcon} title="First Pass Yield Trend (12 weeks)" iconColor="text-emerald-300"
        gradient="from-emerald-600 via-teal-700 to-cyan-800"
        badge={yieldData.length > 0 ?
          <span className="text-[10px] font-bold text-emerald-200/80">Latest: {yieldData[yieldData.length - 1]?.yield_pct ?? '-'}%</span> : null}>
        <div className="flex items-end gap-1 h-24">
          {data.yield_trend.map(y => (
            <div key={y.week} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-[8px] font-bold text-gray-500 mb-0.5">{y.yield_pct !== null ? `${y.yield_pct}%` : ''}</span>
              <div className="w-full flex flex-col justify-end" style={{ height: `${Math.max((y.total / maxYieldTotal) * 100, 4)}%` }}>
                <div className="bg-emerald-500 rounded-t" style={{ height: `${y.total > 0 ? (y.accepted / y.total) * 100 : 0}%`, minHeight: y.accepted > 0 ? '2px' : '0' }} />
                <div className="bg-red-400" style={{ height: `${y.total > 0 ? (y.rejected / y.total) * 100 : 0}%`, minHeight: y.rejected > 0 ? '2px' : '0' }} />
              </div>
              <span className="text-[7px] text-gray-400 mt-0.5">{y.week}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ═══ FLOOR STATUS HEATMAP ═══ */}
      <Card icon={BuildingOfficeIcon} title="Floor Status" iconColor="text-sky-300"
        gradient="from-sky-600 via-blue-700 to-indigo-800"
        badge={<span className="text-[10px] font-bold text-sky-200/80">
          {data.floor_status.filter(f => f.status === 'active').length} active · {data.floor_status.filter(f => f.status === 'blocked').length} blocked · {data.floor_status.filter(f => f.status === 'idle').length} idle
        </span>}
        defaultOpen={true}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
          {data.floor_status.map(f => {
            const bg = f.status === 'active' ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800'
              : f.status === 'blocked' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800'
              : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600';
            const dot = f.status === 'active' ? 'bg-green-500 animate-pulse' : f.status === 'blocked' ? 'bg-red-500' : 'bg-gray-300 dark:bg-slate-500';
            return (
              <div key={f.work_center} className={`${bg} border rounded-lg p-2`}>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-[10px] font-bold text-gray-800 dark:text-slate-200 truncate">{f.work_center}</span>
                </div>
                <div className="text-[9px] text-gray-500 dark:text-slate-400">
                  {f.active_entries > 0 && <span className="text-green-600 font-bold">{f.active_entries} active </span>}
                  {f.waiting_travelers > 0 && <span>{f.waiting_travelers} waiting </span>}
                  {f.hours_today > 0 && <span>{f.hours_today}h today</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ═══ CAPACITY PLANNING ═══ */}
      <Card icon={ChartBarIcon} title="Capacity Planning (Next 2 Weeks)" iconColor="text-violet-300"
        gradient="from-violet-600 via-purple-700 to-fuchsia-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.capacity_planning.weeks.map(w => {
            const color = w.utilization_pct > 100 ? 'text-red-600' : w.utilization_pct > 80 ? 'text-amber-600' : 'text-green-600';
            return (
              <div key={w.week} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                <p className="text-[10px] font-bold text-gray-600 dark:text-slate-300 uppercase mb-1">Week of {w.week}</p>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xl font-extrabold ${color}`}>{w.utilization_pct}%</span>
                  <span className="text-[10px] text-gray-500">{w.active_operators} operators</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full rounded-full ${w.utilization_pct > 100 ? 'bg-red-500' : w.utilization_pct > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(w.utilization_pct, 100)}%` }} />
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-gray-400">
                  <span>Committed: {w.committed_hours}h</span>
                  <span>Available: {w.available_hours}h</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ═══ OPERATOR EFFICIENCY BY WC ═══ */}
      <Card icon={UserGroupIcon} title="Operator Efficiency by Work Center" iconColor="text-cyan-300"
        gradient="from-cyan-600 via-cyan-700 to-teal-800"
        badge={<span className="text-[10px] font-bold text-cyan-200/80">{data.operator_efficiency_by_wc.length} entries (30d)</span>}>
        {data.operator_efficiency_by_wc.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">No data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-gray-100 dark:bg-slate-900">
                <tr>
                  <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Operator</th>
                  <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Work Center</th>
                  <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Hours</th>
                  <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Avg/Entry</th>
                  <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Team Avg</th>
                  <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {data.operator_efficiency_by_wc.slice(0, 20).map((o, i) => (
                  <tr key={`${o.name}-${o.work_center}`} className="hover:bg-blue-50 dark:hover:bg-slate-700">
                    <td className="px-2 py-1 font-semibold text-gray-700 dark:text-slate-300">{o.name}</td>
                    <td className="px-2 py-1 text-gray-600 dark:text-slate-400">{o.work_center}</td>
                    <td className="px-2 py-1 text-right font-mono">{o.total_hours}h</td>
                    <td className="px-2 py-1 text-right font-mono">{o.avg_hours_per_entry}h</td>
                    <td className="px-2 py-1 text-right font-mono text-gray-400">{o.team_avg}h</td>
                    <td className="px-2 py-1 text-right">
                      <span className={`font-bold ${o.efficiency >= 100 ? 'text-green-600' : o.efficiency >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{o.efficiency}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ═══ REJECTION ROOT CAUSE ═══ */}
      <Card icon={BoltIcon} title="Rejection Root Cause" iconColor="text-rose-300"
        gradient="from-rose-600 via-rose-700 to-pink-800"
        defaultOpen={data.rejection_root_cause.by_work_center.length > 0}>
        {data.rejection_root_cause.by_work_center.length === 0 ? (
          <p className="text-xs text-green-600 font-semibold text-center py-3">No rejections recorded</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold text-gray-600 dark:text-slate-300 uppercase mb-1.5">By Work Center</p>
              <div className="space-y-1">
                {data.rejection_root_cause.by_work_center.slice(0, 8).map(r => (
                  <div key={r.work_center} className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-600 dark:text-slate-400 w-28 truncate">{r.work_center}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(r.rejection_rate * 5, 100)}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-rose-600 w-12 text-right">{r.rejection_rate}%</span>
                    <span className="text-[10px] text-gray-400 w-10 text-right">{r.total_rejected} rej</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-600 dark:text-slate-300 uppercase mb-1.5">By Customer</p>
              <div className="space-y-1">
                {data.rejection_root_cause.by_customer.slice(0, 8).map(r => (
                  <div key={r.customer} className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-600 dark:text-slate-400 w-28 truncate">{r.customer}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(r.rejection_rate * 5, 100)}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-amber-600 w-12 text-right">{r.rejection_rate}%</span>
                    <span className="text-[10px] text-gray-400 w-10 text-right">{r.job_count} jobs</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ═══ LABOR COST PER JOB ═══ */}
      <Card icon={CurrencyDollarIcon} title="Labor Cost per Job" iconColor="text-emerald-300"
        gradient="from-emerald-600 via-green-700 to-teal-800"
        badge={<span className="text-[10px] font-bold text-emerald-200/80">@ $35/hr estimate</span>}>
        {data.labor_costs.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">No labor data in last 60 days</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-gray-100 dark:bg-slate-900">
                <tr>
                  <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Job</th>
                  <th className="px-2 py-1 text-left font-bold text-gray-600 dark:text-slate-300 uppercase">Customer</th>
                  <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Actual</th>
                  <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Est.</th>
                  <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Cost</th>
                  <th className="px-2 py-1 text-right font-bold text-gray-600 dark:text-slate-300 uppercase">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {data.labor_costs.slice(0, 15).map(c => (
                  <tr key={c.traveler_id} className="hover:bg-blue-50 dark:hover:bg-slate-700">
                    <td className="px-2 py-1"><Link href={`/travelers/${c.traveler_id}`} className="font-semibold text-blue-600 hover:underline">{c.job_number}</Link></td>
                    <td className="px-2 py-1 text-gray-600 dark:text-slate-400 truncate max-w-[100px]">{c.customer_name}</td>
                    <td className="px-2 py-1 text-right font-mono">{c.actual_hours}h</td>
                    <td className="px-2 py-1 text-right font-mono text-gray-400">{c.estimated_hours}h</td>
                    <td className="px-2 py-1 text-right font-mono font-bold text-gray-700 dark:text-slate-300">${c.labor_cost_estimate}</td>
                    <td className="px-2 py-1 text-right">
                      <span className={`font-bold ${c.cost_variance > 0 ? 'text-red-600' : c.cost_variance < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {c.cost_variance > 0 ? '+' : ''}{c.cost_variance > 0 ? `$${c.cost_variance}` : c.cost_variance < 0 ? `-$${Math.abs(c.cost_variance)}` : '$0'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ═══ PREVIOUS BUILD COMPARISON ═══ */}
      <Card icon={ArrowPathIcon} title="Previous Build Comparison" iconColor="text-indigo-300"
        gradient="from-indigo-600 via-indigo-700 to-violet-800"
        badge={<span className="text-[10px] font-bold text-indigo-200/80">{data.build_comparisons.length} comparable jobs</span>}>
        {data.build_comparisons.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">No repeat part numbers with historical data found</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {data.build_comparisons.map(b => (
              <div key={b.traveler_id} className={`rounded-lg p-2.5 border ${b.variance_pct > 10 ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200/50' : b.variance_pct < -10 ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200/50' : 'bg-gray-50 dark:bg-slate-700 border-gray-200/50'}`}>
                <div className="flex items-center justify-between">
                  <Link href={`/travelers/${b.traveler_id}`} className="text-[11px] font-bold text-blue-600 hover:underline">{b.job_number}</Link>
                  <span className={`text-[10px] font-bold ${b.variance_pct > 10 ? 'text-red-600' : b.variance_pct < -10 ? 'text-green-600' : 'text-gray-500'}`}>
                    {b.variance_pct > 0 ? '+' : ''}{b.variance_pct}% vs prev
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">{b.part_description} — prev build: {b.previous_job} ({b.previous_hours}h{b.previous_cycle_days ? `, ${b.previous_cycle_days}d cycle` : ''})</p>
                <p className="text-[10px] text-gray-600">Current: <b>{b.current_hours}h</b> → Previous: <b>{b.previous_hours}h</b> = <b className={b.variance_hours > 0 ? 'text-red-600' : 'text-green-600'}>{b.variance_hours > 0 ? '+' : ''}{b.variance_hours}h</b></p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ═══ KITTING ENHANCED ═══ */}
      <Card icon={CubeIcon} title="Kitting — Priority Queue & Efficiency" iconColor="text-sky-300"
        gradient="from-sky-600 via-blue-700 to-indigo-800"
        badge={<span className="text-[10px] font-bold text-sky-200/80">
          {data.kitting_enhanced.priority_queue.length} in queue · handoff avg: {data.kitting_enhanced.kit_to_production_avg_hours}h
        </span>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold text-gray-600 dark:text-slate-300 uppercase mb-1.5">Next Up (by urgency)</p>
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {data.kitting_enhanced.priority_queue.slice(0, 10).map((q, i) => (
                <div key={q.traveler_id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-slate-700 text-[11px]">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${q.priority === 'HIGH' ? 'bg-red-500' : i < 3 ? 'bg-amber-500' : 'bg-gray-400'}`}>{i + 1}</span>
                  <Link href={`/travelers/${q.traveler_id}`} className="font-semibold text-blue-600 hover:underline">{q.job_number}</Link>
                  <span className="text-gray-500 truncate flex-1">{q.customer_name}</span>
                  {q.days_until_due !== null && (
                    <span className={`font-bold ${q.days_until_due < 0 ? 'text-red-600' : q.days_until_due <= 3 ? 'text-orange-600' : 'text-gray-500'}`}>
                      {q.days_until_due < 0 ? `${Math.abs(q.days_until_due)}d late` : `${q.days_until_due}d`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-600 dark:text-slate-300 uppercase mb-1.5">Kitting Operator Speed (30d)</p>
            {data.kitting_enhanced.operator_efficiency.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No kitting labor data yet</p>
            ) : (
              <div className="space-y-1">
                {data.kitting_enhanced.operator_efficiency.map((o, i) => (
                  <div key={o.name} className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${i === 0 ? 'bg-amber-500' : 'bg-gray-400'}`}>{i + 1}</span>
                    <span className="text-[11px] font-medium text-gray-700 dark:text-slate-300 flex-1">{o.name}</span>
                    <span className="text-[10px] text-gray-500">{o.avg_per_kit}h/kit</span>
                    <span className={`text-[10px] font-bold ${o.efficiency >= 100 ? 'text-green-600' : 'text-amber-600'}`}>{o.efficiency}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
