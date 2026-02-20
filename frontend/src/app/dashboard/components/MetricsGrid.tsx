'use client';

import {
  BoltIcon,
  CheckBadgeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
import { DashboardData } from '@/hooks/useDashboardData';

interface MetricsGridProps {
  data: DashboardData | null;
}

export default function MetricsGrid({ data }: MetricsGridProps) {
  const metrics = [
    {
      title: 'In Progress',
      value: data?.status_distribution?.IN_PROGRESS || 0,
      subtitle: 'Active travelers',
      icon: BoltIcon,
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-300',
      gradient: 'from-blue-600 via-blue-700 to-blue-800',
      ring: 'ring-blue-500/20'
    },
    {
      title: 'Completed',
      value: data?.travelers_completed || 0,
      subtitle: `${data?.completion_rate?.toFixed(1) || 0}% completion rate`,
      icon: CheckBadgeIcon,
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-300',
      gradient: 'from-emerald-600 via-emerald-700 to-green-800',
      ring: 'ring-emerald-500/20'
    },
    {
      title: 'Labor Hours',
      value: data?.total_labor_hours?.toFixed(1) || '0.0',
      subtitle: 'Total hours logged',
      icon: ClockIcon,
      iconBg: 'bg-violet-500/20',
      iconColor: 'text-violet-300',
      gradient: 'from-violet-600 via-indigo-700 to-purple-800',
      ring: 'ring-violet-500/20'
    },
    {
      title: 'On Hold',
      value: data?.on_hold_travelers || 0,
      subtitle: 'Requires attention',
      icon: ExclamationTriangleIcon,
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-300',
      gradient: 'from-amber-500 via-orange-600 to-orange-700',
      ring: 'ring-amber-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${metric.gradient} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-4 sm:p-5 ring-1 ${metric.ring} relative overflow-hidden group`}
        >
          {/* Decorative circles */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-white/70 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-2">
                {metric.title}
              </p>
              <h3 className="text-white text-2xl sm:text-3xl font-extrabold leading-none">
                {metric.value}
              </h3>
              <p className="text-white/50 text-[10px] sm:text-xs mt-1.5 font-medium">
                {metric.subtitle}
              </p>
            </div>
            <div className={`${metric.iconBg} p-2.5 rounded-xl backdrop-blur-sm`}>
              <metric.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${metric.iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
