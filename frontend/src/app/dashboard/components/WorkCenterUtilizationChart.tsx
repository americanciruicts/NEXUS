'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface WorkCenterUtilizationChartProps {
  data: Array<{ workCenter: string; hours: number }> | undefined;
}

const COLORS = ['#2563EB', '#7C3AED', '#06B6D4', '#059669', '#D97706', '#64748B', '#4F46E5', '#0D9488', '#EA580C', '#65A30D'];

export default function WorkCenterUtilizationChart({ data }: WorkCenterUtilizationChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 px-5 sm:px-6 py-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <h3 className="relative z-10 text-base sm:text-lg font-bold text-white">Work Center Utilization</h3>
          <p className="relative z-10 text-xs text-blue-200/80">Hours by work center</p>
        </div>
        <div className="flex items-center justify-center h-64 p-4">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 px-5 sm:px-6 py-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <h3 className="relative z-10 text-base sm:text-lg font-bold text-white">Work Center Utilization</h3>
        <p className="relative z-10 text-xs text-blue-200/80">Hours by work center</p>
      </div>
      <div className="p-4 sm:p-6">
      <div className="w-full overflow-x-auto">
        <div className="min-w-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="workCenter"
                stroke="#6B7280"
                style={{ fontSize: '12px', fontWeight: 'bold' }}
                textAnchor="middle"
                interval={0}
                height={40}
              />
              <YAxis
                stroke="#6B7280"
                style={{ fontSize: '12px', fontWeight: 'bold' }}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '8px'
                }}
                formatter={(value: number | undefined) => [`${value?.toFixed(1) || '0'} hrs`, 'Hours']}
              />
              <Legend />
              <Bar dataKey="hours" name="Labor Hours" radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>
    </div>
  );
}
