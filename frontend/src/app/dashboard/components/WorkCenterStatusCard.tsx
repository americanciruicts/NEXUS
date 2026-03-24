'use client';

import { CpuChipIcon } from '@heroicons/react/24/solid';

interface LiveUpdate {
  job_number: string;
  work_center: string;
  operator_name: string;
  is_active: boolean;
}

interface WorkCenterStatusCardProps {
  liveUpdates: LiveUpdate[];
}

export default function WorkCenterStatusCard({ liveUpdates }: WorkCenterStatusCardProps) {
  const workCenterMap = new Map<string, { activeOperators: string[]; jobs: string[] }>();

  liveUpdates.forEach((update) => {
    if (!workCenterMap.has(update.work_center)) {
      workCenterMap.set(update.work_center, { activeOperators: [], jobs: [] });
    }
    const wc = workCenterMap.get(update.work_center)!;
    if (update.is_active && !wc.activeOperators.includes(update.operator_name)) {
      wc.activeOperators.push(update.operator_name);
    }
    wc.jobs.push(update.job_number);
  });

  const workCenters = Array.from(workCenterMap.entries())
    .map(([name, data]) => ({
      name,
      activeOperators: data.activeOperators,
      totalJobs: data.jobs.length,
      isActive: data.activeOperators.length > 0
    }))
    .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden h-full flex flex-col">
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-3 py-2.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/15 backdrop-blur-sm p-2 rounded-xl border border-white/20">
            <CpuChipIcon className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Work Center Status</h3>
            <p className="text-xs text-teal-200/80">Live operations overview</p>
          </div>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col justify-center">
        {workCenters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <CpuChipIcon className="w-10 h-10 text-gray-200 dark:text-slate-600 mb-2" />
            <p className="text-gray-400 dark:text-slate-500 text-sm font-medium">No work center activity</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {workCenters.map((wc, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${wc.isActive ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 shadow-sm' : 'bg-gray-50/80 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${wc.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-500'}`} />
                    {wc.isActive && (
                      <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-slate-200">{wc.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {wc.isActive
                        ? `${wc.activeOperators.slice(0, 2).join(', ')}${wc.activeOperators.length > 2 ? ` +${wc.activeOperators.length - 2}` : ''}`
                        : 'Idle'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${wc.isActive ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>
                    {wc.isActive ? 'Active' : 'Idle'}
                  </span>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">{wc.totalJobs} job{wc.totalJobs !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
