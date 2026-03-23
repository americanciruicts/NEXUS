'use client';

import Link from 'next/link';
import {
  BellAlertIcon,
  PauseCircleIcon,
  ExclamationTriangleIcon,
  BoltIcon,
} from '@heroicons/react/24/solid';
import { DashboardData } from '@/hooks/useDashboardData';

interface OverdueJob {
  id: number;
  job_number: string;
  part_description: string;
  due_date: string;
  status: string;
}

interface AlertsSummaryCardProps {
  data: DashboardData | null;
  overdueJobs?: OverdueJob[];
}

export default function AlertsSummaryCard({ data, overdueJobs = [] }: AlertsSummaryCardProps) {
  const alerts = [
    {
      title: 'Pending Approvals',
      count: data?.pending_approvals || 0,
      icon: BellAlertIcon,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      href: '/travelers?status=DRAFT'
    },
    {
      title: 'On Hold',
      count: data?.on_hold_travelers || 0,
      icon: PauseCircleIcon,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      iconBg: 'bg-orange-100 dark:bg-orange-900/40',
      href: '/travelers?status=ON_HOLD'
    },
    {
      title: 'Overdue',
      count: data?.overdue_travelers || 0,
      icon: ExclamationTriangleIcon,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      href: '/travelers?view=active'
    },
    {
      title: 'Active Labor',
      count: data?.active_labor_entries || 0,
      icon: BoltIcon,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      href: '/labor-tracking'
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden h-full flex flex-col">
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-3 py-2.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/15 backdrop-blur-sm p-2 rounded-xl border border-white/20">
            <BellAlertIcon className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Alerts & Action Items</h3>
            <p className="text-xs text-teal-200/80">Items requiring attention</p>
          </div>
        </div>
      </div>
      <div className="p-4 flex-1">
        {/* 2x2 alert grid */}
        <div className="grid grid-cols-2 gap-3">
          {alerts.map((alert, index) => (
            <Link
              key={index}
              href={alert.href}
              className={`flex items-center gap-3 p-3 rounded-xl border ${alert.borderColor} ${alert.bgColor} transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer`}
            >
              <div className={`${alert.iconBg} p-2 rounded-lg shadow-sm flex-shrink-0`}>
                <alert.icon className={`h-4 w-4 ${alert.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider truncate">{alert.title}</p>
                <p className={`text-xl font-extrabold ${alert.color} leading-none mt-0.5`}>{alert.count}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Active labor summary */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Active Labor</p>
          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-bold px-3 py-1 rounded-full">{data?.active_labor_entries || 0}</span>
        </div>

        {/* Overdue jobs list */}
        {overdueJobs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2.5">Overdue Jobs</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {overdueJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/travelers/${job.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate group-hover:text-red-700 dark:group-hover:text-red-400">{job.job_number}</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{job.part_description}</p>
                  </div>
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold whitespace-nowrap ml-2">Due: {job.due_date}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
