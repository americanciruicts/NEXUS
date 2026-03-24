'use client';

import { useMemo, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

const COLORS: Record<string, string> = {};
const COLOR_PALETTE = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B',
  '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#84CC16',
  '#06B6D4', '#D946EF', '#0EA5E9', '#A855F7', '#22D3EE',
];
let colorIdx = 0;
function getColor(key: string) {
  if (!COLORS[key]) {
    COLORS[key] = COLOR_PALETTE[colorIdx % COLOR_PALETTE.length];
    colorIdx++;
  }
  return COLORS[key];
}

interface JobDetail {
  job: string;
  hours: number;
}

interface LaborTrendsChartProps {
  data: Array<Record<string, any>> | undefined;
  departmentData?: Array<Record<string, any>> | undefined;
}

interface DayEntry {
  date: string;
  totalHours: number;
  entries: Array<{ name: string; job: string; hours: number; color: string }>;
}

export default function LaborTrendsChart({ data, departmentData }: LaborTrendsChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [view, setView] = useState<'workcenter' | 'department'>('workcenter');

  const activeData = view === 'department' && departmentData ? departmentData : data;

  // Parse data into per-day, per-job entries
  const { days, maxHours, allCategories } = useMemo(() => {
    if (!activeData || activeData.length === 0) return { days: [], maxHours: 0, allCategories: [] as string[] };

    // Reset colors for consistent assignment
    colorIdx = 0;
    Object.keys(COLORS).forEach(k => delete COLORS[k]);

    // First pass: collect all categories for color assignment (sorted by total hours)
    const catTotals: Record<string, number> = {};
    activeData.forEach(entry => {
      Object.keys(entry).forEach(key => {
        if (key !== 'date' && key !== '_details') {
          catTotals[key] = (catTotals[key] || 0) + (entry[key] || 0);
        }
      });
    });
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    sortedCats.forEach(cat => getColor(cat));

    let maxH = 0;
    const parsedDays: DayEntry[] = activeData.map(entry => {
      const details: Record<string, JobDetail[]> = entry._details || {};
      const entries: DayEntry['entries'] = [];

      // For each work center/dept that has hours
      sortedCats.forEach(cat => {
        const hours = entry[cat];
        if (!hours || hours <= 0) return;
        const jobs = details[cat] || [];
        if (jobs.length > 0) {
          // Show each job separately
          jobs.sort((a, b) => b.hours - a.hours).forEach(j => {
            entries.push({ name: cat, job: j.job, hours: j.hours, color: getColor(cat) });
          });
        } else {
          entries.push({ name: cat, job: '', hours, color: getColor(cat) });
        }
      });

      const totalHours = entries.reduce((s, e) => s + e.hours, 0);
      if (totalHours > maxH) maxH = totalHours;
      return { date: entry.date, totalHours, entries };
    });

    return { days: parsedDays, maxHours: maxH, allCategories: sortedCats };
  }, [activeData]);

  const emptyState = (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-4 py-3">
        <h3 className="text-sm font-bold text-white">Labor Hours Trend</h3>
        <p className="text-xs text-teal-200/80">Daily breakdown — each job shown separately</p>
      </div>
      <div className="flex items-center justify-center h-48 p-4">
        <p className="text-gray-400 dark:text-slate-500 text-sm">No labor data for this period</p>
      </div>
    </div>
  );

  if (!activeData || activeData.length === 0 || days.length === 0) return emptyState;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-4 py-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Labor Hours Trend</h3>
            <p className="text-xs text-teal-200/80">Daily breakdown — each job shown separately</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setView('workcenter')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all border ${
                view === 'workcenter'
                  ? 'bg-white/25 text-white border-white/40'
                  : 'text-white/70 bg-white/10 hover:bg-white/20 border-white/15'
              }`}
            >
              Work Center
            </button>
            <button
              onClick={() => setView('department')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all border ${
                view === 'department'
                  ? 'bg-white/25 text-white border-white/40'
                  : 'text-white/70 bg-white/10 hover:bg-white/20 border-white/15'
              }`}
            >
              Department
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pt-3 pb-1 flex flex-wrap gap-x-4 gap-y-1 border-b border-gray-100 dark:border-slate-700">
        {allCategories.map(cat => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: getColor(cat) }} />
            <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">{cat}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="p-4 space-y-1 max-h-[500px] overflow-y-auto">
        {days.map((day) => (
          <div key={day.date} className="group">
            {/* Date header row */}
            <div className="flex items-center gap-3 mb-1">
              <div className="w-16 flex-shrink-0 text-right">
                <span className="text-xs font-bold text-gray-700 dark:text-slate-200">{day.date}</span>
              </div>
              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-600" />
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">{day.totalHours.toFixed(1)}h total</span>
            </div>

            {/* Job bars */}
            <div className="ml-[76px] space-y-1 mb-3">
              {day.entries.map((entry, i) => {
                const pct = maxHours > 0 ? Math.max((entry.hours / maxHours) * 100, 4) : 4;
                return (
                  <div key={`${entry.name}-${entry.job}-${i}`} className="flex items-center gap-2">
                    {/* Bar */}
                    <div className="flex-1 relative">
                      <div
                        className="h-7 rounded-md flex items-center px-2.5 gap-2 transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          minWidth: '120px',
                          backgroundColor: entry.color,
                          opacity: 0.85,
                        }}
                      >
                        <span className="text-[11px] font-bold text-white truncate">
                          {entry.job || entry.name}
                        </span>
                        <span className="text-[11px] font-bold text-white/80 ml-auto flex-shrink-0">
                          {entry.hours.toFixed(1)}h
                        </span>
                      </div>
                    </div>
                    {/* Work center label (when showing job) */}
                    {entry.job && (
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 w-24 truncate flex-shrink-0" title={entry.name}>
                        {entry.name}
                      </span>
                    )}
                  </div>
                );
              })}
              {day.entries.length === 0 && (
                <div className="text-xs text-gray-400 dark:text-slate-500 italic py-1">No entries</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
