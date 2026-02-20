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
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 px-5 sm:px-6 py-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/15 backdrop-blur-sm p-2 rounded-xl border border-white/20">
            <CpuChipIcon className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Work Center Status</h3>
            <p className="text-xs text-blue-200/80">Live operations overview</p>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center">
        {workCenters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <CpuChipIcon className="w-10 h-10 text-gray-200 mb-2" />
            <p className="text-gray-400 text-sm font-medium">No work center activity</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {workCenters.map((wc, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${wc.isActive ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-gray-50/80 border-gray-200'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${wc.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    {wc.isActive && (
                      <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{wc.name}</p>
                    <p className="text-xs text-gray-500">
                      {wc.isActive
                        ? `${wc.activeOperators.slice(0, 2).join(', ')}${wc.activeOperators.length > 2 ? ` +${wc.activeOperators.length - 2}` : ''}`
                        : 'Idle'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${wc.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {wc.isActive ? 'Active' : 'Idle'}
                  </span>
                  <p className="text-[11px] text-gray-400 mt-1">{wc.totalJobs} job{wc.totalJobs !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
