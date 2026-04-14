'use client';

import { useTheme } from '@/context/ThemeContext';

interface WorkCenterUtilizationChartProps {
  data: Array<{ workCenter: string; hours: number }> | undefined;
}

const COLORS = ['#2563EB', '#7C3AED', '#06B6D4', '#059669', '#D97706', '#64748B', '#4F46E5', '#0D9488', '#EA580C', '#65A30D', '#DC2626', '#8B5CF6'];

export default function WorkCenterUtilizationChart({ data }: WorkCenterUtilizationChartProps) {
  const { theme } = useTheme();

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 px-4 py-2.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-white">Work Center Utilization</h3>
            <p className="text-[10px] text-teal-200/80">Hours by work center</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-32 p-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">No data available</p>
        </div>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.hours - a.hours).slice(0, 15);
  const maxHours = Math.max(...sorted.map(d => d.hours), 1);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 px-4 py-2.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Work Center Utilization</h3>
            <p className="text-[10px] text-teal-200/80">Hours by work center (top 15)</p>
          </div>
          <span className="text-xs font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
            {data.reduce((s, d) => s + d.hours, 0).toFixed(1)}h total
          </span>
        </div>
      </div>
      <div className="p-4 space-y-2 max-h-[350px] overflow-y-auto">
        {sorted.map((item, idx) => (
          <div key={item.workCenter} className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 w-28 truncate text-right" title={item.workCenter}>
              {item.workCenter}
            </span>
            <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.hours / maxHours) * 100}%`,
                  backgroundColor: COLORS[idx % COLORS.length],
                }}
              />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-slate-300 w-12 text-right">
              {item.hours.toFixed(1)}h
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
