'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';
import Modal from '@/components/Modal';
import { PlayIcon, StopIcon, ClockIcon, CheckCircleIcon, FunnelIcon, EyeIcon, TrashIcon, PencilIcon, DocumentTextIcon, UserIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { formatHoursDualCompact, formatHoursDual } from '@/utils/timeHelpers';
import Autocomplete from '@/components/ui/Autocomplete';
import { API_BASE_URL } from '@/config/api';


interface ActiveSession {
  id: number;
  job_number: string;
  work_center: string;
  operator_name: string;
  start_time: string;
  pause_time?: string;
  traveler_id?: number;
}

interface TrackingEntry {
  id: number;
  job_number: string;
  work_order?: string;
  work_center: string;
  sequence_number?: number;
  operator_name: string;
  start_time: string;
  end_time: string;
  pause_time?: string;
  pause_duration?: number; // in hours
  hours_worked: number;
  qty_completed?: number;
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
  const [operatorId, setOperatorId] = useState<number | undefined>(undefined);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [jobWorkCenterOptions, setJobWorkCenterOptions] = useState<Array<{step_id: number; step_number: number; operation: string; work_center_code: string; label: string; value: string}>>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [trackingEntries, setTrackingEntries] = useState<TrackingEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<number[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseTime, setPauseTime] = useState<Date | null>(null);
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
    operator_id: undefined as number | undefined,
    start_time: '',
    end_time: '',
  });
  const [manualJobWorkCenterOptions, setManualJobWorkCenterOptions] = useState<Array<{step_id: number; step_number: number; operation: string; work_center_code: string; label: string; value: string}>>([]);
  const [editEntryData, setEditEntryData] = useState({
    id: 0,
    job_number: '',
    work_center: '',
    operator_name: '',
    start_time: '',
    end_time: '',
  });

  // Qty completed modal states
  const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);
  const [qtyCompleted, setQtyCompleted] = useState('');
  const [travelerMaxQty, setTravelerMaxQty] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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

  // Auto-fill operator name from signed-in user
  useEffect(() => {
    if (user && !activeSession) {
      const fullName = `${user.first_name || user.username}`.trim();
      setOperatorName(fullName);
      setOperatorId(user.id);
    }
  }, [user]);

  // Load tracking entries and check for active session
  useEffect(() => {
    checkAutoStop5pm();
    loadTrackingEntries();
    checkActiveSession();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.jobNumber, filters.workCenter, filters.startDate, filters.endDate]);

  // Autocomplete fetch functions
  const fetchJobNumbers = async (query: string) => {
    try {
      const token = localStorage.getItem('nexus_token');
      const url = query
        ? `${API_BASE_URL}/search/autocomplete/job-numbers?q=${encodeURIComponent(query)}&limit=20`
        : `${API_BASE_URL}/search/autocomplete/job-numbers?limit=20`;

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
        ? `${API_BASE_URL}/search/autocomplete/work-centers?q=${encodeURIComponent(query)}&limit=10`
        : `${API_BASE_URL}/search/autocomplete/work-centers?limit=10`;

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
        ? `${API_BASE_URL}/search/autocomplete/operators?q=${encodeURIComponent(query)}&limit=50`
        : `${API_BASE_URL}/search/autocomplete/operators?limit=50`;

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

  // Fetch work centers from process steps for a specific job number
  const fetchWorkCentersByJob = async (jobNumber: string, query: string = '') => {
    try {
      const token = localStorage.getItem('nexus_token');
      const url = `${API_BASE_URL}/search/autocomplete/work-centers-by-job?job_number=${encodeURIComponent(jobNumber)}&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token || 'mock-token'}` }
      });
      if (response.ok) {
        const data = await response.json();
        return data.map((item: any) => ({
          value: item.value,
          label: item.label,
          description: `Step ${item.step_number}`,
          ...item
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching work centers by job:', error);
      return [];
    }
  };

  // When job number text changes (typing), just update the value - don't fetch steps yet
  const handleJobNumberChange = (value: string) => {
    setJobNumber(value);
    if (!value) {
      setJobWorkCenterOptions([]);
    }
  };

  // Handle job number selection from autocomplete
  const handleJobNumberSelect = async (option: any) => {
    const jobNum = option.job_number || option.value;
    setJobNumber(jobNum);
    setWorkCenter('');
    const steps = await fetchWorkCentersByJob(jobNum);
    setJobWorkCenterOptions(steps);
  };

  // Check and auto-stop entries at 5pm
  const checkAutoStop5pm = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`${API_BASE_URL}/tracking/check-auto-stop`, {
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
      const response = await fetch(`${API_BASE_URL}/tracking/active`, {
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
            pause_time: data.pause_time,
            traveler_id: data.traveler_id
          };

          setActiveSession(session);
          setJobNumber(data.job_number);
          setWorkCenter(data.work_center);
          setOperatorName(data.operator_name);
          if (data.quantity) setTravelerMaxQty(data.quantity);

          // Restore paused state if the entry was paused
          if (data.pause_time) {
            const paused = new Date(data.pause_time);
            const start = new Date(data.start_time);
            setIsPaused(true);
            setPauseTime(paused);
            // Freeze elapsed time at the moment it was paused
            setElapsedTime(Math.floor((paused.getTime() - start.getTime()) / 1000));
          }
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
      const response = await fetch(`${API_BASE_URL}/tracking/?days=30`, {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();

        const entries: TrackingEntry[] = data
          .map((entry: any) => ({
            id: entry.id,
            job_number: entry.job_number,
            work_order: entry.work_order,
            work_center: entry.work_center,
            sequence_number: undefined,
            operator_name: entry.operator_name,
            start_time: entry.start_time,
            end_time: entry.end_time || '',
            pause_time: entry.pause_time,
            pause_duration: entry.pause_duration || 0,
            hours_worked: entry.hours_worked,
            qty_completed: entry.qty_completed
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
      const createResponse = await fetch(`${API_BASE_URL}/tracking/`, {
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
        setTravelerMaxQty(data.quantity || null);
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
      const pauseTimeValue = new Date();

      const response = await fetch(`${API_BASE_URL}/tracking/${activeSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'mock-token'}`
        },
        body: JSON.stringify({
          pause_time: pauseTimeValue.toISOString()
        })
      });

      if (response.ok) {
        setIsPaused(true);
        setPauseTime(pauseTimeValue);
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

  const handleResume = async () => {
    if (!activeSession) return;

    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`${API_BASE_URL}/tracking/${activeSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'mock-token'}`
        },
        body: JSON.stringify({
          clear_pause: true
        })
      });

      if (response.ok) {
        setIsPaused(false);
        setPauseTime(null);
        setMessage('▶️ Tracking resumed');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.detail || 'Failed to resume tracking'}`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error resuming session:', error);
      setMessage('❌ Error resuming session');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleStop = () => {
    if (!activeSession) return;
    // Show qty modal before stopping
    setQtyCompleted('');
    setIsQtyModalOpen(true);
  };

  const confirmStop = async () => {
    if (!activeSession) return;

    try {
      const token = localStorage.getItem('nexus_token');
      const endTime = new Date();

      const response = await fetch(`${API_BASE_URL}/tracking/${activeSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'mock-token'}`
        },
        body: JSON.stringify({
          end_time: endTime.toISOString(),
          is_completed: true,
          qty_completed: qtyCompleted ? parseInt(qtyCompleted) : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(null);
        setElapsedTime(0);
        setIsPaused(false);
        setWorkCenter('');
        setJobNumber('');
        const fullName = user ? (`${user.first_name || user.username}`.trim()) : '';
        setOperatorName(fullName);
        setOperatorId(user?.id);
        setJobWorkCenterOptions([]);
        setMessage(`✅ Completed tracking - Duration: ${formatHoursDual(data.hours_worked)}`);
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
    } finally {
      setIsQtyModalOpen(false);
      setQtyCompleted('');
    }
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;

    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`${API_BASE_URL}/tracking/${entryToDelete.id}`, {
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
      const response = await fetch(`${API_BASE_URL}/tracking/`, {
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
          operator_id: undefined,
          start_time: '',
          end_time: '',
        });
        setManualJobWorkCenterOptions([]);

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

      const response = await fetch(`${API_BASE_URL}/tracking/${editEntryData.id}`, {
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

  const deleteSelected = () => {
    if (selectedEntries.length === 0) {
      toast.error('Please select entries to delete');
      return;
    }

    const count = selectedEntries.length;
    setConfirmModal({
      title: 'Delete Tracking Entries',
      message: `This will permanently delete ${count} tracking entry/entries! This action cannot be undone. Are you sure?`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const token = localStorage.getItem('nexus_token');
          await Promise.all(
            selectedEntries.map(id =>
              fetch(`${API_BASE_URL}/tracking/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token || 'mock-token'}`
                }
              })
            )
          );

          toast.success(`Deleted ${count} entry/entries!`);
          setSelectedEntries([]);
          loadTrackingEntries();
        } catch (error) {
          console.error('Error deleting entries:', error);
          toast.error('Failed to delete entries');
        }
      }
    });
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="w-full space-y-4 p-2 sm:p-4 lg:p-6">
          {/* Compact Header */}
          <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white rounded-2xl p-5 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                  <ClockIcon className="w-7 h-7 text-cyan-300" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Traveler Tracking</h1>
                  <p className="text-sm text-teal-200/80 mt-0.5">Work center time & location</p>
                </div>
              </div>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => setIsManualEntryOpen(true)}
                  className="px-4 py-2 sm:px-6 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-sm font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2"
                >
                  <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Manual Entry</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
          </div>

          {/* Message Alert */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.includes('✅') ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700' :
              message.includes('⚠️') ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700' :
              'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* Tracking Form with Dashboard Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Tracking Form */}
            <div className="lg:col-span-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">Tracking Controls</h2>
                {activeSession && (
                  <span className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span>ACTIVE</span>
                  </span>
                )}
              </div>

              {/* Circular Timer Display */}
              {activeSession && (
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
                        className="text-gray-200 dark:text-slate-700"
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
                      <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 font-mono">
                        {formatTime(elapsedTime)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">HH:MM:SS</span>
                    </div>
                  </div>

                  {/* Session Details */}
                  <div className="flex-1 w-full bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-3 uppercase tracking-wide">Session Details</p>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <DocumentTextIcon className="w-4 h-4 text-gray-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500 dark:text-slate-400">Job Number</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{activeSession.job_number}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <ClockIcon className="w-4 h-4 text-gray-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500 dark:text-slate-400">Work Center</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{activeSession.work_center}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <UserIcon className="w-4 h-4 text-gray-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500 dark:text-slate-400">Operator</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{activeSession.operator_name}</p>
                        </div>
                      </div>
                      {isPaused && pauseTime && (
                        <div className="flex items-start space-x-2 pt-2 border-t border-emerald-200">
                          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-amber-600 font-semibold">PAUSED</p>
                            <p className="text-xs text-gray-600 dark:text-slate-400">
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
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    Job Number <span className="text-red-500">*</span>
                  </label>
                  <Autocomplete
                    value={jobNumber}
                    onChange={handleJobNumberChange}
                    onSelect={handleJobNumberSelect}
                    fetchSuggestions={fetchJobNumbers}
                    placeholder="Type or scan job #"
                    disabled={!!activeSession}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-slate-200"
                    minChars={0}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    Work Center <span className="text-red-500">*</span>
                  </label>
                  <Autocomplete
                    value={workCenter}
                    onChange={(value) => setWorkCenter(value)}
                    fetchSuggestions={async (query) => {
                      if (jobNumber) {
                        const jobSteps = await fetchWorkCentersByJob(jobNumber, query);
                        if (jobSteps.length > 0) {
                          const generalWCs = await fetchWorkCenters(query);
                          const existingValues = new Set(jobSteps.map((f: any) => f.value));
                          return [...jobSteps, ...generalWCs.filter((wc: any) => !existingValues.has(wc.value))];
                        }
                      }
                      return fetchWorkCenters(query);
                    }}
                    placeholder="Type, scan QR, or select"
                    disabled={!!activeSession}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-slate-200"
                    minChars={0}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    Operator <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={operatorName}
                    disabled
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 cursor-not-allowed dark:text-white font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={!!activeSession}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {!activeSession ? (
                  <button
                    onClick={handleStart}
                    disabled={!jobNumber || !workCenter || !operatorName}
                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                  >
                    <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Start</span>
                  </button>
                ) : (
                  <>
                    {!isPaused ? (
                      <button
                        onClick={handlePause}
                        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Pause</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleResume}
                        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                      >
                        <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Resume</span>
                      </button>
                    )}
                    <button
                      onClick={handleStop}
                      className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                    >
                      <StopIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">End</span>
                      <span className="sm:hidden">Stop</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Stats Cards - Right Column */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase">Entries</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">{trackingEntries.length}</p>
                  </div>
                  <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase">Total Hours</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                      {trackingEntries.reduce((sum, entry) => sum + entry.hours_worked, 0).toFixed(2)}
                    </p>
                  </div>
                  <ClockIcon className="w-8 h-8 text-emerald-500" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-lg p-4 border border-pink-200 dark:border-pink-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-pink-600 dark:text-pink-400 uppercase">Active</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                      {activeSession ? '1' : '0'}
                    </p>
                  </div>
                  <UserIcon className="w-8 h-8 text-pink-500" />
                </div>
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
              <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg border border-blue-200 dark:border-blue-700 p-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-1.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Job Summary by Work Center
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {groups.map((group, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-2.5 py-2 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{group.job_number}</p>
                      </div>
                      <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full mb-1">
                        {group.work_center}
                      </span>
                      <div className="border-t border-blue-200/60 dark:border-blue-700/60 pt-1 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 dark:text-slate-400">Hours</span>
                        <span className="text-sm font-bold text-emerald-600">{group.total_hours.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 border-blue-100 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter Tracking History
              </h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-700 rounded-lg transition-all shadow-sm"
              >
                <FunnelIcon className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Job Number</label>
                  <input
                    type="text"
                    value={filters.jobNumber}
                    onChange={(e) => setFilters({ ...filters, jobNumber: e.target.value })}
                    placeholder="Filter by job number"
                    className="w-full px-3 py-2 border-2 border-blue-200 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Work Center</label>
                  <input
                    type="text"
                    value={filters.workCenter}
                    onChange={(e) => setFilters({ ...filters, workCenter: e.target.value })}
                    placeholder="Filter by work center"
                    className="w-full px-3 py-2 border-2 border-blue-200 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Start Date</label>
                  <input
                    type="datetime-local"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-blue-200 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">End Date</label>
                  <input
                    type="datetime-local"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-blue-200 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bulk Action Buttons */}
          {user?.role === 'ADMIN' && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-slate-700 p-4">
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
                  <div className="ml-auto px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {selectedEntries.length} selected
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tracking History */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            {/* Table Header + Pagination */}
            <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 px-3 py-2 rounded-t-xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-14 h-14 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
              </div>
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xs sm:text-sm font-bold text-white">Tracking History</h2>
                  <span className="text-xs font-semibold text-white bg-white/20 px-2 py-0.5 rounded-full">
                    {filteredEntries.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Card View - Hidden: use desktop table on all devices */}
            <div className="hidden overflow-hidden">
              {isLoading ? (
                <div className="p-4"><div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="skeleton h-12 w-full" />)}</div></div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                    <ClockIcon className="w-7 h-7 text-gray-400 dark:text-slate-500" />
                  </div>
                  <p className="text-gray-600 dark:text-slate-300 font-medium">No tracking entries yet</p>
                  <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Start tracking to see your work history</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {paginatedEntries.map((entry) => (
                    <div key={entry.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <span className="font-bold text-gray-900 dark:text-slate-100">{entry.job_number}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-400">
                            <UserIcon className="w-4 h-4" />
                            <span>{entry.operator_name}</span>
                          </div>
                        </div>
                        {user?.role === 'ADMIN' && (
                          <div className="relative">
                            <button
                              onClick={() => {
                                const btn = document.getElementById(`menu-${entry.id}`);
                                btn?.classList.toggle('hidden');
                              }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              <svg className="w-5 h-5 text-gray-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            <div id={`menu-${entry.id}`} className="hidden absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-10">
                              <button
                                onClick={() => {
                                  setSelectedEntry(entry);
                                  setIsModalOpen(true);
                                  document.getElementById(`menu-${entry.id}`)?.classList.add('hidden');
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center space-x-2"
                              >
                                <EyeIcon className="w-4 h-4 text-blue-600" />
                                <span>View Details</span>
                              </button>
                              <button
                                onClick={() => {
                                  openEditModal(entry);
                                  document.getElementById(`menu-${entry.id}`)?.classList.add('hidden');
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center space-x-2"
                              >
                                <PencilIcon className="w-4 h-4 text-green-600" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => {
                                  setEntryToDelete(entry);
                                  setIsDeleteModalOpen(true);
                                  document.getElementById(`menu-${entry.id}`)?.classList.add('hidden');
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center space-x-2 text-red-600"
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
                          <p className="text-xs text-gray-500 dark:text-slate-400">Work Center</p>
                          <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full">
                            {entry.sequence_number ? `${entry.sequence_number}. ${entry.work_center}` : entry.work_center}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-slate-400">Total Hours</p>
                          <p className="text-sm font-bold text-emerald-600 mt-1">{formatHoursDualCompact(entry.hours_worked)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-slate-400">Date</p>
                          <p className="text-sm text-gray-900 dark:text-slate-100 mt-1">{new Date(entry.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-slate-400">Start Time</p>
                          <p className="text-sm text-gray-900 dark:text-slate-100 mt-1">{new Date(entry.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false })}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-slate-400">Pause Time</p>
                          <p className="text-sm text-gray-900 dark:text-slate-100 mt-1">
                            {entry.pause_time ? new Date(entry.pause_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false }) : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-slate-400">End Time</p>
                          <p className="text-sm text-gray-900 dark:text-slate-100 mt-1">
                            {entry.end_time ? new Date(entry.end_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false }) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="block">
              <div>
              <div className="relative overflow-x-auto">
              <div className="absolute top-0 left-0 right-0 h-12 overflow-hidden pointer-events-none z-20">
                <div className="absolute top-0 right-8 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2" />
                <div className="absolute top-2 left-12 w-12 h-12 bg-white/10 rounded-full" />
                <div className="absolute top-0 right-1/3 w-8 h-8 bg-white/5 rounded-full translate-y-1" />
              </div>
              <table className="min-w-[800px] w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800">
                    {user?.role === 'ADMIN' && (
                      <th className="px-3 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={filteredEntries.length > 0 && filteredEntries.every(e => selectedEntries.includes(e.id))}
                          onChange={selectAll}
                          className="h-5 w-5 text-blue-600 rounded cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Job</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Work Order</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Operator</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Work Center</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Start</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Pause</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">End</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Total Hours</th>
                    <th className="px-4 py-3 text-center text-xs font-extrabold text-white uppercase tracking-wider">Qty</th>
                    {user?.role === 'ADMIN' && (
                      <th className="px-4 py-3 text-center text-xs font-extrabold text-white uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={user?.role === 'ADMIN' ? 11 : 9} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={user?.role === 'ADMIN' ? 11 : 9} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                        <div className="flex flex-col items-center space-y-2">
                          <ClockIcon className="w-8 h-8 text-gray-300 dark:text-slate-600" />
                          <p className="text-sm font-medium">No tracking entries found</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">Start a timer above to create your first entry</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedEntries.map((entry) => {
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
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                          : 'hover:bg-indigo-50/30 dark:hover:bg-slate-700/50'
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300">
                        {new Date(entry.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{entry.job_number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-slate-400 font-medium">
                        {entry.work_order || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300">
                        {entry.operator_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full">
                          {entry.sequence_number ? `${entry.sequence_number}. ${entry.work_center}` : entry.work_center}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-slate-400">
                        {new Date(entry.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {pauseDuration > 0 ? (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md font-semibold text-xs">
                            {formatHoursDualCompact(pauseDuration)}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-slate-400">
                        {entry.end_time ? new Date(entry.end_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1 text-sm font-bold text-emerald-600">
                          <ClockIcon className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                          <span>{formatHoursDualCompact(entry.hours_worked)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-semibold text-gray-700 dark:text-slate-300">
                        {entry.qty_completed != null ? entry.qty_completed : '-'}
                      </td>
                      {user?.role === 'ADMIN' && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                openEditModal(entry);
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setEntryToDelete(entry);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
              </div>
            </div>
            </div>

            {/* Bottom Pagination */}
            {(filteredEntries.length > 0 || trackingEntries.length === 0) && (
              <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 px-3 py-2 relative overflow-hidden rounded-b-xl">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="pagination-select">
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-xs text-white/80">{filteredEntries.length > 0 ? `${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filteredEntries.length)} of ${filteredEntries.length}` : '1-5 of 5'}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 rounded text-xs font-semibold bg-white/20 border border-white/30 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 rounded text-xs font-semibold bg-white/20 border border-white/30 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) page = i + 1;
                      else if (currentPage <= 3) page = i + 1;
                      else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                      else page = currentPage - 2 + i;
                      return (
                        <button key={page} onClick={() => setCurrentPage(page)} className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${currentPage === page ? 'bg-white text-indigo-700 shadow-sm' : 'bg-white/20 border border-white/30 text-white hover:bg-white/30'}`}>{page}</button>
                      );
                    })}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-2 py-1 rounded text-xs font-semibold bg-white/20 border border-white/30 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed">›</button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="px-2 py-1 rounded text-xs font-semibold bg-white/20 border border-white/30 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
                  </div>
                </div>
              </div>
            )}
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
                <label className="text-sm font-semibold text-gray-600 dark:text-slate-400">Job Number</label>
                <p className="text-base text-gray-900 dark:text-slate-100 mt-1">
                  {selectedEntry.job_number}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-slate-400">Operator</label>
                <p className="text-base text-gray-900 dark:text-slate-100 mt-1">
                  {selectedEntry.operator_name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-slate-400">Work Center</label>
                <p className="text-base text-gray-900 dark:text-slate-100 mt-1">
                  {selectedEntry.sequence_number
                    ? `${selectedEntry.sequence_number}. ${selectedEntry.work_center}`
                    : selectedEntry.work_center}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-slate-400">Total Hours</label>
                <p className="text-base font-semibold text-emerald-600 mt-1">
                  {formatHoursDual(selectedEntry.hours_worked)}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
              <label className="text-sm font-semibold text-gray-600 dark:text-slate-400">Start Time</label>
              <p className="text-base text-gray-900 dark:text-slate-100 mt-1">
                {new Date(selectedEntry.start_time).toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false })}
              </p>
            </div>

            {selectedEntry.pause_time && (
              <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-slate-400">Pause Started</label>
                <p className="text-base text-yellow-600 mt-1">
                  {new Date(selectedEntry.pause_time).toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false })}
                </p>
                {selectedEntry.pause_duration && selectedEntry.pause_duration > 0 && (
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                    Duration: <span className="font-semibold text-yellow-600">{selectedEntry.pause_duration.toFixed(2)} hours</span>
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-gray-600 dark:text-slate-400">End Time</label>
              <p className="text-base text-gray-900 dark:text-slate-100 mt-1">
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
                <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">Job Number:</span>
                <span className="text-sm text-gray-900 dark:text-slate-100">{entryToDelete.job_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">Operator:</span>
                <span className="text-sm text-gray-900 dark:text-slate-100">{entryToDelete.operator_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">Work Center:</span>
                <span className="text-sm text-gray-900 dark:text-slate-100">
                  {entryToDelete.sequence_number
                    ? `${entryToDelete.sequence_number}. ${entryToDelete.work_center}`
                    : entryToDelete.work_center}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">Hours Worked:</span>
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
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 font-medium rounded-lg transition-colors"
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

      {/* Qty Completed Modal */}
      <Modal
        isOpen={isQtyModalOpen}
        onClose={() => {
          setIsQtyModalOpen(false);
          setQtyCompleted('');
        }}
        title="Quantity Completed"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            How many units did you complete during this time?
            {travelerMaxQty != null && (
              <span className="block mt-1 font-semibold text-blue-600 dark:text-blue-400">
                Traveler quantity: {travelerMaxQty}
              </span>
            )}
          </p>
          <input
            type="number"
            min="0"
            max={travelerMaxQty || undefined}
            value={qtyCompleted}
            onChange={(e) => {
              const val = e.target.value;
              if (val && travelerMaxQty != null && parseInt(val) > travelerMaxQty) {
                setMessage('⚠️ Quantity cannot exceed traveler quantity (' + travelerMaxQty + ')');
                setTimeout(() => setMessage(''), 3000);
                return;
              }
              setQtyCompleted(val);
            }}
            placeholder={travelerMaxQty != null ? `Max: ${travelerMaxQty}` : 'Enter quantity completed'}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-slate-700 dark:text-white"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmStop();
            }}
          />
          {qtyCompleted && travelerMaxQty != null && parseInt(qtyCompleted) > travelerMaxQty && (
            <p className="text-xs text-red-600 font-medium">Quantity cannot exceed {travelerMaxQty}</p>
          )}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => {
                setQtyCompleted('');
                confirmStop();
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 font-medium rounded-lg transition-colors"
            >
              Skip
            </button>
            <button
              onClick={confirmStop}
              disabled={!!(qtyCompleted && travelerMaxQty != null && parseInt(qtyCompleted) > travelerMaxQty)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              Stop Timer
            </button>
          </div>
        </div>
      </Modal>

      {/* Manual Entry Modal (ADMIN only) */}
      <Modal
        isOpen={isManualEntryOpen}
        onClose={() => {
          setIsManualEntryOpen(false);
          setManualEntryData({
            job_number: '',
            work_center: '',
            operator_name: '',
            operator_id: undefined,
            start_time: '',
            end_time: '',
          });
          setManualJobWorkCenterOptions([]);
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
                  operator_id: undefined,
                  start_time: '',
                  end_time: '',
                });
                setManualJobWorkCenterOptions([]);
              }}
              className="px-6 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 font-semibold rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleManualEntry}
              className="px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all shadow-md"
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
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Job Number <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                value={manualEntryData.job_number}
                onChange={(value) => {
                  setManualEntryData({ ...manualEntryData, job_number: value });
                  if (!value) {
                    setManualJobWorkCenterOptions([]);
                  }
                }}
                onSelect={async (option) => {
                  const jobNum = option.job_number || option.value;
                  setManualEntryData(prev => ({ ...prev, job_number: jobNum, work_center: '' }));
                  const steps = await fetchWorkCentersByJob(jobNum);
                  setManualJobWorkCenterOptions(steps);
                }}
                fetchSuggestions={fetchJobNumbers}
                placeholder="Type job number or search..."
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
                required
                minChars={0}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Work Center <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                value={manualEntryData.work_center}
                onChange={(value) => setManualEntryData({ ...manualEntryData, work_center: value })}
                fetchSuggestions={async (query) => {
                  if (manualEntryData.job_number) {
                    const jobSteps = await fetchWorkCentersByJob(manualEntryData.job_number, query);
                    if (jobSteps.length > 0) {
                      const generalWCs = await fetchWorkCenters(query);
                      const existingValues = new Set(jobSteps.map((f: any) => f.value));
                      return [...jobSteps, ...generalWCs.filter((wc: any) => !existingValues.has(wc.value))];
                    }
                  }
                  return fetchWorkCenters(query);
                }}
                placeholder="Select from steps or type/scan..."
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
                required
                minChars={0}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Operator Name <span className="text-red-500">*</span>
            </label>
            <Autocomplete
              value={manualEntryData.operator_name}
              onChange={(value) => setManualEntryData({ ...manualEntryData, operator_name: value, operator_id: undefined })}
              onSelect={(option) => setManualEntryData({ ...manualEntryData, operator_name: option.value, operator_id: option.id })}
              fetchSuggestions={fetchOperators}
              placeholder="Select operator from list..."
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
              required
              minChars={0}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={manualEntryData.start_time}
                onChange={(e) => setManualEntryData({ ...manualEntryData, start_time: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={manualEntryData.end_time}
                onChange={(e) => setManualEntryData({ ...manualEntryData, end_time: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
                required
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
              className="px-6 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 font-semibold rounded-lg transition-all"
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

          <div className="space-y-3 bg-gray-50 dark:bg-slate-900 p-4 rounded-lg">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">Job Number:</span>
              <span className="text-sm text-gray-900 dark:text-slate-100">{editEntryData.job_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">Work Center:</span>
              <span className="text-sm text-gray-900 dark:text-slate-100">{editEntryData.work_center}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">Operator:</span>
              <span className="text-sm text-gray-900 dark:text-slate-100">{editEntryData.operator_name}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={convertISOToLocal(editEntryData.start_time)}
                onChange={(e) => setEditEntryData({ ...editEntryData, start_time: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={convertISOToLocal(editEntryData.end_time)}
                onChange={(e) => setEditEntryData({ ...editEntryData, end_time: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
        </div>
      </Modal>
      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">{confirmModal.title}</h3>
            <p className="text-gray-600 dark:text-slate-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
