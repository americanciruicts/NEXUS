'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface StatusDistributionChartProps {
  data: { [key: string]: number } | undefined;
}

const STATUS_COLORS: { [key: string]: string } = {
  'IN_PROGRESS': '#2563EB', // blue-600
  'COMPLETED': '#059669', // emerald-600
  'ON_HOLD': '#D97706', // amber-600
  'CANCELLED': '#64748B', // slate-500
  'DRAFT': '#6B7280', // gray
  'CREATED': '#7C3AED', // violet-600
  'ARCHIVED': '#9CA3AF' // light gray
};

const STATUS_LABELS: { [key: string]: string } = {
  'IN_PROGRESS': 'In Progress',
  'COMPLETED': 'Completed',
  'ON_HOLD': 'On Hold',
  'CANCELLED': 'Cancelled',
  'DRAFT': 'Draft',
  'CREATED': 'Created',
  'ARCHIVED': 'Archived'
};

export default function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 px-5 sm:px-6 py-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <h3 className="relative z-10 text-base sm:text-lg font-bold text-white">Status Distribution</h3>
          <p className="relative z-10 text-xs text-blue-200/80">Traveler status breakdown</p>
        </div>
        <div className="flex items-center justify-center h-64 p-4">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  const chartData = Object.entries(data).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    status: status
  }));

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 px-5 sm:px-6 py-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <h3 className="relative z-10 text-base sm:text-lg font-bold text-white">Status Distribution</h3>
        <p className="relative z-10 text-xs text-blue-200/80">Traveler status breakdown</p>
      </div>
      <div className="p-4 sm:p-6">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            label={(entry) => `${entry.name}: ${entry.value}`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#6B7280'} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
