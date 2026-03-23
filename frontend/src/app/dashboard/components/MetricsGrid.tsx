'use client';

import Link from 'next/link';
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
      iconBg: 'bg-teal-500/20',
      iconColor: 'text-teal-300',
      gradient: 'from-teal-600 via-teal-700 to-teal-800',
      ring: 'ring-teal-500/20',
      href: '/travelers?status=IN_PROGRESS'
    },
    {
      title: 'Completed',
      value: data?.travelers_completed || 0,
      subtitle: `${data?.completion_rate?.toFixed(1) || 0}% completion rate`,
      icon: CheckBadgeIcon,
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-300',
      gradient: 'from-emerald-600 via-emerald-700 to-green-800',
      ring: 'ring-emerald-500/20',
      href: '/travelers?status=COMPLETED'
    },
    {
      title: 'Labor Hours',
      value: data?.total_labor_hours?.toFixed(1) || '0.0',
      subtitle: 'Total hours logged',
      icon: ClockIcon,
      iconBg: 'bg-violet-500/20',
      iconColor: 'text-violet-300',
      gradient: 'from-violet-600 via-indigo-700 to-purple-800',
      ring: 'ring-violet-500/20',
      href: '/travelers/tracking'
    },
    {
      title: 'On Hold',
      value: data?.on_hold_travelers || 0,
      subtitle: 'Requires attention',
      icon: ExclamationTriangleIcon,
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-300',
      gradient: 'from-amber-500 via-orange-600 to-orange-700',
      ring: 'ring-amber-500/20',
      href: '/travelers?status=ON_HOLD'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((metric, index) => (
        <Link
          key={index}
          href={metric.href}
          className={`bg-gradient-to-br ${metric.gradient} rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-3 ring-1 ${metric.ring} relative overflow-hidden group cursor-pointer`}
        >
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider mb-1">
                {metric.title}
              </p>
              <h3 className="text-white text-xl font-extrabold leading-none">
                {metric.value}
              </h3>
              <p className="text-white/50 text-[9px] mt-1 font-medium">
                {metric.subtitle}
              </p>
            </div>
            <div className={`${metric.iconBg} p-2 rounded-lg backdrop-blur-sm`}>
              <metric.icon className={`h-4 w-4 ${metric.iconColor}`} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
