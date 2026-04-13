'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';

/** Format hours into the most readable unit */
function formatDuration(hours: number): string {
  if (hours <= 0) return '0h';
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 8; // 8h work day
  if (days < 10) return `${days.toFixed(1)}d`;
  const weeks = days / 5; // 5-day work week
  return `${weeks.toFixed(1)}w`;
}

/** Format hours into short display */
function formatShort(hours: number): string {
  if (hours <= 0) return '0h';
  if (hours < 24) return `${hours.toFixed(0)}h`;
  const days = hours / 8;
  if (days < 10) return `${days.toFixed(0)}d`;
  const weeks = days / 5;
  return `${weeks.toFixed(1)}w`;
}

interface StepForecast {
  step_number: number;
  operation: string;
  is_completed: boolean;
  estimated_hours: number;
  buffer_hours: number;
  buffered_total: number;
  actual_hours: number;
  operators_needed: number;
}

interface ForecastItem {
  id: number;
  job_number: string;
  part_number: string;
  part_description: string;
  customer_name?: string;
  status?: string;
  due_date: string | null;
  days_until_due: number | null;
  estimated_hours: number;
  buffer_hours: number;
  buffered_total: number;
  actual_hours: number;
  remaining_hours: number;
  remaining_buffered: number;
  work_hours_available: number;
  min_headcount: number;
  total_steps: number;
  completed_steps: number;
  percent_complete: number;
  priority: string;
  on_track: boolean | null;
  steps: StepForecast[];
  // KOSH inventory (optional — only present when KOSH job exists)
  inventory_ready?: boolean | null;
  total_bom_lines?: number;
  lines_with_stock?: number;
  shortage_lines?: number;
  kosh_job_status?: string | null;
}

interface ForecastCardProps {
  data: ForecastItem[] | undefined;
}

const priorityColors: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  URGENT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  PREMIUM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  NORMAL: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400',
  LOW: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function ForecastCard({ data }: ForecastCardProps) {
  const { theme } = useTheme();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const items = data || [];
  const atRisk = items.filter(i => i.on_track === false).length;
  const onTrack = items.filter(i => i.on_track === true).length;
  const noDueDate = items.filter(i => i.on_track === null).length;

  const displayItems = showAll ? items : items.slice(0, 20);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 px-4 py-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Production Forecast</h3>
              <p className="text-xs text-amber-200/80">{items.length} active traveler{items.length !== 1 ? 's' : ''} &middot; Step-by-step timeline with buffer</p>
            </div>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {onTrack > 0 && (
                <span className="bg-green-500/80 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {onTrack} on track
                </span>
              )}
              {atRisk > 0 && (
                <span className="bg-red-500/80 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {atRisk} at risk
                </span>
              )}
              {noDueDate > 0 && (
                <span className="bg-gray-500/80 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {noDueDate} no date
                </span>
              )}
            </div>
          </div>
          {/* Summary stats */}
          {items.length > 0 && (
            <div className="flex gap-4 mt-2 pt-2 border-t border-white/20">
              <div>
                <div className="text-[10px] text-amber-200/70 uppercase">Total Est.</div>
                <div className="text-sm font-bold text-white">{formatShort(items.reduce((s, i) => s + i.buffered_total, 0))}</div>
              </div>
              <div>
                <div className="text-[10px] text-amber-200/70 uppercase">Completed</div>
                <div className="text-sm font-bold text-white">{formatDuration(items.reduce((s, i) => s + i.actual_hours, 0))}</div>
              </div>
              <div>
                <div className="text-[10px] text-amber-200/70 uppercase">Remaining</div>
                <div className="text-sm font-bold text-white">{formatShort(items.reduce((s, i) => s + i.remaining_buffered, 0))}</div>
              </div>
              <div>
                <div className="text-[10px] text-amber-200/70 uppercase">Buffer</div>
                <div className="text-sm font-bold text-amber-300">{formatDuration(items.reduce((s, i) => s + i.buffer_hours, 0))}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forecast Items */}
      <div className="max-h-[700px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-32 p-4">
            <p className="text-gray-500 dark:text-slate-400 text-sm">No active travelers in production</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {displayItems.map((item) => {
              const isOverdue = item.days_until_due !== null && item.days_until_due < 0;
              const isDueSoon = item.days_until_due !== null && item.days_until_due >= 0 && item.days_until_due <= 3;
              const hasNoDueDate = item.due_date === null || item.due_date === '';
              const isExpanded = expandedId === item.id;

              return (
                <div key={item.id} className="group">
                  {/* Job Header Row */}
                  <div
                    className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                        <Link
                          href={`/travelers/${item.id}`}
                          className="text-sm font-bold text-blue-700 dark:text-blue-400 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.job_number}
                        </Link>
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${priorityColors[item.priority] || priorityColors.NORMAL}`}>
                          {item.priority}
                        </span>
                        {item.status === 'CREATED' && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            NOT STARTED
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-bold ${
                        hasNoDueDate ? 'text-gray-400 dark:text-slate-500' :
                        isOverdue ? 'text-red-600 dark:text-red-400' :
                        isDueSoon ? 'text-amber-600 dark:text-amber-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {hasNoDueDate ? 'No due date' :
                         isOverdue ? `${Math.abs(item.days_until_due!)}d overdue` :
                         `${item.days_until_due}d left`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-2">
                      <span className="truncate mr-2">
                        {item.part_number} {item.part_description ? `— ${item.part_description}` : ''}
                        {item.customer_name ? ` (${item.customer_name})` : ''}
                      </span>
                      {!hasNoDueDate && <span className="flex-shrink-0">Due: {item.due_date}</span>}
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverdue ? 'bg-red-500' :
                            item.percent_complete >= 75 ? 'bg-green-500' :
                            item.percent_complete >= 40 ? 'bg-amber-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(item.percent_complete, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-600 dark:text-slate-300 whitespace-nowrap">
                        {item.percent_complete}%
                      </span>
                      <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
                        ({item.completed_steps}/{item.total_steps})
                      </span>
                    </div>

                    {/* Inventory Status from KOSH */}
                    {item.inventory_ready !== undefined && item.inventory_ready !== null && (item.total_bom_lines ?? 0) > 0 && (
                      <div className={`flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                        item.inventory_ready
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                      }`}>
                        <span>{item.inventory_ready ? '✓' : '!'}</span>
                        <span>
                          {item.inventory_ready
                            ? `Parts ready — ${item.lines_with_stock ?? 0}/${item.total_bom_lines ?? 0} BOM lines in stock`
                            : `${item.shortage_lines ?? 0} of ${item.total_bom_lines ?? 0} parts short — waiting on inventory`}
                        </span>
                        {item.kosh_job_status && (
                          <span className="ml-auto text-[10px] opacity-70">KOSH: {item.kosh_job_status}</span>
                        )}
                      </div>
                    )}

                    {/* Key metrics row */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2 py-1.5 text-center">
                        <div className="text-[10px] text-blue-500 dark:text-blue-400 uppercase font-semibold">Est + Buffer</div>
                        <div className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatDuration(item.buffered_total)}</div>
                        <div className="text-[10px] text-blue-400 dark:text-blue-500">({formatDuration(item.estimated_hours)} + {formatDuration(item.buffer_hours)})</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-2 py-1.5 text-center">
                        <div className="text-[10px] text-green-500 dark:text-green-400 uppercase font-semibold">Done</div>
                        <div className="text-sm font-bold text-green-700 dark:text-green-300">{formatDuration(item.actual_hours)}</div>
                        <div className="text-[10px] text-green-400 dark:text-green-500">{item.completed_steps} steps done</div>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 py-1.5 text-center">
                        <div className="text-[10px] text-amber-500 dark:text-amber-400 uppercase font-semibold">Remaining</div>
                        <div className="text-sm font-bold text-amber-700 dark:text-amber-300">{formatDuration(item.remaining_buffered)}</div>
                        <div className="text-[10px] text-amber-400 dark:text-amber-500">
                          {hasNoDueDate ? 'no deadline' : `${formatDuration(item.work_hours_available)} avail`}
                        </div>
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 text-center ${
                        item.on_track === true ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                        item.on_track === false ? 'bg-red-50 dark:bg-red-900/20' :
                        'bg-gray-50 dark:bg-slate-700/50'
                      }`}>
                        <div className={`text-[10px] uppercase font-semibold ${
                          item.on_track === true ? 'text-emerald-500 dark:text-emerald-400' :
                          item.on_track === false ? 'text-red-500 dark:text-red-400' :
                          'text-gray-500 dark:text-slate-400'
                        }`}>Headcount</div>
                        <div className={`text-sm font-bold ${
                          item.on_track === true ? 'text-emerald-700 dark:text-emerald-300' :
                          item.on_track === false ? 'text-red-700 dark:text-red-300' :
                          'text-gray-700 dark:text-slate-300'
                        }`}>
                          {item.min_headcount} {item.min_headcount === 1 ? 'person' : 'people'}
                        </div>
                        <div className={`text-[10px] ${
                          item.on_track === true ? 'text-emerald-400 dark:text-emerald-500' :
                          item.on_track === false ? 'text-red-400 dark:text-red-500' :
                          'text-gray-400 dark:text-slate-500'
                        }`}>
                          {item.on_track === true ? 'On track' : item.on_track === false ? 'At risk' : 'No deadline'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Step-by-Step Timeline */}
                  {isExpanded && item.steps && item.steps.length > 0 && (
                    <div className="px-4 pb-4 bg-gray-50/50 dark:bg-slate-900/30">
                      <div className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 pt-1">
                        Step-by-Step Forecast
                      </div>
                      <div className="space-y-0">
                        {item.steps.map((step, idx) => {
                          const isLast = idx === item.steps.length - 1;
                          return (
                            <div key={step.step_number} className="flex gap-3">
                              {/* Timeline line */}
                              <div className="flex flex-col items-center w-6 flex-shrink-0">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 flex-shrink-0 ${
                                  step.is_completed
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-500 dark:text-slate-400'
                                }`}>
                                  {step.is_completed ? '✓' : step.step_number}
                                </div>
                                {!isLast && (
                                  <div className={`w-0.5 flex-1 min-h-[20px] ${step.is_completed ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-slate-600'}`} />
                                )}
                              </div>
                              {/* Step content */}
                              <div className={`flex-1 pb-2 ${isLast ? '' : 'border-b border-gray-100 dark:border-slate-700 mb-1'}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-xs font-bold ${step.is_completed ? 'text-green-600 dark:text-green-400 line-through' : 'text-gray-800 dark:text-slate-200'}`}>
                                    {step.operation}
                                  </span>
                                  {step.is_completed && (
                                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                                      DONE
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                  <span className="text-[11px] text-gray-500 dark:text-slate-400">
                                    Est: <span className="font-semibold text-gray-700 dark:text-slate-300">{step.estimated_hours}h</span>
                                  </span>
                                  <span className="text-[11px] text-amber-500 dark:text-amber-400">
                                    Buffer: <span className="font-semibold">+{step.buffer_hours}h</span>
                                  </span>
                                  <span className="text-[11px] text-blue-500 dark:text-blue-400">
                                    Total: <span className="font-semibold">{step.buffered_total}h</span>
                                  </span>
                                  <span className="text-[11px] text-purple-500 dark:text-purple-400">
                                    Crew: <span className="font-semibold">{step.operators_needed}</span>
                                  </span>
                                  {step.actual_hours > 0 && (
                                    <span className="text-[11px] text-green-500 dark:text-green-400">
                                      Actual: <span className="font-semibold">{step.actual_hours}h</span>
                                    </span>
                                  )}
                                </div>
                                {/* Mini progress bar for this step */}
                                {!step.is_completed && step.actual_hours > 0 && step.buffered_total > 0 && (
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${Math.min((step.actual_hours / step.buffered_total) * 100, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-gray-400">{Math.round((step.actual_hours / step.buffered_total) * 100)}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Buffer Summary */}
                      <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                            Total Buffer: {formatDuration(item.buffer_hours)} (10% safety margin)
                          </span>
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            Covers rework, delays, machine downtime
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Show All / Show Less toggle */}
      {items.length > 20 && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline"
          >
            {showAll ? `Show less (20 of ${items.length})` : `Show all ${items.length} travelers`}
          </button>
        </div>
      )}
    </div>
  );
}
