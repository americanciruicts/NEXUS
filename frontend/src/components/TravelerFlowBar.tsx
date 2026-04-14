'use client';

import Link from 'next/link';

interface FlowMember {
  id: number;
  jobNumber: string;
  travelerType: string;
  groupSequence: number;
  groupLabel?: string;
  quantity: number;
  status: string;
}

interface TravelerFlowBarProps {
  members: FlowMember[];
  currentTravelerId: number;
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-400',
  IN_PROGRESS: 'bg-yellow-400',
  COMPLETED: 'bg-green-500',
  ON_HOLD: 'bg-orange-400',
  CANCELLED: 'bg-red-400',
  DRAFT: 'bg-gray-400',
  RESTRICTED: 'bg-gray-300',
};

export default function TravelerFlowBar({ members, currentTravelerId }: TravelerFlowBarProps) {
  if (!members || members.length < 2) return null;

  const sorted = [...members].sort((a, b) => a.groupSequence - b.groupSequence);

  return (
    <div className="no-print bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 mb-3 shadow-sm">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
        <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 mr-1 flex-shrink-0 uppercase tracking-wide">Flow</span>
        {sorted.map((member, i) => {
          const isCurrent = member.id === currentTravelerId;
          const isRestricted = member.status === 'RESTRICTED';
          const statusColor = STATUS_COLORS[member.status] || 'bg-gray-400';

          return (
            <div key={member.id} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && (
                <svg className="w-4 h-4 text-gray-300 dark:text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
              {isRestricted ? (
                <div className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} />
                    <span className="text-xs font-medium text-gray-400 dark:text-slate-500">Restricted</span>
                  </div>
                </div>
              ) : isCurrent ? (
                <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400 ring-1 ring-blue-200 dark:ring-blue-800">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} />
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{member.groupLabel || member.travelerType}</span>
                    <span className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">({member.quantity})</span>
                  </div>
                </div>
              ) : (
                <Link
                  href={`/travelers/${member.id}`}
                  className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-500 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} />
                    <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{member.groupLabel || member.travelerType}</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">({member.quantity})</span>
                  </div>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
