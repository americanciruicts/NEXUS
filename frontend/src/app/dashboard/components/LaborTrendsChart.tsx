'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from '@/context/ThemeContext';

const COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B',
  '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#84CC16',
  '#06B6D4', '#D946EF', '#0EA5E9', '#A855F7', '#22D3EE',
];

interface LaborTrendsChartProps {
  data: Array<Record<string, any>> | undefined;
}

export default function LaborTrendsChart({ data }: LaborTrendsChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Extract all work center keys from the data
  const workCenters = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = new Set<string>();
    data.forEach(entry => {
      Object.keys(entry).forEach(key => {
        if (key !== 'date') keys.add(key);
      });
    });
    return Array.from(keys);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-3 py-2.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <h3 className="relative z-10 text-sm font-bold text-white">Labor Hours Trend</h3>
          <p className="relative z-10 text-xs text-teal-200/80">Daily breakdown by work center</p>
        </div>
        <div className="flex items-center justify-center h-64 p-4">
          <p className="text-gray-500 dark:text-slate-400">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-3 py-2.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <h3 className="relative z-10 text-sm font-bold text-white">Labor Hours Trend</h3>
        <p className="relative z-10 text-xs text-teal-200/80">Daily breakdown by work center</p>
      </div>
      <div className="p-3">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E5E7EB'} />
            <XAxis
              dataKey="date"
              stroke={isDark ? '#94a3b8' : '#6B7280'}
              style={{ fontSize: '10px', fontWeight: 'bold' }}
              textAnchor="end"
              interval={0}
              angle={-45}
              height={70}
              tick={{ fill: isDark ? '#cbd5e1' : '#374151' }}
            />
            <YAxis
              stroke={isDark ? '#94a3b8' : '#6B7280'}
              style={{ fontSize: '12px', fontWeight: 'bold' }}
              label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: isDark ? '#94a3b8' : '#6B7280' }}
              tick={{ fill: isDark ? '#cbd5e1' : '#374151' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1e293b' : 'white',
                border: `1px solid ${isDark ? '#475569' : '#E5E7EB'}`,
                borderRadius: '8px',
                padding: '8px',
                color: isDark ? '#f1f5f9' : '#111827',
                maxHeight: '200px',
                overflowY: 'auto',
                fontSize: '11px',
              }}
              formatter={(value: number) => [`${value.toFixed(1)} hrs`]}
            />
            <Legend
              wrapperStyle={{ color: isDark ? '#cbd5e1' : '#374151', fontSize: '10px' }}
              iconSize={10}
            />
            {workCenters.map((wc, index) => (
              <Bar
                key={wc}
                dataKey={wc}
                stackId="a"
                fill={COLORS[index % COLORS.length]}
                name={wc}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
