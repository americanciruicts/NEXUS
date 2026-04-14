'use client';

import { CpuChipIcon } from '@heroicons/react/24/outline';

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

  const activeCount = workCenters.filter(wc => wc.isActive).length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 px-4 py-2.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white/15 backdrop-blur-sm p-1.5 rounded-lg border border-white/20">
              <CpuChipIcon className="h-4 w-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Work Center Status</h3>
              <p className="text-[10px] text-teal-200/80">Live operations overview</p>
            </div>
          </div>
          {activeCount > 0 && (
            <span className="text-xs font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
              {activeCount} active
            </span>
          )}
        </div>
      </div>
      <div className="p-3 max-h-[350px] overflow-y-auto">
        {workCenters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CpuChipIcon className="w-8 h-8 text-gray-200 dark:text-slate-600 mb-2" />
            <p className="text-gray-400 dark:text-slate-500 text-sm">No work center activity</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {workCenters.map((wc, index) => (
              <div
                key={index}
                className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${wc.isActive ? 'bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-800' : 'bg-gray-50/80 dark:bg-slate-900/30'}`}
              >
                <div className="flex items-center gap-2">
                  <div className="relative flex-shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${wc.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-500'}`} />
                    {wc.isActive && <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-slate-200">{wc.name}</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">
                      {wc.isActive
                        ? wc.activeOperators.slice(0, 2).join(', ') + (wc.activeOperators.length > 2 ? ` +${wc.activeOperators.length - 2}` : '')
                        : 'Idle'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 dark:text-slate-500">{wc.totalJobs} job{wc.totalJobs !== 1 ? 's' : ''}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${wc.isActive ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>
                    {wc.isActive ? 'Active' : 'Idle'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
