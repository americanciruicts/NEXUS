'use client';

import { useTheme } from '@/context/ThemeContext';

interface StuckTraveler {
  id: number;
  job_number: string;
  part_number: string;
  work_center: string;
  department: string;
  idle_hours: number;
  idle_days: number;
  last_activity: string | null;
  due_date: string | null;
  priority: string;
}

interface StuckTravelersCardProps {
  data: StuckTraveler[] | undefined;
}

const priorityColors: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  URGENT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  NORMAL: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400',
  LOW: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function StuckTravelersCard({ data }: StuckTravelersCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const stuckList = data || [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-rose-800 px-4 py-2.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Stuck Travelers</h3>
            <p className="text-[10px] text-red-200/80">Idle &gt; 48 hours in a work center</p>
          </div>
          {stuckList.length > 0 && (
            <span className="text-xs font-bold text-white bg-white/25 px-2 py-0.5 rounded-full">
              {stuckList.length}
            </span>
          )}
        </div>
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        {stuckList.length === 0 ? (
          <div className="flex items-center justify-center h-32 p-4">
            <p className="text-gray-500 dark:text-slate-400 text-sm">No stuck travelers</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {stuckList.map((t) => (
              <div key={t.id} className="px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{t.job_number}</span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${priorityColors[t.priority] || priorityColors.NORMAL}`}>
                      {t.priority}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                    {t.idle_days >= 1 ? `${t.idle_days}d idle` : `${Math.round(t.idle_hours)}h idle`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-slate-400">
                  <span>{t.part_number}</span>
                  <span className="font-medium">{t.work_center} / {t.department}</span>
                </div>
                {t.due_date && (
                  <div className="text-[9px] text-gray-400 dark:text-slate-500 mt-0.5">
                    Due: {t.due_date}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
