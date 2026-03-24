'use client';

import Link from 'next/link';
import { PlayIcon, CheckIcon } from '@heroicons/react/24/solid';
import { ClockIcon } from '@heroicons/react/24/solid';

interface RawTrackingEntry {
  job_number: string;
  work_center: string;
  operator_name: string;
  start_time: string;
  end_time: string | null;
  hours_worked: number;
}

interface ActivityEvent {
  type: 'started' | 'completed';
  job_number: string;
  work_center: string;
  operator_name: string;
  timestamp: Date;
}

interface RecentActivityFeedProps {
  entries: RawTrackingEntry[];
}

export default function RecentActivityFeed({ entries }: RecentActivityFeedProps) {
  const events: ActivityEvent[] = [];

  entries.forEach((entry) => {
    if (entry.start_time) {
      events.push({
        type: 'started',
        job_number: entry.job_number,
        work_center: entry.work_center,
        operator_name: entry.operator_name,
        timestamp: new Date(entry.start_time)
      });
    }
    if (entry.end_time) {
      events.push({
        type: 'completed',
        job_number: entry.job_number,
        work_center: entry.work_center,
        operator_name: entry.operator_name,
        timestamp: new Date(entry.end_time)
      });
    }
  });

  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const recentEvents = events.slice(0, 12);

  const formatTime = (date: Date) => {
    const diffMs = new Date().getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden h-full flex flex-col">
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-3 py-2.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/15 backdrop-blur-sm p-2 rounded-xl border border-white/20">
            <ClockIcon className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Recent Activity</h3>
            <p className="text-xs text-teal-200/80">Latest tracking events</p>
          </div>
        </div>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {recentEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <ClockIcon className="w-10 h-10 text-gray-200 dark:text-slate-600 mb-2" />
            <p className="text-gray-400 dark:text-slate-500 text-sm font-medium">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentEvents.map((event, index) => (
              <Link key={index} href={`/travelers?search=${encodeURIComponent(event.job_number)}`} className="flex items-start gap-3 group hover:bg-gray-50 dark:hover:bg-slate-700 -mx-2 px-2 py-1 rounded-lg transition-colors">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${event.type === 'started' ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
                    {event.type === 'started' ? (
                      <PlayIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <CheckIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  {index < recentEvents.length - 1 && (
                    <div className="w-0.5 h-3 bg-gray-100 dark:bg-slate-700 mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate group-hover:text-blue-700 dark:group-hover:text-blue-400">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5 uppercase tracking-wider ${event.type === 'started' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'}`}>
                        {event.type === 'started' ? 'Start' : 'Done'}
                      </span>
                      {event.job_number}
                    </p>
                    <span className="text-[11px] text-gray-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0 font-medium">{formatTime(event.timestamp)}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    {event.operator_name} · {event.work_center}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
