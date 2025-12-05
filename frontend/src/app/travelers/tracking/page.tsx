'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import Modal from '@/components/Modal';
import { PlayIcon, StopIcon, ClockIcon, CheckCircleIcon, FunnelIcon, EyeIcon, TrashIcon, PencilIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';

interface ActiveSession {
  id: number;
  job_number: string;
  work_center: string;
  operator_name: string;
  start_time: string;
  traveler_id?: number;
}

interface TrackingEntry {
  id: number;
  job_number: string;
  work_center: string;
  sequence_number?: number;
  operator_name: string;
  start_time: string;
  end_time: string;
  pause_time?: string;
  pause_duration?: number; // in hours
  hours_worked: number;
}

interface TimeEntryData {
  id: number;
  traveler_id: number;
  job_number: string;
  work_center: string;
  operator_name: string;
  start_time: string;
  end_time: string;
  pause_time?: string;
  hours_worked: number;
  pause_duration: number;
  is_completed: boolean;
}

export default function TravelerTracking() {
  const { user } = useAuth();
  const [jobNumber, setJobNumber] = useState('');
  const [workCenter, setWorkCenter] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [trackingEntries, setTrackingEntries] = useState<TrackingEntry[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    jobNumber: '',
    workCenter: '',
    startDate: '',
    endDate: ''
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TrackingEntry | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TrackingEntry | null>(null);

  // Manual entry and edit modals (ADMIN only)
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [manualEntryData, setManualEntryData] = useState({
    job_number: '',
    work_center: '',
    operator_name: '',
    start_time: '',
    end_time: '',
  });
  const [editEntryData, setEditEntryData] = useState({
    id: 0,
    job_number: '',
    work_center: '',
    operator_name: '',
    start_time: '',
    end_time: '',
  });

  // Timer for active session
  useEffect(() => {
    if (activeSession && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        const start = new Date(activeSession.start_time).getTime();
        const now = new Date().getTime();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeSession, isPaused]);

  // Load tracking entries and check for active session
  useEffect(() => {
    checkAutoStop5pm();
    loadTrackingEntries();
    checkActiveSession();
  }, []);

  // Check and auto-stop entries at 5pm
  const checkAutoStop5pm = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch('http://acidashboard.aci.local:100/api/tracking/check-auto-stop', {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.completed_count > 0) {
          setMessage(`⏰ Auto-stopped ${data.completed_count} entries at 5pm cutoff`);
          setTimeout(() => setMessage(''), 5000);
        }
      }
    } catch (error) {
      console.error('Error checking auto-stop:', error);
    }
  };

  const checkActiveSession = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch('http://acidashboard.aci.local:100/api/tracking/active', {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          const session: ActiveSession = {
            id: data.id,
            job_number: data.job_number,
            work_center: data.work_center,
            operator_name: data.operator_name,
            start_time: data.start_time,
            traveler_id: data.traveler_id
          };

          setActiveSession(session);
          setJobNumber(data.job_number);
          setWorkCenter(data.work_center);
          setOperatorName(data.operator_name);
        }
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  };

  const loadTrackingEntries = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch('http://acidashboard.aci.local:100/api/tracking/?days=30', {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();

        const entries: TrackingEntry[] = data
          .filter((entry: TimeEntryData) => entry.is_completed)
          .map((entry: TimeEntryData) => ({
            id: entry.id,
            job_number: entry.job_number,
            work_center: entry.work_center,
            sequence_number: undefined,
            operator_name: entry.operator_name,
            start_time: entry.start_time,
            end_time: entry.end_time,
            pause_time: entry.pause_time,
            pause_duration: entry.pause_duration || 0,
            hours_worked: entry.hours_worked
          }));

        setTrackingEntries(entries);
      }
    } catch (error) {
      console.error('Error loading tracking entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!jobNumber || !workCenter || !operatorName) {
      setMessage('⚠️ Please enter Job Number, Work Center, and Operator Name');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (activeSession) {
      setMessage('⚠️ Stop current session first');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const token = localStorage.getItem('nexus_token');
      const start = new Date();

      // Create tracking entry using the new independent API
      const createResponse = await fetch('http://acidashboard.aci.local:100/api/tracking/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'mock-token'}`
        },
        body: JSON.stringify({
          job_number: jobNumber,
          work_center: workCenter,
          operator_name: operatorName,
          start_time: start.toISOString()
        })
      });

      if (createResponse.ok) {
        const data = await createResponse.json();
        const session: ActiveSession = {
          id: data.id,
          job_number: jobNumber,
          work_center: workCenter,
          operator_name: operatorName,
          start_time: start.toISOString(),
          traveler_id: data.traveler_id
        };

        setActiveSession(session);
        setMessage(`✅ Started tracking ${jobNumber} at ${workCenter}`);
        setTimeout(() => setMessage(''), 3000);

        // Reload entries to show new entry in table
        loadTrackingEntries();
      } else {
        const error = await createResponse.json();
        setMessage(`❌ Error: ${error.detail || 'Failed to start tracking'}`);
        setTimeout(() => setMessage(''), 3000);
      }

    } catch (error) {
      console.error('Error starting session:', error);
      setMessage('❌ Error starting session');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handlePause = async () => {
    if (!activeSession) return;

    try {
      const token = localStorage.getItem('nexus_token');
      const pauseTime = new Date();

      const response = await fetch(`http://acidashboard.aci.local:100/api/tracking/${activeSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'mock-token'}`
        },
        body: JSON.stringify({
          pause_time: pauseTime.toISOString()
        })
      });

      if (response.ok) {
        setIsPaused(true);
        setMessage('⏸️ Tracking paused');
        setTimeout(() => setMessage(''), 3000);

        // Reload entries to update table
        loadTrackingEntries();
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.detail || 'Failed to pause tracking'}`);
        setTimeout(() => setMessage(''), 3000);
      }

    } catch (error) {
      console.error('Error pausing session:', error);
      setMessage('❌ Error pausing session');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleResume = () => {
    setIsPaused(false);
    setMessage('▶️ Tracking resumed');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleStop = async () => {
    if (!activeSession) return;

    try {
      const token = localStorage.getItem('nexus_token');
      const endTime = new Date();

      const response = await fetch(`http://acidashboard.aci.local:100/api/tracking/${activeSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'mock-token'}`
        },
        body: JSON.stringify({
          end_time: endTime.toISOString(),
          is_completed: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(null);
        setElapsedTime(0);
        setIsPaused(false);
        setWorkCenter('');
        setJobNumber('');
        setOperatorName('');
        setMessage(`✅ Completed tracking - Duration: ${data.hours_worked.toFixed(2)} hours`);
        setTimeout(() => setMessage(''), 5000);

        // Reload entries
        loadTrackingEntries();
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.detail || 'Failed to stop tracking'}`);
        setTimeout(() => setMessage(''), 3000);
      }

    } catch (error) {
      console.error('Error stopping session:', error);
      setMessage('❌ Error stopping session');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;

    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`http://acidashboard.aci.local:100/api/tracking/${entryToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('✅ Entry deleted successfully!');
        setTimeout(() => setMessage(''), 3000);
        loadTrackingEntries();
        setIsDeleteModalOpen(false);
        setEntryToDelete(null);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to delete entry: ${errorData.detail || 'Unknown error'}`);
        setTimeout(() => setMessage(''), 3000);
        console.error('Delete failed:', errorData);
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      setMessage('❌ Network error while deleting entry');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Handle manual entry submission (ADMIN only)
  // This creates a COMPLETED historical entry and does NOT start a timer
  const handleManualEntry = async () => {
    if (!manualEntryData.job_number || !manualEntryData.work_center || !manualEntryData.operator_name) {
      setMessage('❌ Please fill in all required fields');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!manualEntryData.start_time || !manualEntryData.end_time) {
      setMessage('❌ Start time and end time are required');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const token = localStorage.getItem('nexus_token');

      // Convert datetime-local to ISO
      const startTimeISO = convertLocalToISO(manualEntryData.start_time);
      const endTimeISO = convertLocalToISO(manualEntryData.end_time);

      // Validate that end time is after start time
      if (new Date(endTimeISO) <= new Date(startTimeISO)) {
        setMessage('❌ End time must be after start time');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      // Create a COMPLETED entry with both start and end times
      // This ensures NO timer is started for manual entries
      const response = await fetch('http://acidashboard.aci.local:100/api/tracking/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          job_number: manualEntryData.job_number,
          work_center: manualEntryData.work_center,
          operator_name: manualEntryData.operator_name,
          start_time: startTimeISO,
          end_time: endTimeISO,       // CRITICAL: End time is set, making this a completed entry
          is_completed: true          // CRITICAL: Mark as completed to prevent timer activation
        })
      });

      if (response.ok) {
        setMessage('✅ Manual entry created successfully!');
        setTimeout(() => setMessage(''), 3000);
        setIsManualEntryOpen(false);

        // Reset form
        setManualEntryData({
          job_number: '',
          work_center: '',
          operator_name: '',
          start_time: '',
          end_time: '',
        });

        // Reload entries but DO NOT check for active session (to avoid timer activation)
        loadTrackingEntries();
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.detail || 'Failed to create manual entry'}`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error creating manual entry:', error);
      setMessage('❌ Error creating manual entry');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Handle edit entry submission (ADMIN only)
  const handleEditEntry = async () => {
    if (!editEntryData.start_time || !editEntryData.end_time) {
      setMessage('❌ Start time and end time are required');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const token = localStorage.getItem('nexus_token');

      // Convert datetime-local to ISO
      const startTimeISO = convertLocalToISO(editEntryData.start_time);
      const endTimeISO = convertLocalToISO(editEntryData.end_time);

      // Validate that end time is after start time
      if (new Date(endTimeISO) <= new Date(startTimeISO)) {
        setMessage('❌ End time must be after start time');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      const response = await fetch(`http://acidashboard.aci.local:100/api/tracking/${editEntryData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          start_time: startTimeISO,
          end_time: endTimeISO,
          is_completed: true
        })
      });

      if (response.ok) {
        setMessage('✅ Entry updated successfully!');
        setTimeout(() => setMessage(''), 3000);
        setIsEditModalOpen(false);
        loadTrackingEntries();
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.detail || 'Failed to update entry'}`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      setMessage('❌ Error updating entry');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Open edit modal with entry data
  const openEditModal = (entry: TrackingEntry) => {
    setEditEntryData({
      id: entry.id,
      job_number: entry.job_number,
      work_center: entry.work_center,
      operator_name: entry.operator_name,
      start_time: entry.start_time,
      end_time: entry.end_time,
    });
    setIsEditModalOpen(true);
  };

  // Helper function to convert datetime-local input to ISO string
  // datetime-local values are in format "YYYY-MM-DDTHH:MM" and represent LOCAL time
  const convertLocalToISO = (datetimeLocal: string): string => {
    if (!datetimeLocal) return new Date().toISOString();

    // Create a Date object - this interprets the datetime as local time
    const date = new Date(datetimeLocal);

    // Return ISO string - this will be in UTC
    return date.toISOString();
  };

  // Helper function to convert ISO string to datetime-local format
  const convertISOToLocal = (isoString: string): string => {
    if (!isoString) return '';

    const date = new Date(isoString);

    // Format to YYYY-MM-DDTHH:MM for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Apply filters
  const filteredEntries = trackingEntries.filter(entry => {
    const matchJobNumber = !filters.jobNumber ||
      entry.job_number.toLowerCase().includes(filters.jobNumber.toLowerCase());

    const matchWorkCenter = !filters.workCenter ||
      entry.work_center.toLowerCase().includes(filters.workCenter.toLowerCase());

    const matchStartDate = !filters.startDate ||
      new Date(entry.start_time) >= new Date(filters.startDate);

    const matchEndDate = !filters.endDate ||
      new Date(entry.end_time) <= new Date(filters.endDate);

    return matchJobNumber && matchWorkCenter && matchStartDate && matchEndDate;
  });

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
        <div className="w-full space-y-4 p-4 lg:p-6">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 shadow-lg rounded-xl p-4 lg:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Live Traveler Tracking</h1>
                <p className="text-blue-100 mt-1 text-sm lg:text-base">Track work center time and location for travelers in real-time</p>
              </div>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => setIsManualEntryOpen(true)}
                  className="px-6 py-3 bg-white hover:bg-blue-50 text-blue-700 font-semibold rounded-lg transition-all shadow-lg flex items-center space-x-2 whitespace-nowrap self-start md:self-auto"
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  <span>Manual Entry</span>
                </button>
              )}
            </div>
          </div>

          {/* Message Alert */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
              message.includes('⚠️') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
              'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* Tracking Form */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-emerald-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Start Tracking
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={jobNumber}
                  onChange={(e) => setJobNumber(e.target.value)}
                  placeholder="Enter job number"
                  className="w-full px-4 py-2 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
                  disabled={!!activeSession}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Center <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={workCenter}
                  onChange={(e) => setWorkCenter(e.target.value)}
                  placeholder="Enter work center"
                  className="w-full px-4 py-2 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
                  disabled={!!activeSession}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operator Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Enter operator name"
                  className="w-full px-4 py-2 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
                  disabled={!!activeSession}
                />
              </div>
              <div className="flex items-end gap-2">
                {!activeSession ? (
                  <button
                    onClick={handleStart}
                    disabled={!jobNumber || !workCenter || !operatorName}
                    className="flex-1 px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-md flex items-center justify-center"
                  >
                    <PlayIcon className="w-5 h-5 mr-2" />
                    Start Tracking
                  </button>
                ) : (
                  <>
                    {!isPaused ? (
                      <button
                        onClick={handlePause}
                        className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-all shadow-md flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={handleResume}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-md flex items-center justify-center"
                      >
                        <PlayIcon className="w-5 h-5 mr-2" />
                        Resume
                      </button>
                    )}
                    <button
                      onClick={handleStop}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold rounded-lg transition-all shadow-md flex items-center justify-center"
                    >
                      <StopIcon className="w-5 h-5 mr-2" />
                      End
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Active Session Display */}
          {activeSession && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                  <h2 className="text-xl font-bold text-gray-900">Active Tracking Session</h2>
                </div>
                <div className="text-3xl font-mono font-bold text-blue-600">
                  {formatTime(elapsedTime)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Job Number</p>
                  <p className="text-xl font-bold text-gray-900">{activeSession.job_number}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Work Center</p>
                  <p className="text-xl font-bold text-gray-900">{activeSession.work_center}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Operator Name</p>
                  <p className="text-xl font-bold text-gray-900">{activeSession.operator_name}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Started At</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(activeSession.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Entries</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{trackingEntries.length}</p>
                </div>
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {trackingEntries.reduce((sum, entry) => sum + entry.hours_worked, 0).toFixed(2)}
                  </p>
                </div>
                <ClockIcon className="w-10 h-10 text-emerald-500" />
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Jobs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {new Set(trackingEntries.map(e => e.job_number)).size}
                  </p>
                </div>
                <CheckCircleIcon className="w-10 h-10 text-emerald-500" />
              </div>
            </div>
          </div>

          {/* Job Summary Cards */}
          {(() => {
            // Group entries by job_number and work_center
            const jobWorkCenterGroups = trackingEntries.reduce((acc, entry) => {
              const key = `${entry.job_number}|${entry.work_center}`;
              if (!acc[key]) {
                acc[key] = {
                  job_number: entry.job_number,
                  work_center: entry.work_center,
                  total_hours: 0,
                  entry_count: 0
                };
              }
              acc[key].total_hours += entry.hours_worked;
              acc[key].entry_count += 1;
              return acc;
            }, {} as Record<string, { job_number: string; work_center: string; total_hours: number; entry_count: number }>);

            const groups = Object.values(jobWorkCenterGroups);

            return groups.length > 0 ? (
              <div className="bg-white shadow-lg rounded-lg border-2 border-blue-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Job Summary by Work Center
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups.map((group, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Job Number</p>
                          <p className="text-lg font-bold text-gray-900 mt-1">{group.job_number}</p>
                        </div>
                        <div className="bg-blue-100 rounded-full p-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">
                            {group.work_center}
                          </span>
                        </div>
                        <div className="border-t border-blue-200 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Total Hours:</span>
                            <span className="text-xl font-bold text-emerald-600">
                              {group.total_hours.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">Entries:</span>
                            <span className="text-sm font-semibold text-gray-700">
                              {group.entry_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-blue-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter Tracking History
              </h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all shadow-sm"
              >
                <FunnelIcon className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Number</label>
                  <input
                    type="text"
                    value={filters.jobNumber}
                    onChange={(e) => setFilters({ ...filters, jobNumber: e.target.value })}
                    placeholder="Filter by job number"
                    className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Work Center</label>
                  <input
                    type="text"
                    value={filters.workCenter}
                    onChange={(e) => setFilters({ ...filters, workCenter: e.target.value })}
                    placeholder="Filter by work center"
                    className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="datetime-local"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="datetime-local"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tracking History Table */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-purple-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b-2 border-purple-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Tracking History
                </h2>
                <span className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">{filteredEntries.length} entries</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operator Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Work Center
                    </th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Time
                    </th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pause Duration
                    </th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Time
                    </th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Hours
                    </th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                          <span className="font-medium text-gray-900">{entry.job_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {entry.operator_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full">
                          {entry.sequence_number ? `${entry.sequence_number}. ${entry.work_center}` : entry.work_center}
                        </span>
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(entry.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false })}
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm">
                        {entry.pause_duration && entry.pause_duration > 0 ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md font-medium">
                            {entry.pause_duration.toFixed(2)} hrs
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entry.end_time ? new Date(entry.end_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false }) : '-'}
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-semibold text-emerald-600">
                          <ClockIcon className="w-4 h-4 mr-1 text-gray-400" />
                          {entry.hours_worked.toFixed(2)} hrs
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user?.role === 'ADMIN' ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedEntry(entry);
                                setIsModalOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => openEditModal(entry)}
                              className="text-green-600 hover:text-green-900"
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                setEntryToDelete(entry);
                                setIsDeleteModalOpen(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredEntries.length === 0 && (
                <div className="text-center py-12">
                  <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No tracking entries yet</p>
                  <p className="text-sm text-gray-400 mt-1">Start tracking to see your work history</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      {selectedEntry && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEntry(null);
          }}
          title={`Tracking Entry #${selectedEntry.id}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Job Number</label>
                <p className="text-base text-gray-900 mt-1">
                  {selectedEntry.job_number}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Operator</label>
                <p className="text-base text-gray-900 mt-1">
                  {selectedEntry.operator_name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Work Center</label>
                <p className="text-base text-gray-900 mt-1">
                  {selectedEntry.sequence_number
                    ? `${selectedEntry.sequence_number}. ${selectedEntry.work_center}`
                    : selectedEntry.work_center}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Total Hours</label>
                <p className="text-base font-semibold text-emerald-600 mt-1">
                  {selectedEntry.hours_worked.toFixed(2)} hrs
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <label className="text-sm font-semibold text-gray-600">Start Time</label>
              <p className="text-base text-gray-900 mt-1">
                {new Date(selectedEntry.start_time).toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false })}
              </p>
            </div>

            {selectedEntry.pause_time && (
              <div>
                <label className="text-sm font-semibold text-gray-600">Pause Started</label>
                <p className="text-base text-yellow-600 mt-1">
                  {new Date(selectedEntry.pause_time).toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false })}
                </p>
                {selectedEntry.pause_duration && selectedEntry.pause_duration > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Duration: <span className="font-semibold text-yellow-600">{selectedEntry.pause_duration.toFixed(2)} hours</span>
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-gray-600">End Time</label>
              <p className="text-base text-gray-900 mt-1">
                {new Date(selectedEntry.end_time).toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false })}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm text-emerald-700">
                ✅ This tracking entry is completed
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setEntryToDelete(null);
          }}
          title="Delete Tracking Entry"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium">
                Are you sure you want to delete this tracking entry?
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Job Number:</span>
                <span className="text-sm text-gray-900">{entryToDelete.job_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Operator:</span>
                <span className="text-sm text-gray-900">{entryToDelete.operator_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Work Center:</span>
                <span className="text-sm text-gray-900">
                  {entryToDelete.sequence_number
                    ? `${entryToDelete.sequence_number}. ${entryToDelete.work_center}`
                    : entryToDelete.work_center}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Hours Worked:</span>
                <span className="text-sm font-semibold text-emerald-600">
                  {entryToDelete.hours_worked.toFixed(2)} hrs
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setEntryToDelete(null);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Manual Entry Modal (ADMIN only) */}
      <Modal
        isOpen={isManualEntryOpen}
        onClose={() => {
          setIsManualEntryOpen(false);
          setManualEntryData({
            job_number: '',
            work_center: '',
            operator_name: '',
            start_time: '',
            end_time: '',
          });
        }}
        title="Manual Tracking Entry (Admin Only)"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsManualEntryOpen(false);
                setManualEntryData({
                  job_number: '',
                  work_center: '',
                  operator_name: '',
                  start_time: '',
                  end_time: '',
                });
              }}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleManualEntry}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all shadow-md"
            >
              Create Completed Entry
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-amber-900">
              ⚠️ Manual Entry Mode - For Backdating Only
            </p>
            <p className="text-xs text-amber-800 mt-1">
              This feature is for admins to create historical entries when operators forgot to start/stop their timers.
              No timer will be started - this creates a completed entry with your specified times.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Job Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={manualEntryData.job_number}
                onChange={(e) => setManualEntryData({ ...manualEntryData, job_number: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                placeholder="Enter job number"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Work Center <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={manualEntryData.work_center}
                onChange={(e) => setManualEntryData({ ...manualEntryData, work_center: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                placeholder="Enter work center"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Operator Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={manualEntryData.operator_name}
              onChange={(e) => setManualEntryData({ ...manualEntryData, operator_name: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              placeholder="Enter operator name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={manualEntryData.start_time}
                onChange={(e) => setManualEntryData({ ...manualEntryData, start_time: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={manualEntryData.end_time}
                onChange={(e) => setManualEntryData({ ...manualEntryData, end_time: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Entry Modal (ADMIN only) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditEntryData({
            id: 0,
            job_number: '',
            work_center: '',
            operator_name: '',
            start_time: '',
            end_time: '',
          });
        }}
        title="Edit Tracking Entry"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setEditEntryData({
                  id: 0,
                  job_number: '',
                  work_center: '',
                  operator_name: '',
                  start_time: '',
                  end_time: '',
                });
              }}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleEditEntry}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all shadow-md"
            >
              Save Changes
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-700 font-medium">
              Modify the start and end times for this tracking entry
            </p>
          </div>

          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-600">Job Number:</span>
              <span className="text-sm text-gray-900">{editEntryData.job_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-600">Work Center:</span>
              <span className="text-sm text-gray-900">{editEntryData.work_center}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-600">Operator:</span>
              <span className="text-sm text-gray-900">{editEntryData.operator_name}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={convertISOToLocal(editEntryData.start_time)}
                onChange={(e) => setEditEntryData({ ...editEntryData, start_time: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={convertISOToLocal(editEntryData.end_time)}
                onChange={(e) => setEditEntryData({ ...editEntryData, end_time: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
