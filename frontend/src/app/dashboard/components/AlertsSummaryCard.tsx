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
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconBg: 'bg-amber-100'
    },
    {
      title: 'On Hold',
      count: data?.on_hold_travelers || 0,
      icon: PauseCircleIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      iconBg: 'bg-orange-100'
    },
    {
      title: 'Overdue',
      count: data?.overdue_travelers || 0,
      icon: ExclamationTriangleIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconBg: 'bg-red-100'
    },
    {
      title: 'Active Labor',
      count: data?.active_labor_entries || 0,
      icon: BoltIcon,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      iconBg: 'bg-emerald-100'
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 px-5 sm:px-6 py-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/15 backdrop-blur-sm p-2 rounded-xl border border-white/20">
            <BellAlertIcon className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Alerts & Action Items</h3>
            <p className="text-xs text-blue-200/80">Items requiring attention</p>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6 flex-1">
        {/* 2x2 alert grid */}
        <div className="grid grid-cols-2 gap-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-xl border ${alert.borderColor} ${alert.bgColor} transition-all hover:shadow-sm`}
            >
              <div className={`${alert.iconBg} p-2 rounded-lg shadow-sm flex-shrink-0`}>
                <alert.icon className={`h-4 w-4 ${alert.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate">{alert.title}</p>
                <p className={`text-xl font-extrabold ${alert.color} leading-none mt-0.5`}>{alert.count}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Active tracking summary */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Tracking</p>
          <span className="bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">{data?.active_tracking_entries || 0}</span>
        </div>

        {/* Overdue jobs list */}
        {overdueJobs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2.5">Overdue Jobs</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {overdueJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/travelers/${job.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate group-hover:text-red-700">{job.job_number}</p>
                    <p className="text-[11px] text-gray-500 truncate">{job.part_description}</p>
                  </div>
                  <p className="text-[11px] text-red-600 font-semibold whitespace-nowrap ml-2">Due: {job.due_date}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
