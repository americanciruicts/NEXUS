'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import Modal from '@/components/Modal';
import { ClockIcon, UserIcon, DocumentTextIcon, PlayIcon, StopIcon, PencilIcon, TrashIcon, EyeIcon, FunnelIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { formatHoursDualCompact, formatHoursDual } from '@/utils/timeHelpers';
import Autocomplete from '@/components/ui/Autocomplete';
import DurationCalculator from '@/components/ui/DurationCalculator';

interface LaborEntry {
  id: number;
  traveler_id: number;
  step_id?: number;
  employee_id: number;
  employee_name: string;
  start_time: string;
  pause_time?: string;
  end_time?: string;
  hours_worked: number;
  description: string;
  is_completed: boolean;
  created_at: string;
  // Additional fields for display
  job_number?: string;
  work_center?: string;
  sequence_number?: number;
}

export default function LaborTrackingPage() {
  const { user } = useAuth();
  const [laborEntries, setLaborEntries] = useState<LaborEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    jobNumber: '',
    workCenter: '',
    operatorName: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
  });
  const [newEntry, setNewEntry] = useState({
    job_number: '',
    work_center: '',
    operator_name: '',
    date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
  });
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [pauseTime, setPauseTime] = useState<Date | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LaborEntry | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<LaborEntry | null>(null);

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

  // Filter states
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    checkAutoStop5pm();
    fetchLaborEntries();
    checkActiveEntry();
  }, []);

  // Autocomplete fetch functions
  const fetchJobNumbers = async (query: string) => {
    try {
      const token = localStorage.getItem('nexus_token');
      const url = query
        ? `http://acidashboard.aci.local:100/api/search/autocomplete/job-numbers?q=${encodeURIComponent(query)}&limit=10`
        : 'http://acidashboard.aci.local:100/api/search/autocomplete/job-numbers?limit=10';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.map((item: any) => ({
          value: item.job_number,
          label: item.label,
          description: item.customer_name,
          ...item
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching job numbers:', error);
      return [];
    }
  };

  const fetchWorkCenters = async (query: string) => {
    try {
      const token = localStorage.getItem('nexus_token');
      const url = query
        ? `http://acidashboard.aci.local:100/api/search/autocomplete/work-centers?q=${encodeURIComponent(query)}&limit=10`
        : 'http://acidashboard.aci.local:100/api/search/autocomplete/work-centers?limit=10';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.map((item: any) => ({
          value: item.value,
          label: item.label,
          description: item.description,
          ...item
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching work centers:', error);
      return [];
    }
  };

  const fetchOperators = async (query: string) => {
    try {
      const token = localStorage.getItem('nexus_token');
      const url = query
        ? `http://acidashboard.aci.local:100/api/search/autocomplete/operators?q=${encodeURIComponent(query)}&limit=10`
        : 'http://acidashboard.aci.local:100/api/search/autocomplete/operators?limit=10';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.map((item: any) => ({
          value: item.value,
          label: item.label,
          description: item.role,
          ...item
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching operators:', error);
      return [];
    }
  };

  // Check and auto-stop entries at 5pm
  const checkAutoStop5pm = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch('http://acidashboard.aci.local:100/api/labor/check-auto-stop', {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.completed_count > 0) {
          alert(`⏰ Auto-stopped ${data.completed_count} entries at 5pm cutoff`);
        }
      }
    } catch (error) {
      console.error('Error checking auto-stop:', error);
    }
  };

  // Timer effect
  useEffect(() => {
    if (isTimerRunning && startTime && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(diff);
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
  }, [isTimerRunning, startTime, isPaused]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter labor entries
  const filteredEntries = laborEntries.filter(entry => {
    const parts = entry.description?.split(' - ') || [];
    const workCenter = parts[0] || entry.work_center || '';
    const operatorName = parts[1] || entry.employee_name || '';

    // Filter by job number
    if (filter.jobNumber && !entry.job_number?.toLowerCase().includes(filter.jobNumber.toLowerCase())) {
      return false;
    }

    // Filter by work center
    if (filter.workCenter && !workCenter.toLowerCase().includes(filter.workCenter.toLowerCase())) {
      return false;
    }

    // Filter by operator name
    if (filter.operatorName && !operatorName.toLowerCase().includes(filter.operatorName.toLowerCase())) {
      return false;
    }

    // Filter by date range
    if (filter.startDate) {
      const entryDate = new Date(entry.start_time).toISOString().split('T')[0];
      if (entryDate < filter.startDate) {
        return false;
      }
    }

    if (filter.endDate) {
      const entryDate = new Date(entry.start_time).toISOString().split('T')[0];
      if (entryDate > filter.endDate) {
        return false;
      }
    }

    return true;
  });

  const checkActiveEntry = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch('http://acidashboard.aci.local:100/api/labor/active', {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          setActiveEntryId(data.id);
          const start = new Date(data.start_time);
          setStartTime(start);
          setIsTimerRunning(true);

          // Extract job number and work center from description
          const parts = data.description.split(' - ');
          if (parts.length >= 2) {
            setNewEntry({
              job_number: data.job_number || '',
              work_center: parts[0] || '',
              operator_name: parts[1] || '',
              date: start.toISOString().slice(0, 10),
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking active entry:', error);
    }
  };

  const fetchLaborEntries = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch('http://acidashboard.aci.local:100/api/labor/my-entries?days=30', {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Fetch traveler info for each entry to get job number
        const entriesWithTravelerInfo = await Promise.all(
          data.map(async (entry: LaborEntry) => {
            try {
              const travelerResponse = await fetch(`http://acidashboard.aci.local:100/api/travelers/${entry.traveler_id}`, {
                headers: {
                  'Authorization': `Bearer ${token || 'mock-token'}`
                }
              });
              if (travelerResponse.ok) {
                const traveler = await travelerResponse.json();
                return {
                  ...entry,
                  job_number: traveler.job_number,
                  work_center: traveler.work_center || 'N/A'
                };
              }
            } catch (err) {
              console.error('Error fetching traveler info:', err);
            }
            return entry;
          })
        );

        // Filter out entries with negative hours
        const validEntries = entriesWithTravelerInfo.filter(entry => entry.hours_worked >= 0);
        setLaborEntries(validEntries);
      } else {
        console.error('Failed to fetch labor entries');
      }
    } catch (error) {
      console.error('Error fetching labor entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startTimer = async () => {
    if (!newEntry.job_number || !newEntry.work_center || !newEntry.operator_name) {
      alert('❌ Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('nexus_token');

      // First, find the traveler by job number
      const travelersResponse = await fetch('http://acidashboard.aci.local:100/api/travelers/', {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (!travelersResponse.ok) {
        alert('❌ Failed to fetch travelers');
        return;
      }

      const travelers = await travelersResponse.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const traveler = travelers.find((t: any) =>
        String(t.job_number).toLowerCase() === newEntry.job_number.toLowerCase()
      );

      if (!traveler) {
        alert(`❌ Job number ${newEntry.job_number} not found`);
        return;
      }

      const description = `${newEntry.work_center} - ${newEntry.operator_name}`;
      // Use current system time when Start button is clicked
      const now = new Date();

      const requestBody = {
        traveler_id: traveler.id,
        start_time: now.toISOString(),
        description: description
      };

      const response = await fetch('http://acidashboard.aci.local:100/api/labor/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'mock-token'}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        setActiveEntryId(data.id);
        setStartTime(now);
        setElapsedTime(0);
        setIsTimerRunning(true);
        alert('✅ Timer started!');

        // Reload entries to show new entry in table
        fetchLaborEntries();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail || 'Failed to start timer'}`);
      }
    } catch (error) {
      console.error('Error starting timer:', error);
      alert('❌ Error starting timer');
    }
  };

  const pauseTimer = async () => {
    if (!activeEntryId) {
      alert('❌ No active timer found');
      return;
    }

    try {
      const token = localStorage.getItem('nexus_token');
      const currentPauseTime = new Date();

      const response = await fetch(`http://acidashboard.aci.local:100/api/labor/${activeEntryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'mock-token'}`
        },
        body: JSON.stringify({
          pause_time: currentPauseTime.toISOString()
        })
      });

      if (response.ok) {
        setIsPaused(true);
        setPauseTime(currentPauseTime);
        alert('⏸️ Timer paused!');

        // Reload entries to update table
        fetchLaborEntries();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail || 'Failed to pause timer'}`);
      }
    } catch (error) {
      console.error('Error pausing timer:', error);
      alert('❌ Error pausing timer');
    }
  };

  const resumeTimer = () => {
    setIsPaused(false);
    setPauseTime(null);
    alert('▶️ Timer resumed!');
  };

  const stopTimer = async () => {
    if (!activeEntryId) {
      alert('❌ No active timer found');
      return;
    }

    try {
      const token = localStorage.getItem('nexus_token');
      const endTime = new Date();

      const response = await fetch(`http://acidashboard.aci.local:100/api/labor/${activeEntryId}`, {
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
        setIsTimerRunning(false);
        setIsPaused(false);
        setElapsedTime(0);
        setStartTime(null);
        setPauseTime(null);
        setActiveEntryId(null);
        setNewEntry({
          job_number: '',
          work_center: '',
          operator_name: '',
          date: new Date().toISOString().slice(0, 10),
        });
        alert('✅ Timer stopped and entry saved!');
        fetchLaborEntries();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail || 'Failed to stop timer'}`);
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
      alert('❌ Error stopping timer');
    }
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;

    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`http://acidashboard.aci.local:100/api/labor/${entryToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('✅ Entry deleted successfully!');
        fetchLaborEntries();
        setIsDeleteModalOpen(false);
        setEntryToDelete(null);
      } else {
        const errorData = await response.json();
        alert(`❌ Failed to delete entry: ${errorData.detail || 'Unknown error'}`);
        console.error('Delete failed:', errorData);
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('❌ Network error while deleting entry');
    }
  };

  const completeLaborEntry = async (entryId: number) => {
    try {
      const token = localStorage.getItem('nexus_token');
      const endTime = new Date().toISOString();

      const response = await fetch(`http://acidashboard.aci.local:100/api/labor/${entryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'mock-token'}`
        },
        body: JSON.stringify({
          end_time: endTime,
          is_completed: true
        })
      });

      if (response.ok) {
        alert('✅ Labor entry completed!');
        fetchLaborEntries();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail || 'Failed to complete labor entry'}`);
      }
    } catch (error) {
      console.error('Error completing labor entry:', error);
      alert('❌ Error completing labor entry');
    }
  };

  const applyFilters = () => {
    fetchLaborEntries();
  };

  const clearFilters = () => {
    setFilter({
      jobNumber: '',
      workCenter: '',
      operatorName: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
    });
    fetchLaborEntries();
  };

  const getTotalHours = () => {
    const total = laborEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
    return formatHoursDual(total);
  };

  // Manual entry handler (ADMIN only)
  // This creates a COMPLETED historical entry and does NOT start a timer
  const handleManualEntry = async () => {
    if (!manualEntryData.job_number || !manualEntryData.work_center || !manualEntryData.operator_name || !manualEntryData.start_time || !manualEntryData.end_time) {
      alert('❌ Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('nexus_token');

      // Find traveler by job number
      const travelersResponse = await fetch('http://acidashboard.aci.local:100/api/travelers/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!travelersResponse.ok) {
        alert('❌ Failed to fetch travelers');
        return;
      }

      const travelers = await travelersResponse.json();
      const traveler = travelers.find((t: { job_number: string; id: number }) =>
        String(t.job_number).toLowerCase() === manualEntryData.job_number.toLowerCase()
      );

      if (!traveler) {
        alert(`❌ Job number ${manualEntryData.job_number} not found`);
        return;
      }

      const startTimeISO = convertLocalToISO(manualEntryData.start_time);
      const endTimeISO = convertLocalToISO(manualEntryData.end_time);

      // Validate that end time is after start time
      if (new Date(endTimeISO) <= new Date(startTimeISO)) {
        alert('❌ End time must be after start time');
        return;
      }

      // Create a COMPLETED entry with both start and end times
      // This ensures NO timer is started for manual entries
      const response = await fetch('http://acidashboard.aci.local:100/api/labor/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          traveler_id: traveler.id,
          start_time: startTimeISO,
          end_time: endTimeISO,  // CRITICAL: End time is set, making this a completed entry
          description: `${manualEntryData.work_center} - ${manualEntryData.operator_name}`,
          is_completed: true     // CRITICAL: Mark as completed to prevent timer activation
        })
      });

      if (response.ok) {
        alert('✅ Manual entry created successfully!');
        setIsManualEntryOpen(false);
        setManualEntryData({
          job_number: '',
          work_center: '',
          operator_name: '',
          start_time: '',
          end_time: '',
        });
        // Reload entries but DO NOT check for active entry (to avoid timer activation)
        fetchLaborEntries();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail || 'Failed to create entry'}`);
      }
    } catch (error) {
      console.error('Error creating manual entry:', error);
      alert('❌ Error creating manual entry');
    }
  };

  // Edit entry handler (ADMIN only)
  const handleEditEntry = async () => {
    if (!editEntryData.id) return;

    try {
      const token = localStorage.getItem('nexus_token');

      const response = await fetch(`http://acidashboard.aci.local:100/api/labor/${editEntryData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          start_time: editEntryData.start_time,
          end_time: editEntryData.end_time,
          description: `${editEntryData.work_center} - ${editEntryData.operator_name}`
        })
      });

      if (response.ok) {
        alert('✅ Entry updated successfully!');
        setIsEditModalOpen(false);
        fetchLaborEntries();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail || 'Failed to update entry'}`);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('❌ Error updating entry');
    }
  };

  const openEditModal = (entry: LaborEntry) => {
    const parts = entry.description?.split(' - ') || [];
    setEditEntryData({
      id: entry.id,
      job_number: entry.job_number || '',
      work_center: parts[0] || entry.work_center || '',
      operator_name: parts[1] || entry.employee_name || '',
      start_time: entry.start_time,
      end_time: entry.end_time || new Date().toISOString(),
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

  // Bulk selection functions
  const toggleSelectEntry = (id: number) => {
    if (selectedEntries.includes(id)) {
      setSelectedEntries(selectedEntries.filter(entryId => entryId !== id));
    } else {
      setSelectedEntries([...selectedEntries, id]);
    }
  };

  const selectAll = () => {
    const currentPageIds = filteredEntries.map(e => e.id);
    const allCurrentPageSelected = currentPageIds.every(id => selectedEntries.includes(id));

    if (allCurrentPageSelected) {
      // Deselect all on current page
      setSelectedEntries(selectedEntries.filter(id => !currentPageIds.includes(id)));
    } else {
      // Select all on current page
      const newSelected = [...selectedEntries];
      currentPageIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      setSelectedEntries(newSelected);
    }
  };

  const deleteSelected = async () => {
    if (selectedEntries.length === 0) {
      alert('❌ Please select entries to delete');
      return;
    }

    if (!confirm(`⚠️ WARNING: This will permanently delete ${selectedEntries.length} labor entry/entries!\n\nThis action cannot be undone. Are you sure?`)) return;

    try {
      const token = localStorage.getItem('nexus_token');
      await Promise.all(
        selectedEntries.map(id =>
          fetch(`http://acidashboard.aci.local:100/api/labor/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        )
      );

      alert(`✅ Deleted ${selectedEntries.length} entry/entries!`);
      setSelectedEntries([]);
      fetchLaborEntries();
    } catch (error) {
      console.error('Error deleting entries:', error);
      alert('❌ Failed to delete entries');
    }
  };

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
        <div className="w-full space-y-4 p-2 sm:p-4 lg:p-6">
          {/* Compact Header */}
          <div className="bg-white/80 backdrop-blur-lg shadow-lg rounded-xl p-4 sm:p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 sm:p-2.5 rounded-lg">
                  <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Labor Tracking</h1>
                  <p className="text-xs sm:text-sm text-gray-500">Real-time production hours</p>
                </div>
              </div>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => setIsManualEntryOpen(true)}
                  className="px-4 py-2 sm:px-6 sm:py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 flex items-center space-x-2"
                >
                  <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Manual Entry</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
          </div>

          {/* Dashboard Grid - Timer and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Circular Timer - Takes 2 columns on large screens */}
            <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Timer</h2>
                {isTimerRunning && (
                  <span className="flex items-center space-x-2 bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span>ACTIVE</span>
                  </span>
                )}
              </div>

              {/* Circular Timer Display */}
              {isTimerRunning && (
                <div className="mb-6 flex flex-col md:flex-row items-center gap-6">
                  {/* Circular Progress */}
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                    {/* Background circle */}
                    <svg className="transform -rotate-90 w-full h-full">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="45%"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200"
                      />
                      {/* Animated progress circle */}
                      <circle
                        cx="50%"
                        cy="50%"
                        r="45%"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray="283"
                        strokeDashoffset={283 - (283 * ((elapsedTime % 3600) / 3600))}
                        className="text-emerald-500 transition-all duration-1000"
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Center time display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-bold text-gray-900 font-mono">
                        {formatTime(elapsedTime)}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">HH:MM:SS</span>
                    </div>
                  </div>

                  {/* Session Details */}
                  <div className="flex-1 w-full bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-700 mb-3 uppercase tracking-wide">Session Details</p>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <DocumentTextIcon className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">Job Number</p>
                          <p className="text-sm font-bold text-gray-900 truncate">{newEntry.job_number}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <ClockIcon className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">Work Center</p>
                          <p className="text-sm font-bold text-gray-900 truncate">{newEntry.work_center}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <UserIcon className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">Operator</p>
                          <p className="text-sm font-bold text-gray-900 truncate">{newEntry.operator_name}</p>
                        </div>
                      </div>
                      {isPaused && pauseTime && (
                        <div className="flex items-start space-x-2 pt-2 border-t border-emerald-200">
                          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-amber-600 font-semibold">PAUSED</p>
                            <p className="text-xs text-gray-600">
                              Since {new Date(pauseTime).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false })}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Input Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Job Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEntry.job_number}
                    onChange={(e) => setNewEntry({ ...newEntry, job_number: e.target.value })}
                    placeholder="Enter job"
                    disabled={isTimerRunning}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Work Center <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEntry.work_center}
                    onChange={(e) => setNewEntry({ ...newEntry, work_center: e.target.value })}
                    placeholder="Enter WC"
                    disabled={isTimerRunning}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Operator <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEntry.operator_name}
                    onChange={(e) => setNewEntry({ ...newEntry, operator_name: e.target.value })}
                    placeholder="Enter name"
                    disabled={isTimerRunning}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    disabled={isTimerRunning}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {!isTimerRunning ? (
                  <button
                    onClick={startTimer}
                    disabled={!newEntry.job_number || !newEntry.work_center || !newEntry.operator_name}
                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                  >
                    <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Start</span>
                  </button>
                ) : (
                  <>
                    {!isPaused ? (
                      <button
                        onClick={pauseTimer}
                        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Pause</span>
                      </button>
                    ) : (
                      <button
                        onClick={resumeTimer}
                        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                      >
                        <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Resume</span>
                      </button>
                    )}
                    <button
                      onClick={stopTimer}
                      className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                    >
                      <StopIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">End & Save</span>
                      <span className="sm:hidden">Stop</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Stats Cards - Right Column */}
            <div className="space-y-4">
              {/* Total Entries Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-600 uppercase">Entries</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{laborEntries.length}</p>
                  </div>
                  <DocumentTextIcon className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              {/* Total Hours Card */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-emerald-600 uppercase">Total Hours</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{getTotalHours()}</p>
                  </div>
                  <ClockIcon className="w-8 h-8 text-emerald-500" />
                </div>
              </div>

              {/* Operators Card */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-600 uppercase">Operators</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                      {new Set(laborEntries.map(e => e.employee_name)).size}
                    </p>
                  </div>
                  <UserIcon className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Job Summary Cards */}
          {(() => {
            // Group entries by job_number and work_center
            const jobWorkCenterGroups = laborEntries.reduce((acc, entry) => {
              const parts = entry.description?.split(' - ') || [];
              const workCenter = parts[0] || entry.work_center || 'N/A';
              const key = `${entry.job_number || `Traveler #${entry.traveler_id}`}|${workCenter}`;
              if (!acc[key]) {
                acc[key] = {
                  job_number: entry.job_number || `Traveler #${entry.traveler_id}`,
                  work_center: workCenter,
                  total_hours: 0,
                  entry_count: 0
                };
              }
              acc[key].total_hours += entry.hours_worked || 0;
              acc[key].entry_count += 1;
              return acc;
            }, {} as Record<string, { job_number: string; work_center: string; total_hours: number; entry_count: number }>);

            const groups = Object.values(jobWorkCenterGroups);

            return groups.length > 0 ? (
              <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Job Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
          <div className="bg-white rounded-lg shadow-lg border-2 border-emerald-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter Labor Entries
              </h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all shadow-sm"
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
                    value={filter.jobNumber}
                    onChange={(e) => setFilter({ ...filter, jobNumber: e.target.value })}
                    placeholder="Filter by job number"
                    className="w-full px-3 py-2 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Work Center</label>
                  <input
                    type="text"
                    value={filter.workCenter}
                    onChange={(e) => setFilter({ ...filter, workCenter: e.target.value })}
                    placeholder="Filter by work center"
                    className="w-full px-3 py-2 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Operator Name</label>
                  <input
                    type="text"
                    value={filter.operatorName}
                    onChange={(e) => setFilter({ ...filter, operatorName: e.target.value })}
                    placeholder="Filter by operator"
                    className="w-full px-3 py-2 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={filter.startDate}
                      onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                      className="w-full px-2 py-2 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all text-sm"
                      placeholder="Start"
                    />
                    <input
                      type="date"
                      value={filter.endDate}
                      onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                      className="w-full px-2 py-2 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all text-sm"
                      placeholder="End"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Action Buttons */}
          {user?.role === 'ADMIN' && (
            <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-4">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <button
                  onClick={selectAll}
                  className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold shadow-md text-sm md:text-base"
                >
                  <CheckIcon className="h-4 md:h-5 w-4 md:w-5" />
                  <span>{selectedEntries.length === filteredEntries.length && filteredEntries.length > 0 ? 'Deselect All' : 'Select All'}</span>
                </button>

                <button
                  onClick={deleteSelected}
                  disabled={selectedEntries.length === 0}
                  className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold shadow-md disabled:cursor-not-allowed text-sm md:text-base"
                >
                  <TrashIcon className="h-4 md:h-5 w-4 md:w-5" />
                  <span>Delete ({selectedEntries.length})</span>
                </button>

                {selectedEntries.length > 0 && (
                  <div className="ml-auto px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm font-semibold text-blue-700">
                      {selectedEntries.length} selected
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Labor Entries */}
          <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200 overflow-visible">
            <div className="bg-gradient-to-r from-blue-50 to-emerald-50 px-4 sm:px-6 py-4 border-b border-gray-200 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Labor Entries</h2>
                <span className="text-xs sm:text-sm font-semibold text-emerald-600 bg-emerald-100 px-2 sm:px-3 py-1 rounded-full">
                  {filteredEntries.length} {filteredEntries.length !== laborEntries.length && `of ${laborEntries.length}`}
                </span>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="block lg:hidden overflow-hidden rounded-b-xl">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : filteredEntries.length === 0 ? (
                <div className="p-12 text-center">
                  <ClockIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-base font-medium text-gray-900 mb-2">
                    {laborEntries.length === 0 ? 'No Labor Entries Yet' : 'No Matching Entries'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {laborEntries.length === 0
                      ? 'Use the timer above to start tracking labor hours.'
                      : 'Try adjusting your filters to see more entries.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredEntries.map((entry) => {
                    const parts = entry.description?.split(' - ') || [];
                    const workCenter = parts[0] || entry.work_center || 'N/A';
                    const operatorName = parts[1] || entry.employee_name || 'N/A';
                    const sequenceDisplay = entry.sequence_number ? `${entry.sequence_number}. ${workCenter}` : workCenter;

                    return (
                      <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <DocumentTextIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                              <span className="font-bold text-gray-900">{entry.job_number || `Traveler #${entry.traveler_id}`}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <UserIcon className="w-4 h-4" />
                              <span>{operatorName}</span>
                            </div>
                          </div>
                          {user?.role === 'ADMIN' && (
                            <div className="relative">
                              <button
                                onClick={() => {
                                  const btn = document.getElementById(`labor-menu-${entry.id}`);
                                  btn?.classList.toggle('hidden');
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>
                              <div id={`labor-menu-${entry.id}`} className="hidden absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                <button
                                  onClick={() => {
                                    setSelectedEntry(entry);
                                    setIsModalOpen(true);
                                    document.getElementById(`labor-menu-${entry.id}`)?.classList.add('hidden');
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                                >
                                  <EyeIcon className="w-4 h-4 text-blue-600" />
                                  <span>View Details</span>
                                </button>
                                <button
                                  onClick={() => {
                                    openEditModal(entry);
                                    document.getElementById(`labor-menu-${entry.id}`)?.classList.add('hidden');
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                                >
                                  <PencilIcon className="w-4 h-4 text-green-600" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setEntryToDelete(entry);
                                    setIsDeleteModalOpen(true);
                                    document.getElementById(`labor-menu-${entry.id}`)?.classList.add('hidden');
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2 text-red-600"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500">Work Center</p>
                            <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                              {sequenceDisplay}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total Hours</p>
                            <p className="text-sm font-bold text-emerald-600 mt-1">{formatHoursDualCompact(entry.hours_worked)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Date</p>
                            <p className="text-sm text-gray-900 mt-1">{new Date(entry.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Start Time</p>
                            <p className="text-sm text-gray-900 mt-1">{new Date(entry.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false })}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-b-xl">
              <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : filteredEntries.length === 0 ? (
                <div className="p-12 text-center">
                  <ClockIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-base font-medium text-gray-900 mb-2">
                    {laborEntries.length === 0 ? 'No Labor Entries Yet' : 'No Matching Entries'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {laborEntries.length === 0
                      ? 'Use the timer above to start tracking labor hours.'
                      : 'Try adjusting your filters to see more entries.'}
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {user?.role === 'ADMIN' && (
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={filteredEntries.length > 0 && filteredEntries.every(e => selectedEntries.includes(e.id))}
                            onChange={selectAll}
                            className="h-5 w-5 text-blue-600 rounded cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Job</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Operator</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Work Center</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Start</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Pause</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">End</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Hours</th>
                      {user?.role === 'ADMIN' && (
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEntries.map((entry) => {
                      const parts = entry.description?.split(' - ') || [];
                      const workCenter = parts[0] || entry.work_center || 'N/A';
                      const operatorName = parts[1] || entry.employee_name || 'N/A';
                      const sequenceDisplay = entry.sequence_number ? `${entry.sequence_number}. ${workCenter}` : workCenter;

                      // Calculate pause duration if available
                      let pauseDuration = 0;
                      if (entry.pause_time && entry.end_time) {
                        const pauseStart = new Date(entry.pause_time).getTime();
                        const endTime = new Date(entry.end_time).getTime();
                        pauseDuration = (endTime - pauseStart) / (1000 * 60 * 60); // Convert to hours
                      }

                      return (
                        <tr
                          key={entry.id}
                          className={`transition-colors ${
                            selectedEntries.includes(entry.id)
                              ? 'bg-blue-50 border-l-4 border-l-blue-500'
                              : 'hover:bg-blue-50/30'
                          }`}
                        >
                          {user?.role === 'ADMIN' && (
                            <td className="px-3 py-3 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedEntries.includes(entry.id)}
                                onChange={() => toggleSelectEntry(entry.id)}
                                className="h-5 w-5 text-blue-600 rounded cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {new Date(entry.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <DocumentTextIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <span className="font-semibold text-gray-900 text-sm">{entry.job_number || `Traveler #${entry.traveler_id}`}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {operatorName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                              {sequenceDisplay}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {new Date(entry.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {pauseDuration > 0 ? (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md font-semibold text-xs">
                                {formatHoursDualCompact(pauseDuration)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {entry.end_time ? new Date(entry.end_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-1 text-sm font-bold text-emerald-600">
                              <ClockIcon className="w-4 h-4 text-gray-400" />
                              <span>{formatHoursDualCompact(entry.hours_worked)}</span>
                            </div>
                          </td>
                          {user?.role === 'ADMIN' && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    openEditModal(entry);
                                  }}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <PencilIcon className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEntryToDelete(entry);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              </div>
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
          title={`Labor Entry #${selectedEntry.id}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Job Number</label>
                <p className="text-base text-gray-900 mt-1">
                  {selectedEntry.job_number || `Traveler #${selectedEntry.traveler_id}`}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Operator</label>
                <p className="text-base text-gray-900 mt-1">
                  {selectedEntry.description?.split(' - ')[1] || selectedEntry.employee_name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Work Center</label>
                <p className="text-base text-gray-900 mt-1">
                  {selectedEntry.sequence_number
                    ? `${selectedEntry.sequence_number}. ${selectedEntry.description?.split(' - ')[0] || selectedEntry.work_center}`
                    : selectedEntry.description?.split(' - ')[0] || selectedEntry.work_center || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Total Hours</label>
                <p className="text-base font-semibold text-emerald-600 mt-1">
                  {formatHoursDual(selectedEntry.hours_worked)}
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
                {selectedEntry.end_time && (() => {
                  const pauseStart = new Date(selectedEntry.pause_time).getTime();
                  const endTime = new Date(selectedEntry.end_time).getTime();
                  const pauseDuration = Math.round((endTime - pauseStart) / 3600000 * 100) / 100;
                  return pauseDuration > 0 ? (
                    <p className="text-sm text-gray-600 mt-1">
                      Duration: <span className="font-semibold text-yellow-600">{pauseDuration.toFixed(2)} hours</span>
                    </p>
                  ) : null;
                })()}
              </div>
            )}

            {selectedEntry.end_time && (
              <div>
                <label className="text-sm font-semibold text-gray-600">End Time</label>
                <p className="text-base text-gray-900 mt-1">
                  {new Date(selectedEntry.end_time).toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false })}
                </p>
              </div>
            )}

            {!selectedEntry.end_time && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  ⏱️ This entry is still in progress
                </p>
              </div>
            )}
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
          title="Delete Labor Entry"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium">
                Are you sure you want to delete this labor entry?
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Job Number:</span>
                <span className="text-sm text-gray-900">{entryToDelete.job_number || `Traveler #${entryToDelete.traveler_id}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Operator:</span>
                <span className="text-sm text-gray-900">
                  {entryToDelete.description?.split(' - ')[1] || entryToDelete.employee_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Work Center:</span>
                <span className="text-sm text-gray-900">
                  {entryToDelete.sequence_number
                    ? `${entryToDelete.sequence_number}. ${entryToDelete.description?.split(' - ')[0] || entryToDelete.work_center}`
                    : entryToDelete.description?.split(' - ')[0] || entryToDelete.work_center || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600">Hours Worked:</span>
                <span className="text-sm font-semibold text-emerald-600">
                  {formatHoursDual(entryToDelete.hours_worked)}
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
        title="Manual Labor Entry (Admin Only)"
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
              <Autocomplete
                value={manualEntryData.job_number}
                onChange={(value) => setManualEntryData({ ...manualEntryData, job_number: value })}
                fetchSuggestions={fetchJobNumbers}
                placeholder="Type job number or search..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                required
                minChars={0}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Work Center <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                value={manualEntryData.work_center}
                onChange={(value) => setManualEntryData({ ...manualEntryData, work_center: value })}
                fetchSuggestions={fetchWorkCenters}
                placeholder="Type work center or search..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                required
                minChars={0}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Operator Name <span className="text-red-500">*</span>
            </label>
            <Autocomplete
              value={manualEntryData.operator_name}
              onChange={(value) => setManualEntryData({ ...manualEntryData, operator_name: value })}
              fetchSuggestions={fetchOperators}
              placeholder="Type operator name or search..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              required
              minChars={0}
            />
          </div>

          <DurationCalculator
            startTime={manualEntryData.start_time}
            endTime={manualEntryData.end_time}
            onStartTimeChange={(value) => setManualEntryData({ ...manualEntryData, start_time: value })}
            onEndTimeChange={(value) => setManualEntryData({ ...manualEntryData, end_time: value })}
          />
        </div>
      </Modal>

      {/* Edit Entry Modal (ADMIN only) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Labor Entry"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsEditModalOpen(false)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Job Number
              </label>
              <input
                type="text"
                value={editEntryData.job_number}
                disabled
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Work Center <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editEntryData.work_center}
                onChange={(e) => setEditEntryData({ ...editEntryData, work_center: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Operator Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editEntryData.operator_name}
              onChange={(e) => setEditEntryData({ ...editEntryData, operator_name: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={convertISOToLocal(editEntryData.start_time)}
                onChange={(e) => setEditEntryData({ ...editEntryData, start_time: convertLocalToISO(e.target.value) })}
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
                onChange={(e) => setEditEntryData({ ...editEntryData, end_time: convertLocalToISO(e.target.value) })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
