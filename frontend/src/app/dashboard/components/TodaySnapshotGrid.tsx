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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {snapshots.map((item, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${item.gradient} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-4 sm:p-5 ring-1 ${item.ring} relative overflow-hidden group`}
        >
          {/* Decorative circles */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-white/70 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-2">
                {item.title}
              </p>
              <h3 className="text-white text-2xl sm:text-3xl font-extrabold leading-none">
                {item.value}
              </h3>
              <p className="text-white/50 text-[10px] sm:text-xs mt-1.5 font-medium">
                {item.subtitle}
              </p>
            </div>
            <div className={`${item.iconBg} p-2.5 rounded-xl backdrop-blur-sm`}>
              <item.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${item.iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
