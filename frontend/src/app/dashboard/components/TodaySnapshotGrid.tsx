'use client';

import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  SignalIcon,
} from '@heroicons/react/24/solid';

interface RawTrackingEntry {
  job_number: string;
  work_center: string;
  operator_name: string;
  start_time: string;
  end_time: string | null;
  hours_worked: number;
}

interface TodaySnapshotGridProps {
  entries: RawTrackingEntry[];
}

export default function TodaySnapshotGrid({ entries }: TodaySnapshotGridProps) {
  const todayStr = new Date().toDateString();

  const todayEntries = entries.filter((e) => new Date(e.start_time).toDateString() === todayStr);

  const startedToday = todayEntries.length;
  const completedToday = todayEntries.filter((e) => e.end_time !== null).length;
  const hoursToday = todayEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const activeNow = todayEntries.filter((e) => !e.end_time).length;

  const snapshots = [
    {
      title: 'Tracking In',
      value: String(startedToday),
      subtitle: 'Entries opened today',
      icon: ArrowDownTrayIcon,
      iconBg: 'bg-sky-500/20',
      iconColor: 'text-sky-300',
      gradient: 'from-sky-600 via-sky-700 to-cyan-800',
      ring: 'ring-sky-500/20'
    },
    {
      title: 'Tracking Out',
      value: String(completedToday),
      subtitle: 'Entries closed today',
      icon: ArrowUpTrayIcon,
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-300',
      gradient: 'from-emerald-600 via-emerald-700 to-teal-800',
      ring: 'ring-emerald-500/20'
    },
    {
      title: "Today's Hours",
      value: hoursToday.toFixed(1),
      subtitle: 'Labor hours logged',
      icon: ClockIcon,
      iconBg: 'bg-violet-500/20',
      iconColor: 'text-violet-300',
      gradient: 'from-violet-600 via-violet-700 to-purple-800',
      ring: 'ring-violet-500/20'
    },
    {
      title: 'Live Sessions',
      value: String(activeNow),
      subtitle: activeNow > 0 ? 'Currently running' : 'None active',
      icon: SignalIcon,
      iconBg: activeNow > 0 ? 'bg-rose-500/20' : 'bg-slate-500/20',
      iconColor: activeNow > 0 ? 'text-rose-300' : 'text-slate-400',
      gradient: activeNow > 0 ? 'from-rose-600 via-rose-700 to-pink-800' : 'from-slate-500 via-slate-600 to-slate-700',
      ring: activeNow > 0 ? 'ring-rose-500/20' : 'ring-slate-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {snapshots.map((item, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${item.gradient} rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 px-3 py-2 ring-1 ${item.ring} relative overflow-hidden group`}
        >
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <p className="text-white/70 text-[9px] font-semibold uppercase tracking-wider">
                {item.title}
              </p>
              <h3 className="text-white text-lg font-extrabold leading-none">
                {item.value}
              </h3>
              <p className="text-white/50 text-[8px] mt-0.5 font-medium">
                {item.subtitle}
              </p>
            </div>
            <div className={`${item.iconBg} p-1.5 rounded-lg backdrop-blur-sm`}>
              <item.icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
