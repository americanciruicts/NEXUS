'use client';

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
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 px-5 sm:px-6 py-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/15 backdrop-blur-sm p-2 rounded-xl border border-white/20">
            <ClockIcon className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Recent Activity</h3>
            <p className="text-xs text-blue-200/80">Latest tracking events</p>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
        {recentEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <ClockIcon className="w-10 h-10 text-gray-200 mb-2" />
            <p className="text-gray-400 text-sm font-medium">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentEvents.map((event, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${event.type === 'started' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                    {event.type === 'started' ? (
                      <PlayIcon className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <CheckIcon className="h-3.5 w-3.5 text-blue-600" />
                    )}
                  </div>
                  {index < recentEvents.length - 1 && (
                    <div className="w-0.5 h-3 bg-gray-100 mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5 uppercase tracking-wider ${event.type === 'started' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {event.type === 'started' ? 'Start' : 'Done'}
                      </span>
                      {event.job_number}
                    </p>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0 font-medium">{formatTime(event.timestamp)}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {event.operator_name} · {event.work_center}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
