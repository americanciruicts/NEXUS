'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface LaborTrendsChartProps {
  data: Array<{ date: string; hours: number }> | undefined;
}

export default function LaborTrendsChart({ data }: LaborTrendsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 px-5 sm:px-6 py-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <h3 className="relative z-10 text-base sm:text-lg font-bold text-white">Labor Hours Trend</h3>
          <p className="relative z-10 text-xs text-blue-200/80">Daily labor hour breakdown</p>
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
        <h3 className="relative z-10 text-base sm:text-lg font-bold text-white">Labor Hours Trend</h3>
        <p className="relative z-10 text-xs text-blue-200/80">Daily labor hour breakdown</p>
      </div>
      <div className="p-4 sm:p-6">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="date"
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
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#3B82F6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorHours)"
            name="Labor Hours"
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
