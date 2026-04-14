'use client';
import {
  UserGroupIcon,
  BoltIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  FireIcon,
} from '@heroicons/react/24/outline';

interface InsightsData {
  operator_efficiency: Array<{ name: string; username: string; actual_hours: number; estimated_hours: number; efficiency: number; entries: number }>;
  busiest_work_centers: Array<{ work_center: string; active_entries: number; operators: number }>;
  idle_operators: Array<{ name: string; last_activity: string | null; idle_minutes: number; last_work_center: string }>;
  jobs_waiting_on_parts: Array<{ job_number: string; customer: string; description: string; status: string; total_parts: number; short_parts: number; order_qty: number }>;
  top_shortages: Array<{ aci_pn: string; description: string; short_qty: number; affected_jobs: number; jobs: string[] }>;
  rejection_rates: Array<{ work_center: string; total_qty: number; rejected: number; accepted: number; rejection_rate: number }>;
  bottlenecks: Array<{ work_center: string; waiting_count: number; avg_hours: number }>;
  due_date_heatmap: { overdue: number; today: number; this_week: number; next_week: number; later: number; no_date: number };
  overdue_aging: Array<{ job_number: string; part_description: string; customer_name: string; due_date: string; days_overdue: number; status: string }>;
  throughput_trend: Array<{ week: string; completed: number; created: number }>;
  labor_hours_trend: Array<{ date: string; day: string; hours: number; entries: number }>;
  cycle_time_trend: Array<{ week: string; avg_days: number; count: number }>;
}

export default function InsightsSection({ data: rawData }: { data?: Record<string, unknown> | null }) {
  const data = rawData as InsightsData | null;

  if (!data) return null;

  const heatmap = data.due_date_heatmap;
  const heatTotal = heatmap.overdue + heatmap.today + heatmap.this_week + heatmap.next_week + heatmap.later + heatmap.no_date;

  // Reverse trends to show newest first
  const laborTrend = [...data.labor_hours_trend].reverse();
  const throughputTrend = [...data.throughput_trend].reverse();
  const cycleTrend = [...data.cycle_time_trend].reverse();

  const maxLaborHrs = Math.max(...laborTrend.map(d => d.hours), 1);
  const maxThroughput = Math.max(...throughputTrend.map(d => Math.max(d.completed, d.created)), 1);

  return (
    <div className="space-y-4">
      {/* Row 1: Operator Efficiency + Busiest Work Centers + Idle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Operator Efficiency */}
        <Card icon={UserGroupIcon} title="Operator Efficiency" iconColor="text-cyan-300" subtitle="Last 30 days">
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
            {data.operator_efficiency.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No data</p>
            ) : data.operator_efficiency.map((op) => (
              <div key={op.username} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 w-20 truncate">{op.name}</span>
                <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${op.efficiency >= 100 ? 'bg-green-500' : op.efficiency >= 70 ? 'bg-blue-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(op.efficiency, 150)}%` }}
                  />
                </div>
                <span className={`text-xs font-bold w-12 text-right ${op.efficiency >= 100 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{op.efficiency}%</span>
                <span className="text-[10px] text-gray-400 w-10 text-right">{op.actual_hours}h</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Busiest Work Centers */}
        <Card icon={FireIcon} title="Active Right Now" iconColor="text-amber-300" subtitle="Live work centers">
          {data.busiest_work_centers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No active work</p>
          ) : (
            <div className="space-y-2">
              {data.busiest_work_centers.map((wc) => (
                <div key={wc.work_center} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/10">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
                  <span className="text-xs font-bold text-gray-900 dark:text-white flex-1">{wc.work_center}</span>
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">{wc.active_entries} active</span>
                  <span className="text-[10px] text-gray-500 dark:text-slate-400">{wc.operators} ops</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Idle Operators */}
        <Card icon={ClockIcon} title="Idle Operators" iconColor="text-yellow-300" subtitle="Worked today, idle now">
          {data.idle_operators.length === 0 ? (
            <p className="text-sm text-green-600 dark:text-green-400 font-semibold text-center py-4">Everyone is active or off-shift</p>
          ) : (
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
              {data.idle_operators.map((op) => (
                <div key={op.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-yellow-50/50 dark:bg-yellow-900/10">
                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 flex-1 truncate">{op.name}</span>
                  <span className="text-[10px] text-gray-400 truncate">{op.last_work_center}</span>
                  <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400">{op.idle_minutes}m idle</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: KOSH Inventory — Jobs Waiting + Top Shortages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Jobs Waiting on Parts */}
        <Card icon={CubeIcon} title="Jobs Waiting on Parts" iconColor="text-red-300" subtitle={`${data.jobs_waiting_on_parts.length} jobs with shortages`}>
          {data.jobs_waiting_on_parts.length === 0 ? (
            <p className="text-sm text-green-600 dark:text-green-400 font-semibold text-center py-4">All jobs have parts!</p>
          ) : (
            <div className="space-y-1 max-h-[220px] overflow-y-auto">
              {data.jobs_waiting_on_parts.slice(0, 15).map((j) => (
                <div key={j.job_number} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${j.status === 'In Mfg' ? 'bg-green-500' : j.status === 'In Prep' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-400 w-20">{j.job_number}</span>
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 flex-1 truncate">{j.customer}</span>
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">{j.short_parts}/{j.total_parts} short</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top Shortage Items */}
        <Card icon={ExclamationTriangleIcon} title="Top Shortage Parts" iconColor="text-amber-300" subtitle="Parts holding up the most jobs">
          {data.top_shortages.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No shortage data</p>
          ) : (
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
              {data.top_shortages.map((s) => (
                <div key={s.aci_pn} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-50/50 dark:bg-amber-900/10">
                  <span className="text-xs font-bold text-gray-900 dark:text-white w-24 truncate">{s.aci_pn}</span>
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 flex-1 truncate">{s.description}</span>
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400">{s.affected_jobs} jobs</span>
                  <span className="text-[10px] text-gray-400">-{s.short_qty}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Row 4: Overdue Aging + Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overdue Aging */}
        <Card icon={ExclamationTriangleIcon} title="Overdue Jobs" iconColor="text-red-300" subtitle={`${data.overdue_aging.length} overdue`}>
          {data.overdue_aging.length === 0 ? (
            <p className="text-sm text-green-600 dark:text-green-400 font-semibold text-center py-4">No overdue travelers!</p>
          ) : (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {data.overdue_aging.map((item) => (
                <div key={item.job_number} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-50/50 dark:bg-red-900/10">
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">{item.days_overdue}d</span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{item.job_number}</span>
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate flex-1">{item.part_description}</span>
                  <span className="text-[10px] text-gray-400">{item.customer_name}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Bottlenecks */}
        <Card icon={BoltIcon} title="Bottlenecks" iconColor="text-red-300" subtitle="Steps with most travelers waiting">
          {data.bottlenecks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No bottlenecks detected</p>
          ) : (
            <div className="space-y-1.5">
              {data.bottlenecks.map((b, i) => (
                <div key={b.work_center} className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-500' : 'bg-gray-400'}`}>{i + 1}</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white flex-1">{b.work_center}</span>
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">{b.waiting_count} waiting</span>
                  <span className="text-[10px] text-gray-400">{b.avg_hours}h avg</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Row 5: Trends — Labor Hours + Throughput + Cycle Time */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Labor Hours Trend */}
        <Card icon={ChartBarIcon} title="Labor Hours (14 days)" iconColor="text-emerald-300" subtitle="Daily hours logged">
          <div className="flex items-end gap-1 h-[120px]">
            {laborTrend.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[9px] font-bold text-gray-600 dark:text-slate-400 mb-0.5">{d.hours > 0 ? d.hours : ''}</span>
                <div
                  className={`w-full rounded-t transition-all ${d.hours > 0 ? 'bg-gradient-to-t from-teal-600 to-emerald-400' : 'bg-gray-200 dark:bg-slate-700'}`}
                  style={{ height: `${Math.max((d.hours / maxLaborHrs) * 100, 2)}%`, minHeight: '2px' }}
                />
                <span className="text-[8px] text-gray-400 mt-1">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Throughput Trend */}
        <Card icon={ArrowTrendingUpIcon} title="Throughput (8 weeks)" iconColor="text-cyan-300" subtitle="Created vs Completed">
          <div className="flex items-end gap-2 h-[120px]">
            {throughputTrend.map((d) => (
              <div key={d.week} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
                <div className="flex gap-0.5 items-end flex-1 w-full">
                  <div className="flex-1 flex flex-col justify-end h-full">
                    <div className="bg-blue-500 rounded-t w-full" style={{ height: `${Math.max((d.created / maxThroughput) * 100, 3)}%` }} />
                  </div>
                  <div className="flex-1 flex flex-col justify-end h-full">
                    <div className="bg-green-500 rounded-t w-full" style={{ height: `${Math.max((d.completed / maxThroughput) * 100, 3)}%` }} />
                  </div>
                </div>
                <span className="text-[8px] text-gray-400">{d.week}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-2 justify-center">
            <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2 h-2 rounded-full bg-blue-500" />Created</span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2 h-2 rounded-full bg-green-500" />Completed</span>
          </div>
        </Card>

        {/* Cycle Time Trend */}
        <Card icon={ClockIcon} title="Cycle Time (8 weeks)" iconColor="text-violet-300" subtitle="Avg days to complete">
          <div className="flex items-end gap-2 h-[120px]">
            {cycleTrend.map((d) => {
              const maxCycle = Math.max(...cycleTrend.map(c => c.avg_days), 1);
              return (
                <div key={d.week} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className="text-[9px] font-bold text-gray-600 dark:text-slate-400 mb-0.5">{d.avg_days > 0 ? `${d.avg_days}d` : ''}</span>
                  <div
                    className={`w-full rounded-t transition-all ${d.avg_days > 0 ? 'bg-gradient-to-t from-violet-600 to-purple-400' : 'bg-gray-200 dark:bg-slate-700'}`}
                    style={{ height: `${Math.max((d.avg_days / maxCycle) * 100, 2)}%`, minHeight: '2px' }}
                  />
                  <span className="text-[8px] text-gray-400 mt-1">{d.week}</span>
                  {d.count > 0 && <span className="text-[7px] text-gray-300">{d.count}</span>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, iconColor, subtitle, children }: {
  icon: React.ElementType; title: string; iconColor: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 px-4 py-2.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-2">
          <div className="bg-white/15 backdrop-blur-sm p-1.5 rounded-lg border border-white/20">
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">{title}</h3>
            {subtitle && <p className="text-[10px] text-teal-200/80">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
