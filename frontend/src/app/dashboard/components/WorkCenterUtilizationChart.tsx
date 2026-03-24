'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '@/context/ThemeContext';

interface WorkCenterUtilizationChartProps {
  data: Array<{ workCenter: string; hours: number }> | undefined;
}

const COLORS = ['#2563EB', '#7C3AED', '#06B6D4', '#059669', '#D97706', '#64748B', '#4F46E5', '#0D9488', '#EA580C', '#65A30D'];

export default function WorkCenterUtilizationChart({ data }: WorkCenterUtilizationChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-3 py-2.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <h3 className="relative z-10 text-sm font-bold text-white">Work Center Utilization</h3>
          <p className="relative z-10 text-xs text-teal-200/80">Hours by work center</p>
        </div>
        <div className="flex items-center justify-center h-64 p-4">
          <p className="text-gray-500 dark:text-slate-400">No data available</p>
        </div>
      </div>
    );
  }

  // Sort by hours descending for better readability
  const sortedData = [...data].sort((a, b) => b.hours - a.hours);
  // Dynamic height based on number of items (min 300, 36px per bar)
  const chartHeight = Math.max(300, sortedData.length * 36);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-3 py-2.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <h3 className="relative z-10 text-sm font-bold text-white">Work Center Utilization</h3>
        <p className="relative z-10 text-xs text-teal-200/80">Hours by work center</p>
      </div>
      <div className="p-3">
        <div className="w-full overflow-y-auto" style={{ maxHeight: '500px' }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E5E7EB'} horizontal={false} />
              <XAxis
                type="number"
                stroke={isDark ? '#94a3b8' : '#6B7280'}
                style={{ fontSize: '11px' }}
                tickFormatter={(v) => `${v}h`}
              />
              <YAxis
                type="category"
                dataKey="workCenter"
                stroke={isDark ? '#94a3b8' : '#6B7280'}
                style={{ fontSize: '11px', fontWeight: 600 }}
                width={160}
                tick={{ fill: isDark ? '#cbd5e1' : '#374151' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : 'white',
                  border: `1px solid ${isDark ? '#475569' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  color: isDark ? '#f1f5f9' : '#111827',
                }}
                formatter={(value: number | undefined) => [`${value?.toFixed(1) || '0'} hrs`, 'Labor Hours']}
                cursor={{ fill: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}
              />
              <Bar dataKey="hours" radius={[0, 6, 6, 0]} barSize={20}>
                {sortedData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
