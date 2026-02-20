'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { ClockIcon } from '@heroicons/react/24/outline';

interface TravelerTrackingHoursChartProps {
  data: Array<{ job_number: string; total_hours: number }> | undefined;
}

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#84CC16'];

export default function TravelerTrackingHoursChart({ data }: TravelerTrackingHoursChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 px-5 sm:px-6 py-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex items-center gap-2">
            <div className="bg-white/15 backdrop-blur-sm p-2 rounded-xl border border-white/20">
              <ClockIcon className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Traveler Tracking Hours</h3>
              <p className="text-xs text-blue-200/80">Hours tracked per job</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center h-64 p-4">
          <p className="text-gray-500">No tracking data available</p>
        </div>
      </div>
    );
  }

  // Sort by hours descending and take top 10
  const sortedData = [...data].sort((a, b) => b.total_hours - a.total_hours).slice(0, 10);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 px-5 sm:px-6 py-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-2">
          <div className="bg-white/15 backdrop-blur-sm p-2 rounded-xl border border-white/20">
            <ClockIcon className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Traveler Tracking Hours (Top 10 Jobs)</h3>
            <p className="text-xs text-blue-200/80">Hours tracked per job</p>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            type="number"
            stroke="#6B7280"
            style={{ fontSize: '12px', fontWeight: 'bold' }}
            label={{ value: 'Hours', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            type="category"
            dataKey="job_number"
            stroke="#6B7280"
            style={{ fontSize: '11px', fontWeight: 'bold' }}
            width={90}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '8px'
            }}
            formatter={(value: number | undefined) => [`${value?.toFixed(1) || '0'} hrs`, 'Total Hours']}
          />
          <Legend />
          <Bar dataKey="total_hours" name="Total Hours" radius={[0, 4, 4, 0]}>
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
