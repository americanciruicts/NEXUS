'use client';

import { useState } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/solid';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDateChange: (start: Date, end: Date) => void;
}

export default function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [activePreset, setActivePreset] = useState('Last 7 Days');

  const pad = (n: number) => n.toString().padStart(2, '0');
  const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const [customStart, setCustomStart] = useState(toDateStr(startDate));
  const [customEnd, setCustomEnd] = useState(toDateStr(endDate));

  const handlePreset = (label: string) => {
    const end = new Date();
    const start = new Date();

    switch (label) {
      case 'Last 7 Days':
        start.setDate(end.getDate() - 7);
        break;
      case 'Last 30 Days':
        start.setDate(end.getDate() - 30);
        break;
      case 'Last 90 Days':
        start.setDate(end.getDate() - 90);
        break;
      case 'This Month':
        start.setDate(1); // First day of current month
        break;
    }

    setActivePreset(label);
    setShowCustom(false);
    onDateChange(start, end);
  };

  const handleCustomApply = () => {
    // Parse as local date (noon to avoid timezone edge cases)
    const parts1 = customStart.split('-');
    const parts2 = customEnd.split('-');
    const start = new Date(+parts1[0], +parts1[1] - 1, +parts1[2], 12, 0, 0);
    const end = new Date(+parts2[0], +parts2[1] - 1, +parts2[2], 12, 0, 0);
    if (start <= end) {
      setActivePreset('Custom Range');
      onDateChange(start, end);
    }
  };

  const presets = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Month'];

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15">
      <div className="flex items-center gap-2 text-sm font-bold text-white/80">
        <CalendarDaysIcon className="h-4 w-4 text-blue-300" />
        <span className="hidden sm:inline text-xs uppercase tracking-wider">Date Range</span>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((label) => (
          <button
            key={label}
            onClick={() => handlePreset(label)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 border ${
              activePreset === label && !showCustom
                ? 'bg-white/25 text-white border-white/40 shadow-sm'
                : 'text-white/90 bg-white/10 hover:bg-white/20 border-white/15 hover:border-white/30'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => { setShowCustom(!showCustom); setActivePreset('Custom Range'); }}
          className={`px-3 py-1.5 text-xs font-semibold text-white/90 rounded-lg transition-all duration-200 border ${
            showCustom || activePreset === 'Custom Range'
              ? 'bg-white/25 border-white/40 shadow-sm'
              : 'bg-white/10 hover:bg-white/20 border-white/15 hover:border-white/30'
          }`}
        >
          Custom Range
        </button>
      </div>

      {/* Custom date picker */}
      {showCustom && (
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-white/15 pt-2 sm:pt-0 sm:pl-3 mt-1 sm:mt-0">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white/90 border border-white/30 rounded-lg focus:border-white focus:ring-2 focus:ring-white/30 text-gray-900 font-medium"
            />
            <span className="hidden sm:inline text-white/60 self-center text-xs font-medium">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white/90 border border-white/30 rounded-lg focus:border-white focus:ring-2 focus:ring-white/30 text-gray-900 font-medium"
            />
          </div>
          <button
            onClick={handleCustomApply}
            className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-400 rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
