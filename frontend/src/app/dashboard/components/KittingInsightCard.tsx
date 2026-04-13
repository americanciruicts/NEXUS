'use client';

/**
 * Standalone Kitting summary card — can be dropped into any tab
 * (Insights, Trends, Forecast). Consumes the kitting_analytics
 * block from the /analytics/all endpoint.
 */

interface KittingSummary {
  total_hours_30d: number;
  avg_hours_per_kit: number;
  completed_count_30d: number;
  active_jobs: number;
  waiting_on_parts: number;
  ready_to_kit: number;
}
interface KittingWaiting {
  total_waiting_hours_30d: number;
  waiting_event_count_30d: number;
  avg_waiting_hours: number;
  longest_waiting_hours: number;
  currently_waiting_count: number;
}
interface KittingForecast {
  remaining_hours_ready: number;
  remaining_hours_waiting_parts: number;
  days_to_clear_one_kitter: number;
  hours_per_kit_used: number;
}
interface KittingTrendDay {
  date: string;
  day: string;
  hours: number;
}
interface KittingThruWeek {
  week: string;
  completed: number;
}
interface KittingData {
  summary: KittingSummary;
  waiting_metrics?: KittingWaiting;
  forecast: KittingForecast;
  trend_14d: KittingTrendDay[];
  throughput_8w: KittingThruWeek[];
  active_jobs: Array<{
    traveler_id: number;
    job_number: string;
    customer_name: string;
    status: string;
    due_date: string | null;
    days_until_due: number | null;
    hours_logged: number;
    estimated_hours: number;
    parts_short: number;
    parts_total: number;
    waiting_on_parts: boolean;
    active_now: boolean;
  }>;
}

interface Props {
  analytics: Record<string, unknown> | null | undefined;
  /** Which variant to show — compact (insights/trends) or full (forecast) */
  variant?: 'compact' | 'full';
}

export default function KittingInsightCard({ analytics, variant = 'compact' }: Props) {
  const kitting = (analytics as { kitting_analytics?: KittingData } | null)?.kitting_analytics;
  if (!kitting) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-800 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="bg-white/15 backdrop-blur-sm p-1.5 rounded-lg border border-white/20">
              <svg className="h-4 w-4 text-sky-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V15m0 0l-2.25 1.313" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-white">Kitting Status</h3>
          </div>
        </div>
        <div className="p-4 text-center text-xs text-gray-400 animate-pulse">Loading kitting data...</div>
      </div>
    );
  }

  const s = kitting.summary;
  const w = kitting.waiting_metrics;
  const f = kitting.forecast;

  const activeHrs = s.total_hours_30d || 0;
  const waitingHrs = w?.total_waiting_hours_30d || 0;
  const total = activeHrs + waitingHrs;
  const activePct = total > 0 ? Math.round((activeHrs / total) * 100) : 100;
  const waitingPct = 100 - activePct;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-800 px-4 py-2.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-2">
          <div className="bg-white/15 backdrop-blur-sm p-1.5 rounded-lg border border-white/20">
            <svg className="h-4 w-4 text-sky-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V15m0 0l-2.25 1.313" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">Kitting Status</h3>
            <p className="text-[10px] text-sky-200/80">{s.active_jobs} active · {s.waiting_on_parts} waiting parts · {s.ready_to_kit} ready</p>
          </div>
          {(w?.currently_waiting_count ?? 0) > 0 && (
            <span className="bg-red-500/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              {w?.currently_waiting_count} waiting now
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: '30d Hours', value: `${s.total_hours_30d}h`, color: 'text-blue-600' },
            { label: 'Avg / Kit', value: `${s.avg_hours_per_kit}h`, color: 'text-indigo-600' },
            { label: 'Done 30d', value: s.completed_count_30d, color: 'text-green-600' },
            { label: 'Active', value: s.active_jobs, color: 'text-sky-600' },
            { label: 'Ready', value: s.ready_to_kit, color: 'text-emerald-600' },
            { label: 'Waiting', value: s.waiting_on_parts, color: 'text-red-600' },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-1.5 text-center">
              <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase">{item.label}</p>
              <p className={`text-base font-extrabold ${item.color} dark:opacity-80 leading-tight`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Active vs idle bar */}
        {total > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-bold text-gray-600 dark:text-slate-400 uppercase">Active vs Waiting (30d)</p>
              <p className="text-[10px] text-gray-500">
                <span className="font-bold text-emerald-600">{activePct}%</span> active · <span className="font-bold text-rose-600">{waitingPct}%</span> waiting
              </p>
            </div>
            <div className="flex w-full h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700">
              <div className="bg-emerald-500 h-full" style={{ width: `${activePct}%` }} />
              <div className="bg-rose-500 h-full" style={{ width: `${waitingPct}%` }} />
            </div>
          </div>
        )}

        {/* Forecast row — shown on full variant or always if there are active jobs */}
        {(variant === 'full' || s.active_jobs > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-2">
              <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Hrs to clear (ready)</p>
              <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{f.remaining_hours_ready}h</p>
              <p className="text-[9px] text-emerald-600/80">~{f.days_to_clear_one_kitter}d @ 1 kitter</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-2">
              <p className="text-[9px] font-bold text-red-700 dark:text-red-300 uppercase">Hrs blocked (parts)</p>
              <p className="text-lg font-extrabold text-red-700 dark:text-red-300">{f.remaining_hours_waiting_parts}h</p>
              <p className="text-[9px] text-red-600/80">unblocks when KOSH receives</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-2">
              <p className="text-[9px] font-bold text-blue-700 dark:text-blue-300 uppercase">Hrs / kit</p>
              <p className="text-lg font-extrabold text-blue-700 dark:text-blue-300">{f.hours_per_kit_used}h</p>
              <p className="text-[9px] text-blue-600/80">{s.avg_hours_per_kit > 0 ? '30d avg' : 'estimate'}</p>
            </div>
          </div>
        )}

        {/* Trend mini-chart — shown on full variant */}
        {variant === 'full' && kitting.trend_14d.length > 0 && (() => {
          const maxH = Math.max(...kitting.trend_14d.map(d => d.hours), 1);
          return (
            <div>
              <p className="text-[9px] font-bold text-gray-600 dark:text-slate-400 uppercase mb-1">Kitting Hours (14d)</p>
              <div className="flex items-end gap-0.5 h-16">
                {kitting.trend_14d.map(d => (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className={`w-full rounded-t ${d.hours > 0 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-700'}`}
                      style={{ height: `${Math.max((d.hours / maxH) * 100, 2)}%`, minHeight: '1px' }}
                    />
                    <span className="text-[7px] text-gray-400 mt-0.5">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Jobs waiting on parts — always shown if any */}
        {s.waiting_on_parts > 0 && (
          <div>
            <p className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase mb-1">Jobs waiting on parts</p>
            <div className="space-y-0.5 max-h-28 overflow-y-auto">
              {kitting.active_jobs.filter(j => j.waiting_on_parts).map(j => (
                <div key={j.traveler_id} className="flex items-center gap-2 px-2 py-1 rounded bg-red-50/50 dark:bg-red-900/10 text-[11px]">
                  <span className="font-bold text-blue-600">{j.job_number}</span>
                  <span className="text-gray-500 truncate flex-1">{j.customer_name}</span>
                  <span className="font-bold text-red-600">{j.parts_short}/{j.parts_total} short</span>
                  {j.days_until_due !== null && (
                    <span className={`font-bold ${j.days_until_due < 0 ? 'text-red-600' : j.days_until_due <= 2 ? 'text-orange-600' : 'text-gray-500'}`}>
                      {j.days_until_due < 0 ? `${Math.abs(j.days_until_due)}d late` : j.days_until_due === 0 ? 'Today' : `${j.days_until_due}d`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
