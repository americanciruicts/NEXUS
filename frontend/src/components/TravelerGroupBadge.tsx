'use client';

interface TravelerGroupBadgeProps {
  sequence: number;
  total: number;
  label?: string;
}

export default function TravelerGroupBadge({ sequence, total, label }: TravelerGroupBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold print:bg-gray-100 print:text-black print:text-[8px] print:px-1 print:py-0">
      {sequence} of {total}
      {label && <span className="text-indigo-500 dark:text-indigo-400 print:text-gray-600">({label})</span>}
    </span>
  );
}
