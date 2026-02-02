'use client';

import { useState, useEffect } from 'react';
import { ClockIcon, CalculatorIcon } from '@heroicons/react/24/outline';
import { hoursToHumanReadable, parseDurationToHours } from '@/utils/timeHelpers';

interface DurationCalculatorProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  className?: string;
}

export default function DurationCalculator({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  className = '',
}: DurationCalculatorProps) {
  const [durationInput, setDurationInput] = useState('');
  const [calculatedHours, setCalculatedHours] = useState<number | null>(null);
  const [useEndTime, setUseEndTime] = useState(true); // true = manual end time, false = duration-based

  // Calculate hours when start/end time changes
  useEffect(() => {
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end.getTime() - start.getTime();
      const hours = diffMs / (1000 * 60 * 60);

      if (hours > 0) {
        setCalculatedHours(hours);
        // Update duration input to match
        if (!useEndTime) {
          setDurationInput(hoursToHumanReadable(hours));
        }
      } else {
        setCalculatedHours(null);
      }
    } else {
      setCalculatedHours(null);
    }
  }, [startTime, endTime, useEndTime]);

  const handleDurationChange = (value: string) => {
    setDurationInput(value);

    if (!startTime) {
      return;
    }

    // Parse duration string (e.g., "4h 30m" or "4.5")
    const hours = parseDurationToHours(value);

    if (hours && hours > 0) {
      // Calculate end time
      const start = new Date(startTime);
      const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

      // Format as datetime-local format (YYYY-MM-DDTHH:MM)
      const endTimeStr = end.toISOString().slice(0, 16);
      onEndTimeChange(endTimeStr);
      setCalculatedHours(hours);
    }
  };

  const handleModeSwitch = () => {
    setUseEndTime(!useEndTime);
    if (!useEndTime) {
      // Switching to end time mode - clear duration input
      setDurationInput('');
    } else if (calculatedHours) {
      // Switching to duration mode - populate duration input
      setDurationInput(hoursToHumanReadable(calculatedHours));
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mode Toggle */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <CalculatorIcon className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">Duration Calculator</span>
        </div>
        <button
          type="button"
          onClick={handleModeSwitch}
          className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          {useEndTime ? 'Use Duration' : 'Use End Time'}
        </button>
      </div>

      {/* Time Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Start Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
            required
          />
        </div>

        {useEndTime ? (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              required
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Duration <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={durationInput}
              onChange={(e) => handleDurationChange(e.target.value)}
              placeholder="e.g., 4h 30m or 4.5"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              disabled={!startTime}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter duration as &quot;4h 30m&quot; or decimal &quot;4.5&quot;
            </p>
          </div>
        )}
      </div>

      {/* Calculated Hours Preview */}
      {calculatedHours !== null && calculatedHours > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-900">Calculated Duration:</span>
            </div>
            <span className="text-sm font-bold text-emerald-700">
              {calculatedHours.toFixed(2)} hrs ({hoursToHumanReadable(calculatedHours)})
            </span>
          </div>

          {!useEndTime && endTime && (
            <div className="mt-2 text-xs text-emerald-800">
              End time: {new Date(endTime).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
      )}

      {/* Validation Warning */}
      {startTime && endTime && calculatedHours !== null && calculatedHours <= 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-red-900">
            ⚠️ Invalid Time Range
          </p>
          <p className="text-xs text-red-800 mt-1">
            End time must be after start time. Please check your times.
          </p>
        </div>
      )}

      {/* Unusual Duration Warnings */}
      {calculatedHours !== null && calculatedHours > 12 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-yellow-900">
            ⚠️ Unusually Long Duration
          </p>
          <p className="text-xs text-yellow-800 mt-1">
            This entry is over 12 hours. Please verify the times are correct.
          </p>
        </div>
      )}

      {calculatedHours !== null && calculatedHours < (5 / 60) && calculatedHours > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-yellow-900">
            ⚠️ Very Short Duration
          </p>
          <p className="text-xs text-yellow-800 mt-1">
            This entry is less than 5 minutes. Please verify the times are correct.
          </p>
        </div>
      )}
    </div>
  );
}
