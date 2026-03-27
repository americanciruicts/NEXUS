'use client';

import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import Modal from '@/components/Modal';
import { ClockIcon, UserIcon, DocumentTextIcon, PlayIcon, StopIcon, PencilIcon, TrashIcon, EyeIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { formatHoursDualCompact, formatHoursDual, formatSecondsCompact } from '@/utils/timeHelpers';
import Autocomplete from '@/components/ui/Autocomplete';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config/api';
import { offlineFetch } from '@/lib/offlineSync';

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
  work_order?: string;
  work_center?: string;
  sequence_number?: number;
  qty_completed?: number;
  comment?: string;
  pause_logs?: PauseLogItem[];
  total_pause_seconds?: number;
  pause_count?: number;
}

interface PauseLogItem {
  id: number;
  paused_at: string;
  resumed_at?: string;
  duration_seconds?: number;
  comment?: string;
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
    step_id: undefined as number | undefined,
    operator_name: '',
    operator_id: undefined as number | undefined,
    date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
  });
  const [jobWorkCenterOptions, setJobWorkCenterOptions] = useState<Array<{step_id: number; step_number: number; operation: string; work_center_code: string; label: string; value: string}>>([]);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [pauseTime, setPauseTime] = useState<Date | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<number | null>(null);
  const [showPauseCommentModal, setShowPauseCommentModal] = useState(false);
  const [pauseComment, setPauseComment] = useState('');
  const [pauseAction, setPauseAction] = useState<'pause' | 'resume'>('pause');
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
    step_id: undefined as number | undefined,
    operator_name: '',
    operator_id: undefined as number | undefined,
    start_time: '',
    end_time: '',
    comment: '',
    qty_completed: '' as string,
    pauses: [] as Array<{ paused_at: string; resumed_at: string; comment: string }>,
  });
  const [manualJobWorkCenterOptions, setManualJobWorkCenterOptions] = useState<Array<{step_id: number; step_number: number; operation: string; work_center_code: string; label: string; value: string}>>([]);
  const [editEntryData, setEditEntryData] = useState({
    id: 0,
    job_number: '',
    work_center: '',
    operator_name: '',
    start_time: '',
    end_time: '',
    comment: '',
    qty_completed: '' as string,
    pause_logs: [] as PauseLogItem[],
    newPause: { paused_at: '', resumed_at: '', comment: '' },
  });

  // Qty completed modal states
  const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);
  const [qtyCompleted, setQtyCompleted] = useState('');
  const [stopComment, setStopComment] = useState('');
  const [pendingStopEntryId, setPendingStopEntryId] = useState<number | null>(null);
  const [travelerMaxQty, setTravelerMaxQty] = useState<number | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Job Summary states
  const [jobListExpanded, setJobListExpanded] = useState(true);
  const [summaryJobSearch, setSummaryJobSearch] = useState('');
  const [selectedJobChip, setSelectedJobChip] = useState<string | null>(null);

  // Auto-timer: track scan-based auto-start/stop
  const autoStartTriggeredRef = useRef(false);
  const lastStartedWorkCenterRef = useRef<string>('');
  const lastStartedWorkCenterCodeRef = useRef<string>(''); // e.g. PCB_ASSEMBLY_13_FEEDER_LOAD
  const lastStartedStepIdRef = useRef<number | undefined>(undefined);
  const autoStartTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Global scanner listener — ONLY for auto-stop when timer is running
  // Detects rapid keystrokes (scanner) ending with Enter, extracts work center, stops timer
  const globalScanBufferRef = useRef('');
  const globalScanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!isTimerRunning) return; // Only active when timer is running

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && globalScanBufferRef.current.length > 1) {
        const scannedValue = globalScanBufferRef.current.trim();
        globalScanBufferRef.current = '';
        if (globalScanTimeoutRef.current) clearTimeout(globalScanTimeoutRef.current);

        // Extract work center info from QR code
        // QR format: NEXUS-STEP|traveler_id|job_number|work_order|work_center_code|step_number|operation|step_type|step_id|company
        let shouldStop = false;
        if (scannedValue.startsWith('NEXUS-STEP|')) {
          const parts = scannedValue.split('|');
          const qrWorkCenterCode = parts[4] || ''; // e.g. PCB_ASSEMBLY_13_FEEDER_LOAD
          const qrOperation = parts[6] || '';       // e.g. FEEDER LOAD
          const qrStepId = parts[8] ? parseInt(parts[8]) : 0;

          // Match by step_id (most precise), work_center_code, or operation name
          if (qrStepId && qrStepId === lastStartedStepIdRef.current) {
            shouldStop = true;
          } else if (qrWorkCenterCode && qrWorkCenterCode.toLowerCase() === lastStartedWorkCenterCodeRef.current.toLowerCase()) {
            shouldStop = true;
          } else if (qrOperation && qrOperation.toLowerCase() === lastStartedWorkCenterRef.current.toLowerCase()) {
            shouldStop = true;
          }
        } else {
          // Raw text scan (not QR format) — compare directly
          if (scannedValue.toLowerCase() === lastStartedWorkCenterRef.current.toLowerCase()) {
            shouldStop = true;
          }
        }

        if (shouldStop) {
          e.preventDefault();
          e.stopPropagation();
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          stopTimer();
        }

        return;
      }

      // Buffer printable characters with 100ms gap detection (scanner speed)
      if (e.key.length === 1) {
        if (globalScanTimeoutRef.current) clearTimeout(globalScanTimeoutRef.current);
        globalScanBufferRef.current += e.key;
        globalScanTimeoutRef.current = setTimeout(() => {
          globalScanBufferRef.current = '';
        }, 100);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (globalScanTimeoutRef.current) clearTimeout(globalScanTimeoutRef.current);
      globalScanBufferRef.current = '';
    };
  }, [isTimerRunning]);

  // Auto-fill operator name from signed-in user
  useEffect(() => {
    if (user && !isTimerRunning) {
      const fullName = `${user.first_name || user.username}`.trim();
      setNewEntry(prev => ({ ...prev, operator_name: fullName, operator_id: user.id }));
    }
  }, [user]);

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
    setNewEntry(prev => ({ ...prev, job_number: value }));
    if (!value) {
      setJobWorkCenterOptions([]);
    }
  };

  // Handle job number selection from autocomplete dropdown - THIS is when we fetch steps
  const handleJobNumberSelect = async (option: any) => {
    const jobNum = option.job_number || option.value;
    setNewEntry(prev => ({ ...prev, job_number: jobNum, work_center: '', step_id: undefined }));
    const steps = await fetchWorkCentersByJob(jobNum);
    setJobWorkCenterOptions(steps);
  };

  // Check and auto-stop entries at 5pm
  const checkAutoStop5pm = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`${API_BASE_URL}/labor/check-auto-stop`, {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.completed_count > 0) {
          toast.warning(`Auto-stopped ${data.completed_count} entries at 5pm cutoff`);
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

  // Auto-start: when both job_number and work_center are filled, wait 800ms then start
  // The debounce prevents triggering while scanner is still typing characters
  useEffect(() => {
    // Clear any pending auto-start
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }

    const bothFilled = newEntry.job_number && newEntry.work_center && newEntry.operator_name;

    if (bothFilled && !isTimerRunning && !autoStartTriggeredRef.current) {
      autoStartTimerRef.current = setTimeout(() => {
        autoStartTriggeredRef.current = true;
        startTimer();
      }, 800);
    }

    return () => {
      if (autoStartTimerRef.current) {
        clearTimeout(autoStartTimerRef.current);
      }
    };
  }, [newEntry.job_number, newEntry.work_center, newEntry.operator_name, isTimerRunning]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter labor entries
  const filteredEntries = laborEntries.filter(entry => {
    const workCenter = entry.work_center || entry.description?.split(' - ')?.[0] || '';
    const operatorName = entry.employee_name || entry.description?.split(' - ')?.[1] || '';

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

  // Pagination calculations
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter.jobNumber, filter.workCenter, filter.operatorName, filter.startDate, filter.endDate]);

  const checkActiveEntry = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`${API_BASE_URL}/labor/active`, {
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

          // Restore paused state if the entry was paused
          if (data.pause_time) {
            const paused = new Date(data.pause_time);
            setIsPaused(true);
            setPauseTime(paused);
            // Freeze elapsed time at the moment it was paused
            const diff = Math.floor((paused.getTime() - start.getTime()) / 1000);
            setElapsedTime(diff);
          }

          // Store traveler max qty for validation
          if (data.quantity) setTravelerMaxQty(data.quantity);

          // Extract job number and work center from description
          const parts = data.description.split(' - ');
          if (parts.length >= 2) {
            const workCenterName = parts[0] || '';
            setNewEntry({
              job_number: data.job_number || '',
              work_center: workCenterName,
              step_id: data.step_id || undefined,
              operator_name: parts[1] || '',
              operator_id: data.employee_id || user?.id,
              date: start.toISOString().slice(0, 10),
            });
            // Set refs for QR auto-stop matching
            lastStartedWorkCenterRef.current = workCenterName;
            lastStartedWorkCenterCodeRef.current = data.work_center_code || workCenterName;
            lastStartedStepIdRef.current = data.step_id || undefined;
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
      const response = await fetch(`${API_BASE_URL}/labor/my-entries?days=30`, {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Backend now returns job_number and work_center directly - no need for N+1 calls
        const validEntries = data.filter((entry: LaborEntry) => entry.hours_worked >= 0);
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
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('nexus_token');

      // First, find the traveler by job number
      const travelersResponse = await fetch(`${API_BASE_URL}/travelers/`, {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (!travelersResponse.ok) {
        toast.error('Failed to fetch travelers');
        return;
      }

      const travelers = await travelersResponse.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const traveler = travelers.find((t: any) =>
        String(t.job_number).toLowerCase() === newEntry.job_number.toLowerCase()
      );

      if (!traveler) {
        toast.error(`Job number ${newEntry.job_number} not found`);
        return;
      }

      const description = `${newEntry.work_center} - ${newEntry.operator_name}`;
      // Use current system time when Start button is clicked
      const now = new Date();

      const requestBody: any = {
        traveler_id: traveler.id,
        start_time: now.toISOString(),
        description: description
      };

      // Pass step_id if selected from work center dropdown
      if (newEntry.step_id) {
        requestBody.step_id = newEntry.step_id;
      }

      // Admin can assign entry to another user
      if (user?.role === 'ADMIN' && newEntry.operator_id && newEntry.operator_id !== user.id) {
        requestBody.employee_id = newEntry.operator_id;
      }

      const response = await offlineFetch(`${API_BASE_URL}/labor/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'mock-token'}`
        },
        body: JSON.stringify(requestBody),
        offlineType: 'labor_start'
      });

      const data = await response.json();
      if (data.offline && data.queued) {
        setStartTime(now);
        setElapsedTime(0);
        setIsTimerRunning(true);
        toast.info('Offline: Timer saved locally. Will sync when back online.');
      } else if (response.ok) {
        setActiveEntryId(data.id);
        setStartTime(now);
        setElapsedTime(0);
        setIsTimerRunning(true);
        setTravelerMaxQty(traveler.quantity || null);
        lastStartedWorkCenterRef.current = newEntry.work_center; // display name e.g. "FEEDER LOAD"
        // Find the matching work center code from job steps for QR auto-stop matching
        const matchingStep = jobWorkCenterOptions.find((s: any) =>
          s.value === newEntry.work_center || s.operation === newEntry.work_center || s.step_id === newEntry.step_id
        );
        lastStartedWorkCenterCodeRef.current = matchingStep?.work_center_code || matchingStep?.value || newEntry.work_center;
        lastStartedStepIdRef.current = newEntry.step_id;
        toast.success('Timer started!');
        fetchLaborEntries();
      } else {
        toast.error(`Error: ${data.detail || 'Failed to start timer'}`);
      }
    } catch (error) {
      console.error('Error starting timer:', error);
      toast.error('Error starting timer');
    }
  };

  const pauseTimer = () => {
    if (!activeEntryId) {
      toast.error('No active timer found');
      return;
    }
    setPauseAction('pause');
    setPauseComment('');
    setShowPauseCommentModal(true);
  };

  const executePause = async (comment?: string) => {
    if (!activeEntryId) return;
    try {
      const token = localStorage.getItem('nexus_token');
      const currentPauseTime = new Date();

      const response = await offlineFetch(`${API_BASE_URL}/labor/${activeEntryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'mock-token'}`
        },
        body: JSON.stringify({
          pause_time: currentPauseTime.toISOString(),
          pause_comment: comment || null
        }),
        offlineType: 'labor_pause'
      });

      const data = await response.json();
      if (data.offline && data.queued) {
        setIsPaused(true);
        setPauseTime(currentPauseTime);
        toast.info('Offline: Pause saved locally.');
      } else if (response.ok) {
        setIsPaused(true);
        setPauseTime(currentPauseTime);
        toast.info('Timer paused!');
        fetchLaborEntries();
      } else {
        toast.error(`Error: ${data.detail || 'Failed to pause timer'}`);
      }
    } catch (error) {
      console.error('Error pausing timer:', error);
      toast.error('Error pausing timer');
    }
  };

  const resumeTimer = () => {
    if (!activeEntryId) {
      toast.error('No active timer found');
      return;
    }
    // Resume directly without comment modal
    executeResume();
  };

  const executeResume = async (comment?: string) => {
    if (!activeEntryId) return;
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await offlineFetch(`${API_BASE_URL}/labor/${activeEntryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'mock-token'}`
        },
        body: JSON.stringify({
          clear_pause: true,
          pause_comment: comment || null
        }),
        offlineType: 'labor_resume'
      });

      const data = await response.json();
      if (data.offline && data.queued) {
        setIsPaused(false);
        setPauseTime(null);
        toast.info('Offline: Resume saved locally.');
      } else if (response.ok) {
        setIsPaused(false);
        setPauseTime(null);
        toast.info('Timer resumed!');
        fetchLaborEntries();
      } else {
        toast.error(`Error: ${data.detail || 'Failed to resume timer'}`);
      }
    } catch (error) {
      console.error('Error resuming timer:', error);
      toast.error('Error resuming timer');
    }
  };

  const stopTimer = () => {
    if (!activeEntryId) {
      toast.error('No active timer found');
      return;
    }
    // Show qty modal before stopping
    setPendingStopEntryId(activeEntryId);
    setQtyCompleted('');
    setIsQtyModalOpen(true);
  };

  const confirmStopTimer = async () => {
    if (!pendingStopEntryId) return;

    try {
      const token = localStorage.getItem('nexus_token');
      const endTime = new Date();

      const response = await offlineFetch(`${API_BASE_URL}/labor/${pendingStopEntryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'mock-token'}`
        },
        body: JSON.stringify({
          end_time: endTime.toISOString(),
          is_completed: true,
          qty_completed: qtyCompleted ? parseInt(qtyCompleted) : null,
          comment: stopComment || null
        }),
        offlineType: 'labor_stop'
      });

      const respData = await response.json().catch(() => ({}));
      if (respData.offline && respData.queued) {
        setIsTimerRunning(false);
        setIsPaused(false);
        setElapsedTime(0);
        setStartTime(null);
        setPauseTime(null);
        setActiveEntryId(null);
        setIsQtyModalOpen(false);
        toast.info('Offline: Stop saved locally. Will sync when back online.');
      } else if (response.ok) {
        setIsTimerRunning(false);
        setIsPaused(false);
        setElapsedTime(0);
        setStartTime(null);
        setPauseTime(null);
        setActiveEntryId(null);
        const fullName = user ? (`${user.first_name || user.username}`.trim()) : '';
        setNewEntry({
          job_number: '',
          work_center: '',
          step_id: undefined,
          operator_name: fullName,
          operator_id: user?.id,
          date: new Date().toISOString().slice(0, 10),
        });
        setJobWorkCenterOptions([]);
        lastStartedWorkCenterRef.current = '';
        lastStartedWorkCenterCodeRef.current = '';
        lastStartedStepIdRef.current = undefined;
        autoStartTriggeredRef.current = false;
        toast.success('Timer stopped and entry saved!');
        fetchLaborEntries();
      } else if (response.status === 404) {
        // Entry was deleted or doesn't exist — reset timer state
        setIsTimerRunning(false);
        setIsPaused(false);
        setElapsedTime(0);
        setStartTime(null);
        setPauseTime(null);
        setActiveEntryId(null);
        const fullName = user ? (`${user.first_name || user.username}`.trim()) : '';
        setNewEntry({
          job_number: '',
          work_center: '',
          step_id: undefined,
          operator_name: fullName,
          operator_id: user?.id,
          date: new Date().toISOString().slice(0, 10),
        });
        setJobWorkCenterOptions([]);
        lastStartedWorkCenterRef.current = '';
        lastStartedWorkCenterCodeRef.current = '';
        lastStartedStepIdRef.current = undefined;
        autoStartTriggeredRef.current = false;
        toast.warning('Timer entry no longer exists. Timer has been reset.');
        fetchLaborEntries();
      } else {
        toast.error(`Error: ${respData.detail || 'Failed to stop timer'}`);
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast.error('Error stopping timer');
    } finally {
      setIsQtyModalOpen(false);
      setPendingStopEntryId(null);
      setQtyCompleted('');
      setStopComment('');
    }
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;

    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`${API_BASE_URL}/labor/${entryToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Entry deleted successfully!');
        fetchLaborEntries();
        setIsDeleteModalOpen(false);
        setEntryToDelete(null);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to delete entry: ${errorData.detail || 'Unknown error'}`);
        console.error('Delete failed:', errorData);
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Network error while deleting entry');
    }
  };

  const completeLaborEntry = async (entryId: number) => {
    try {
      const token = localStorage.getItem('nexus_token');
      const endTime = new Date().toISOString();

      const response = await fetch(`${API_BASE_URL}/labor/${entryId}`, {
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
        toast.success('Labor entry completed!');
        fetchLaborEntries();
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.detail || 'Failed to complete labor entry'}`);
      }
    } catch (error) {
      console.error('Error completing labor entry:', error);
      toast.error('Error completing labor entry');
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
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('nexus_token');

      // Find traveler by job number
      const travelersResponse = await fetch(`${API_BASE_URL}/travelers/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!travelersResponse.ok) {
        toast.error('Failed to fetch travelers');
        return;
      }

      const travelers = await travelersResponse.json();
      const traveler = travelers.find((t: { job_number: string; id: number }) =>
        String(t.job_number).toLowerCase() === manualEntryData.job_number.toLowerCase()
      );

      if (!traveler) {
        toast.error(`Job number ${manualEntryData.job_number} not found`);
        return;
      }

      const startTimeISO = convertLocalToISO(manualEntryData.start_time);
      const endTimeISO = convertLocalToISO(manualEntryData.end_time);

      // Validate that end time is after start time
      if (new Date(endTimeISO) <= new Date(startTimeISO)) {
        toast.error('End time must be after start time');
        return;
      }

      // Create a COMPLETED entry with both start and end times
      // This ensures NO timer is started for manual entries
      const response = await fetch(`${API_BASE_URL}/labor/`, {
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
          is_completed: true,     // CRITICAL: Mark as completed to prevent timer activation
          ...(manualEntryData.step_id ? { step_id: manualEntryData.step_id } : {}),
          ...(manualEntryData.operator_id ? { employee_id: manualEntryData.operator_id } : {}),
          comment: manualEntryData.comment || null,
          qty_completed: manualEntryData.qty_completed ? parseInt(manualEntryData.qty_completed) : null
        })
      });

      if (response.ok) {
        const createdEntry = await response.json();
        // Create pause logs if any were added
        if (manualEntryData.pauses.length > 0) {
          for (const pause of manualEntryData.pauses) {
            const pauseStart = convertLocalToISO(pause.paused_at);
            const pauseEnd = convertLocalToISO(pause.resumed_at);
            await fetch(`${API_BASE_URL}/labor/${createdEntry.id}/pauses`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ paused_at: pauseStart, resumed_at: pauseEnd, comment: pause.comment || null })
            });
          }
        }
        toast.success('Manual entry created successfully!');
        setIsManualEntryOpen(false);
        setManualEntryData({
          job_number: '',
          work_center: '',
          step_id: undefined,
          operator_name: '',
          operator_id: undefined,
          start_time: '',
          end_time: '',
          comment: '',
          qty_completed: '',
          pauses: [],
        });
        setManualJobWorkCenterOptions([]);
        // Reload entries but DO NOT check for active entry (to avoid timer activation)
        fetchLaborEntries();
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.detail || 'Failed to create entry'}`);
      }
    } catch (error) {
      console.error('Error creating manual entry:', error);
      toast.error('Error creating manual entry');
    }
  };

  // Edit entry handler (ADMIN only)
  const handleEditEntry = async () => {
    if (!editEntryData.id) return;

    try {
      const token = localStorage.getItem('nexus_token');

      const response = await fetch(`${API_BASE_URL}/labor/${editEntryData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          start_time: editEntryData.start_time,
          end_time: editEntryData.end_time,
          description: `${editEntryData.work_center} - ${editEntryData.operator_name}`,
          comment: editEntryData.comment || null,
          qty_completed: editEntryData.qty_completed ? parseInt(editEntryData.qty_completed) : null
        })
      });

      if (response.ok) {
        toast.success('Entry updated successfully!');
        setIsEditModalOpen(false);
        fetchLaborEntries();
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.detail || 'Failed to update entry'}`);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Error updating entry');
    }
  };

  const openEditModal = (entry: LaborEntry) => {
    setEditEntryData({
      id: entry.id,
      job_number: entry.job_number || '',
      work_center: entry.work_center || entry.description?.split(' - ')?.[0] || '',
      operator_name: entry.employee_name || entry.description?.split(' - ')?.[1] || '',
      start_time: entry.start_time,
      end_time: entry.end_time || new Date().toISOString(),
      comment: entry.comment || '',
      qty_completed: entry.qty_completed != null ? String(entry.qty_completed) : '',
      pause_logs: entry.pause_logs || [],
      newPause: { paused_at: '', resumed_at: '', comment: '' },
    });
    setIsEditModalOpen(true);
  };

  const addPauseToEditEntry = async () => {
    const { paused_at, resumed_at } = editEntryData.newPause;
    if (!paused_at || !resumed_at) {
      toast.error('Please fill in both pause start and end times');
      return;
    }
    const pauseStart = convertLocalToISO(paused_at);
    const pauseEnd = convertLocalToISO(resumed_at);
    if (new Date(pauseEnd) <= new Date(pauseStart)) {
      toast.error('Resume time must be after pause time');
      return;
    }
    try {
      const token = localStorage.getItem('nexus_token');
      const res = await fetch(`${API_BASE_URL}/labor/${editEntryData.id}/pauses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ paused_at: pauseStart, resumed_at: pauseEnd, comment: editEntryData.newPause.comment || null })
      });
      if (res.ok) {
        const data = await res.json();
        setEditEntryData(prev => ({
          ...prev,
          pause_logs: [...prev.pause_logs, { id: data.id, paused_at: pauseStart, resumed_at: pauseEnd, duration_seconds: data.duration_seconds, comment: prev.newPause.comment || undefined }],
          newPause: { paused_at: '', resumed_at: '', comment: '' }
        }));
        fetchLaborEntries();
        toast.success('Pause added');
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to add pause');
      }
    } catch { toast.error('Error adding pause'); }
  };

  const deletePauseFromEditEntry = async (pauseId: number) => {
    try {
      const token = localStorage.getItem('nexus_token');
      const res = await fetch(`${API_BASE_URL}/labor/${editEntryData.id}/pauses/${pauseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setEditEntryData(prev => ({ ...prev, pause_logs: prev.pause_logs.filter(p => p.id !== pauseId) }));
        fetchLaborEntries();
        toast.success('Pause removed');
      }
    } catch { toast.error('Error removing pause'); }
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
      toast.error('Please select entries to delete');
      return;
    }

    try {
      const token = localStorage.getItem('nexus_token');
      await Promise.all(
        selectedEntries.map(id =>
          fetch(`${API_BASE_URL}/labor/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        )
      );

      toast.success(`Deleted ${selectedEntries.length} entry/entries!`);
      setSelectedEntries([]);
      fetchLaborEntries();
    } catch (error) {
      console.error('Error deleting entries:', error);
      toast.error('Failed to delete entries');
    }
  };

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="w-full space-y-4 p-2 sm:p-4 lg:p-6">
          {/* Compact Header */}
          <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white shadow-2xl rounded-2xl p-5 md:p-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                  <ClockIcon className="w-7 h-7 text-green-300" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Labor Tracking</h1>
                  <p className="text-sm text-teal-200/80 mt-0.5">Real-time production hours</p>
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

          {/* Dashboard Grid - Timer and Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Circular Timer - Takes 2 columns on large screens */}
            <div className="lg:col-span-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">Timer</h2>
                {isTimerRunning && (
                  <span className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
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
                          <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{newEntry.job_number}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <ClockIcon className="w-4 h-4 text-gray-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500 dark:text-slate-400">Work Center</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{newEntry.work_center}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <UserIcon className="w-4 h-4 text-gray-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500 dark:text-slate-400">Operator</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{newEntry.operator_name}</p>
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
              <div className="relative z-[50] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    Job Number <span className="text-red-500">*</span>
                  </label>
                  <Autocomplete
                    value={newEntry.job_number}
                    onChange={handleJobNumberChange}
                    onSelect={handleJobNumberSelect}
                    fetchSuggestions={fetchJobNumbers}
                    placeholder="Type or scan job #"
                    disabled={isTimerRunning}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-slate-200"
                    minChars={0}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    Work Center <span className="text-red-500">*</span>
                  </label>
                  <Autocomplete
                    value={newEntry.work_center}
                    onChange={(value) => {
                      if (!isTimerRunning) {
                        // Don't update state with partial QR scan — let onSelect handle the full QR
                        if (value.includes('NEXUS-STEP|')) return;
                        setNewEntry(prev => ({ ...prev, work_center: value, step_id: undefined }));
                      }
                    }}
                    onSelect={(option: any) => {
                      let selectedWC = option.value || option.label;
                      let stepId = option.step_id;

                      // Parse QR code format: NEXUS-STEP|traveler_id|job_number|work_order|work_center_code|step_number|operation|step_type|step_id|company
                      if (selectedWC.startsWith('NEXUS-STEP|')) {
                        const parts = selectedWC.split('|');
                        const qrWorkCenterCode = parts[4] || '';
                        const qrOperation = parts[6] || '';
                        stepId = parts[8] ? parseInt(parts[8]) : undefined;
                        // Use the operation name as the display value (e.g. "FEEDER LOAD")
                        selectedWC = qrOperation || qrWorkCenterCode;

                        // Also auto-fill job number if empty
                        const qrJobNumber = parts[2] || '';
                        if (qrJobNumber && !newEntry.job_number) {
                          setNewEntry(prev => ({ ...prev, job_number: qrJobNumber }));
                        }
                      }

                      if (isTimerRunning) {
                        // Check if scanned QR matches the running timer's work center
                        const qrParts = (option.value || '').split('|');
                        const qrWCCode = qrParts[4] || '';
                        const qrOp = qrParts[6] || '';
                        const qrSid = qrParts[8] ? parseInt(qrParts[8]) : 0;

                        const matchesCode = qrWCCode && qrWCCode.toLowerCase() === lastStartedWorkCenterCodeRef.current.toLowerCase();
                        const matchesOp = qrOp && qrOp.toLowerCase() === lastStartedWorkCenterRef.current.toLowerCase();
                        const matchesStep = qrSid && qrSid === lastStartedStepIdRef.current;
                        const matchesName = selectedWC.toLowerCase() === lastStartedWorkCenterRef.current.toLowerCase();

                        if (matchesStep || matchesCode || matchesOp || matchesName) {
                          stopTimer();
                        }
                        return;
                      }
                      setNewEntry(prev => ({ ...prev, work_center: selectedWC, step_id: stepId }));
                    }}
                    fetchSuggestions={async (query) => {
                      // If job number is set, fetch work centers from its process steps
                      if (newEntry.job_number) {
                        const jobSteps = await fetchWorkCentersByJob(newEntry.job_number, query);
                        if (jobSteps.length > 0) {
                          // Also include general work centers as fallback
                          const generalWCs = await fetchWorkCenters(query);
                          const existingValues = new Set(jobSteps.map((f: any) => f.value));
                          return [
                            ...jobSteps,
                            ...generalWCs.filter((wc: any) => !existingValues.has(wc.value))
                          ];
                        }
                      }
                      return fetchWorkCenters(query);
                    }}
                    placeholder={isTimerRunning ? "Scan QR to stop timer" : "Type, scan QR, or select"}
                    disabled={false}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all dark:bg-slate-700 dark:text-slate-200"
                    minChars={0}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    Operator <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEntry.operator_name}
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
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    disabled={isTimerRunning}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-slate-200"
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
                        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2"
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
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">Entries</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">{laborEntries.length}</p>
                  </div>
                  <DocumentTextIcon className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              {/* Total Hours Card */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase">Total Hours</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">{getTotalHours()}</p>
                  </div>
                  <ClockIcon className="w-8 h-8 text-emerald-500" />
                </div>
              </div>

              {/* Operators Card */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase">Operators</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                      {new Set(laborEntries.map(e => e.employee_name)).size}
                    </p>
                  </div>
                  <UserIcon className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Job Summary — Filter Card */}
          {(() => {
            // Get unique job numbers from labor entries
            const uniqueJobs = Array.from(new Set(
              laborEntries.map(entry => entry.job_number || `Traveler #${entry.traveler_id}`)
            )).sort();

            // Filter job chips by the summary search
            const visibleJobs = summaryJobSearch
              ? uniqueJobs.filter(job => job.toLowerCase().includes(summaryJobSearch.toLowerCase()))
              : uniqueJobs;

            return (
              <div className="relative z-[10] bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center">
                    <svg className="w-4 h-4 mr-1.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Job Summary
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-slate-400">({uniqueJobs.length} jobs)</span>
                  </h3>
                  {/* Clear all filters button */}
                  {(selectedJobChip || filter.operatorName || filter.startDate || filter.endDate) && (
                    <button
                      onClick={() => {
                        setSelectedJobChip(null);
                        setSummaryJobSearch('');
                        setFilter({ jobNumber: '', workCenter: '', operatorName: '', startDate: '', endDate: '', startTime: '', endTime: '' });
                      }}
                      className="text-xs px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium"
                    >
                      ✕ Clear All Filters
                    </button>
                  )}
                </div>

                {/* Search & Filter Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">Search Job Number</label>
                    <input
                      type="text"
                      value={summaryJobSearch}
                      onChange={(e) => setSummaryJobSearch(e.target.value)}
                      placeholder="Search jobs..."
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">Operator Name</label>
                    <input
                      type="text"
                      value={filter.operatorName}
                      onChange={(e) => setFilter({ ...filter, operatorName: e.target.value })}
                      placeholder="Filter by operator..."
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filter.startDate}
                      onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1">End Date</label>
                    <input
                      type="date"
                      value={filter.endDate}
                      onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Job Number Chips — Collapsible */}
                <div className="border-t border-gray-200 dark:border-slate-600 pt-2">
                  <button
                    onClick={() => setJobListExpanded(!jobListExpanded)}
                    className="flex items-center text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors mb-2"
                  >
                    <svg
                      className={`w-3.5 h-3.5 mr-1 transition-transform ${jobListExpanded ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {jobListExpanded ? 'Hide' : 'Show'} Job Numbers ({visibleJobs.length})
                  </button>

                  {jobListExpanded && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                      {visibleJobs.length > 0 ? visibleJobs.map((job) => (
                        <button
                          key={job}
                          onClick={() => {
                            if (selectedJobChip === job) {
                              setSelectedJobChip(null);
                              setFilter(prev => ({ ...prev, jobNumber: '' }));
                            } else {
                              setSelectedJobChip(job);
                              setFilter(prev => ({ ...prev, jobNumber: job }));
                            }
                          }}
                          className={`flex flex-col items-center justify-center px-3 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                            selectedJobChip === job
                              ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white border-blue-500 shadow-lg scale-[1.03] ring-2 ring-blue-300 dark:ring-blue-800'
                              : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 border-gray-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md hover:scale-[1.02]'
                          }`}
                        >
                          <svg className={`w-5 h-5 mb-1 ${selectedJobChip === job ? 'text-blue-200' : 'text-blue-500 dark:text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm font-bold tracking-wide">{job}</span>
                        </button>
                      )) : (
                        <p className="col-span-full text-sm text-gray-400 dark:text-slate-500 italic text-center py-2">No jobs match your search</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Active filter summary */}
                {(selectedJobChip || filter.operatorName || filter.startDate || filter.endDate) && (
                  <div className="mt-3 pt-2 border-t border-gray-200 dark:border-slate-600 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400">Active:</span>
                    {selectedJobChip && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                        Job: {selectedJobChip}
                        <button onClick={() => { setSelectedJobChip(null); setFilter(prev => ({ ...prev, jobNumber: '' })); }} className="ml-1 hover:text-blue-900 dark:hover:text-blue-100">✕</button>
                      </span>
                    )}
                    {filter.operatorName && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                        Operator: {filter.operatorName}
                        <button onClick={() => setFilter(prev => ({ ...prev, operatorName: '' }))} className="ml-1 hover:text-purple-900 dark:hover:text-purple-100">✕</button>
                      </span>
                    )}
                    {filter.startDate && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                        From: {filter.startDate}
                        <button onClick={() => setFilter(prev => ({ ...prev, startDate: '' }))} className="ml-1 hover:text-emerald-900 dark:hover:text-emerald-100">✕</button>
                      </span>
                    )}
                    {filter.endDate && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                        To: {filter.endDate}
                        <button onClick={() => setFilter(prev => ({ ...prev, endDate: '' }))} className="ml-1 hover:text-emerald-900 dark:hover:text-emerald-100">✕</button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Bulk Action Buttons */}
          {user?.role === 'ADMIN' && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-slate-700 p-4">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <button
                  onClick={selectAll}
                  className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-gray-600 dark:bg-slate-500 hover:bg-gray-700 dark:hover:bg-slate-400 text-white rounded-lg font-semibold shadow-md text-sm md:text-base"
                >
                  <CheckIcon className="h-4 md:h-5 w-4 md:w-5" />
                  <span>{selectedEntries.length === filteredEntries.length && filteredEntries.length > 0 ? 'Deselect All' : 'Select All'}</span>
                </button>

                <button
                  onClick={deleteSelected}
                  disabled={selectedEntries.length === 0}
                  className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 dark:disabled:bg-slate-600 text-white rounded-lg font-semibold shadow-md disabled:cursor-not-allowed text-sm md:text-base"
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

          {/* Labor Entries */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            {/* Table Header + Pagination */}
            <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 px-3 py-2 rounded-t-xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-14 h-14 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
              </div>
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xs sm:text-sm font-bold text-white">Labor Entries</h2>
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
                <div className="p-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                    <ClockIcon className="w-7 h-7 text-gray-400 dark:text-slate-500" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-slate-200 mb-2">
                    {laborEntries.length === 0 ? 'No Labor Entries Yet' : 'No Matching Entries'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {laborEntries.length === 0
                      ? 'Use the timer above to start tracking labor hours.'
                      : 'Try adjusting your filters to see more entries.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {paginatedEntries.map((entry) => {
                    const workCenter = entry.work_center || entry.description?.split(' - ')?.[0] || 'N/A';
                    const operatorName = entry.employee_name || entry.description?.split(' - ')?.[1] || 'N/A';
                    const sequenceDisplay = entry.sequence_number ? `${entry.sequence_number}. ${workCenter}` : workCenter;

                    return (
                      <div key={entry.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <DocumentTextIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                              <span className="font-bold text-gray-900 dark:text-slate-100">{entry.job_number || `Traveler #${entry.traveler_id}`}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-400">
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
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                <svg className="w-5 h-5 text-gray-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>
                              <div id={`labor-menu-${entry.id}`} className="hidden absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-10">
                                <button
                                  onClick={() => {
                                    setSelectedEntry(entry);
                                    setIsModalOpen(true);
                                    document.getElementById(`labor-menu-${entry.id}`)?.classList.add('hidden');
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center space-x-2"
                                >
                                  <EyeIcon className="w-4 h-4 text-blue-600" />
                                  <span>View Details</span>
                                </button>
                                <button
                                  onClick={() => {
                                    openEditModal(entry);
                                    document.getElementById(`labor-menu-${entry.id}`)?.classList.add('hidden');
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
                                    document.getElementById(`labor-menu-${entry.id}`)?.classList.add('hidden');
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
                            <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                              {sequenceDisplay}
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
                            <p className="text-xs text-gray-500 dark:text-slate-400">Pauses</p>
                            {(entry.pause_count || 0) > 0 ? (
                              <div className="mt-1">
                                <span className="inline-block px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-md font-semibold text-xs">
                                  {entry.pause_count}x &middot; {formatSecondsCompact(entry.total_pause_seconds || 0)}
                                </span>
                                {(entry.pause_logs || []).length > 0 && (
                                  <div className="mt-1 space-y-0.5">
                                    {(entry.pause_logs || []).map((pl, idx) => (
                                      <div key={pl.id} className="text-[11px] text-gray-600 dark:text-slate-400 flex items-center gap-1">
                                        <span className="text-gray-400 font-mono">#{idx + 1}</span>
                                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                                          {pl.duration_seconds ? formatSecondsCompact(pl.duration_seconds) : 'active'}
                                        </span>
                                        {pl.comment && <span className="truncate max-w-[120px]" title={pl.comment}>- {pl.comment}</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">0</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-slate-400">End Time</p>
                            <p className="text-sm text-gray-900 dark:text-slate-100 mt-1">
                              {entry.end_time ? new Date(entry.end_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false }) : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="block">
              <div>
              {isLoading ? (
                <div className="p-4"><div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="skeleton h-12 w-full" />)}</div></div>
              ) : filteredEntries.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                    <ClockIcon className="w-7 h-7 text-gray-400 dark:text-slate-500" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-slate-200 mb-2">
                    {laborEntries.length === 0 ? 'No Labor Entries Yet' : 'No Matching Entries'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {laborEntries.length === 0
                      ? 'Use the timer above to start tracking labor hours.'
                      : 'Try adjusting your filters to see more entries.'}
                  </p>
                </div>
              ) : (
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
                    {paginatedEntries.map((entry) => {
                      const workCenter = entry.work_center || entry.description?.split(' - ')?.[0] || 'N/A';
                      const operatorName = entry.employee_name || entry.description?.split(' - ')?.[1] || 'N/A';
                      const sequenceDisplay = entry.sequence_number ? `${entry.sequence_number}. ${workCenter}` : workCenter;

                      // Pause data from API
                      const pauseCount = entry.pause_count || 0;
                      const totalPauseSecs = entry.total_pause_seconds || 0;
                      const totalPauseHours = totalPauseSecs / 3600;

                      const hasComment = !!entry.comment;
                      const totalCols = 10 + (user?.role === 'ADMIN' ? 2 : 0);
                      const rowBg = selectedEntries.includes(entry.id)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                        : 'hover:bg-blue-50/30 dark:hover:bg-slate-700/50';

                      return (
                        <React.Fragment key={entry.id}>
                        <tr className={`transition-colors ${rowBg} ${hasComment ? 'border-b-0' : ''}`}>
                          {user?.role === 'ADMIN' && (
                            <td className={`px-3 py-3 whitespace-nowrap ${hasComment ? 'pb-0' : ''}`} rowSpan={hasComment ? 2 : 1}>
                              <input
                                type="checkbox"
                                checked={selectedEntries.includes(entry.id)}
                                onChange={() => toggleSelectEntry(entry.id)}
                                className="h-5 w-5 text-blue-600 rounded cursor-pointer"
                              />
                            </td>
                          )}
                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300 ${hasComment ? 'pb-1' : ''}`}>
                            {new Date(entry.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' })}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap ${hasComment ? 'pb-1' : ''}`}>
                            <div className="flex items-center space-x-2">
                              <DocumentTextIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <span className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{entry.job_number || `Traveler #${entry.traveler_id}`}</span>
                            </div>
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-slate-400 font-medium ${hasComment ? 'pb-1' : ''}`}>
                            {entry.work_order || '-'}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300 ${hasComment ? 'pb-1' : ''}`}>
                            {operatorName}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap ${hasComment ? 'pb-1' : ''}`}>
                            <span className="px-2.5 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                              {sequenceDisplay}
                            </span>
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-slate-400 ${hasComment ? 'pb-1' : ''}`}>
                            {new Date(entry.start_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className={`px-4 py-3 text-sm ${hasComment ? 'pb-1' : ''}`}>
                            {pauseCount > 0 ? (
                              <div className="group relative">
                                <div className="flex items-center gap-1.5 cursor-default">
                                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-md font-semibold text-xs">
                                    {formatSecondsCompact(totalPauseSecs)}
                                  </span>
                                  <span className="text-[10px] text-gray-500 dark:text-slate-400 whitespace-nowrap">{pauseCount}x</span>
                                </div>
                                {/* Hover tooltip showing each individual pause */}
                                {(entry.pause_logs || []).length > 0 && (
                                  <div className="hidden group-hover:block absolute z-[9999] left-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-xl p-2.5 min-w-[200px] max-w-[280px]">
                                    <div className="text-[11px] font-bold text-gray-700 dark:text-slate-200 mb-1.5 border-b border-gray-100 dark:border-slate-700 pb-1">
                                      {pauseCount} Pause{pauseCount > 1 ? 's' : ''} &middot; Total: {formatSecondsCompact(totalPauseSecs)}
                                    </div>
                                    <div className="space-y-1 max-h-[180px] overflow-y-auto">
                                      {(entry.pause_logs || []).map((pl, idx) => (
                                        <div key={pl.id} className="flex items-start gap-1.5 text-[11px]">
                                          <span className="text-gray-400 dark:text-slate-500 font-mono shrink-0">#{idx + 1}</span>
                                          <span className="font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                                            {pl.duration_seconds ? formatSecondsCompact(pl.duration_seconds) : 'active'}
                                          </span>
                                          {pl.comment && (
                                            <span className="text-gray-500 dark:text-slate-400 truncate" title={pl.comment}>- {pl.comment}</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-slate-500">0</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-slate-400 ${hasComment ? 'pb-1' : ''}`}>
                            {entry.end_time ? new Date(entry.end_time).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap ${hasComment ? 'pb-1' : ''}`}>
                            <div className="flex items-center space-x-1 text-sm font-bold text-emerald-600">
                              <ClockIcon className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                              <span>{formatHoursDualCompact(entry.hours_worked)}</span>
                            </div>
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap text-center text-sm font-semibold text-gray-700 dark:text-slate-300 ${hasComment ? 'pb-1' : ''}`}>
                            {entry.qty_completed != null ? entry.qty_completed : '-'}
                          </td>
                          {user?.role === 'ADMIN' && (
                            <td className={`px-4 py-3 whitespace-nowrap ${hasComment ? 'pb-1' : ''}`} rowSpan={hasComment ? 2 : 1}>
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
                        {hasComment && (
                          <tr className={`${rowBg}`}>
                            <td colSpan={totalCols - (user?.role === 'ADMIN' ? 2 : 0)} className="px-4 pt-0 pb-2">
                              <div className="flex items-center gap-2 ml-0">
                                <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                                <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">{operatorName}:</span>
                                <span className="text-xs text-amber-700 dark:text-amber-300 italic">{entry.comment}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
              </div>
            </div>

            {/* Bottom Pagination */}
            {filteredEntries.length > 0 && (
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
                    <span className="text-xs text-white/80">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredEntries.length)} of {filteredEntries.length}</span>
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
          title={`Labor Entry #${selectedEntry.id}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-slate-400">Job Number</label>
                <p className="text-base text-gray-900 dark:text-slate-100 mt-1">
                  {selectedEntry.job_number || `Traveler #${selectedEntry.traveler_id}`}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-slate-400">Operator</label>
                <p className="text-base text-gray-900 dark:text-slate-100 mt-1">
                  {selectedEntry.description?.split(' - ')[1] || selectedEntry.employee_name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-slate-400">Work Center</label>
                <p className="text-base text-gray-900 dark:text-slate-100 mt-1">
                  {selectedEntry.sequence_number
                    ? `${selectedEntry.sequence_number}. ${selectedEntry.description?.split(' - ')[0] || selectedEntry.work_center}`
                    : selectedEntry.description?.split(' - ')[0] || selectedEntry.work_center || 'N/A'}
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
                {selectedEntry.end_time && (() => {
                  const pauseStart = new Date(selectedEntry.pause_time).getTime();
                  const endTime = new Date(selectedEntry.end_time).getTime();
                  const pauseDuration = Math.round((endTime - pauseStart) / 3600000 * 100) / 100;
                  return pauseDuration > 0 ? (
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                      Duration: <span className="font-semibold text-yellow-600">{pauseDuration.toFixed(2)} hours</span>
                    </p>
                  ) : null;
                })()}
              </div>
            )}

            {selectedEntry.end_time && (
              <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-slate-400">End Time</label>
                <p className="text-base text-gray-900 dark:text-slate-100 mt-1">
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
                <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">Job Number:</span>
                <span className="text-sm text-gray-900 dark:text-slate-100">{entryToDelete.job_number || `Traveler #${entryToDelete.traveler_id}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">Operator:</span>
                <span className="text-sm text-gray-900 dark:text-slate-100">
                  {entryToDelete.description?.split(' - ')[1] || entryToDelete.employee_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">Work Center:</span>
                <span className="text-sm text-gray-900 dark:text-slate-100">
                  {entryToDelete.sequence_number
                    ? `${entryToDelete.sequence_number}. ${entryToDelete.description?.split(' - ')[0] || entryToDelete.work_center}`
                    : entryToDelete.description?.split(' - ')[0] || entryToDelete.work_center || 'N/A'}
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

      {/* Pause Comment Modal (optional comment) */}
      <Modal
        isOpen={showPauseCommentModal}
        onClose={() => { setShowPauseCommentModal(false); setPauseComment(''); }}
        title={pauseAction === 'pause' ? 'Pause Timer' : 'Resume Timer'}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {pauseAction === 'pause' ? 'Add an optional comment for this pause:' : 'Add an optional comment:'}
          </p>
          <textarea
            value={pauseComment}
            onChange={(e) => setPauseComment(e.target.value)}
            placeholder="Optional comment (e.g., lunch break, waiting for parts...)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm resize-none"
            rows={2}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowPauseCommentModal(false); setPauseComment(''); }}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowPauseCommentModal(false);
                if (pauseAction === 'pause') {
                  executePause(pauseComment);
                } else {
                  executeResume(pauseComment);
                }
                setPauseComment('');
              }}
              className={`px-4 py-2 text-sm font-semibold text-white rounded-lg ${
                pauseAction === 'pause'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {pauseAction === 'pause' ? 'Pause' : 'Resume'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Qty Completed Modal */}
      <Modal
        isOpen={isQtyModalOpen}
        onClose={() => {
          setIsQtyModalOpen(false);
          setPendingStopEntryId(null);
          setQtyCompleted('');
          setStopComment('');
        }}
        title="Quantity Completed & Comment"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            How many units did you complete during this time? <span className="text-gray-400 text-xs">(optional)</span>
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
                toast.error(`Quantity cannot exceed traveler quantity (${travelerMaxQty})`);
                return;
              }
              setQtyCompleted(val);
            }}
            placeholder={travelerMaxQty != null ? `Max: ${travelerMaxQty}` : 'Enter quantity completed'}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-slate-700 dark:text-white"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmStopTimer();
            }}
          />
          {qtyCompleted && travelerMaxQty != null && parseInt(qtyCompleted) > travelerMaxQty && (
            <p className="text-xs text-red-600 font-medium">Quantity cannot exceed {travelerMaxQty}</p>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Comment <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              value={stopComment}
              onChange={(e) => setStopComment(e.target.value)}
              placeholder="Add a note about this work..."
              rows={2}
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-white resize-none"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => {
                setIsQtyModalOpen(false);
                setPendingStopEntryId(null);
                setQtyCompleted('');
                setStopComment('');
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmStopTimer}
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
        size="lg"
        isOpen={isManualEntryOpen}
        onClose={() => {
          setIsManualEntryOpen(false);
          setManualEntryData({
            job_number: '',
            work_center: '',
            step_id: undefined,
            operator_name: '',
            operator_id: undefined,
            start_time: '',
            end_time: '',
            comment: '',
            qty_completed: '',
            pauses: [],
          });
          setManualJobWorkCenterOptions([]);
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
                  step_id: undefined,
                  operator_name: '',
                  operator_id: undefined,
                  start_time: '',
                  end_time: '',
                  comment: '',
                  qty_completed: '',
                  pauses: [],
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
                  setManualEntryData(prev => ({ ...prev, job_number: jobNum, work_center: '', step_id: undefined }));
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
                onChange={(value) => setManualEntryData({ ...manualEntryData, work_center: value, step_id: undefined })}
                onSelect={(option: any) => {
                  setManualEntryData(prev => ({ ...prev, work_center: option.value || option.label, step_id: option.step_id }));
                }}
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Qty Completed <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="number"
              min="0"
              value={manualEntryData.qty_completed}
              onChange={(e) => setManualEntryData({ ...manualEntryData, qty_completed: e.target.value })}
              placeholder="Enter quantity..."
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
            />
          </div>

          {/* Pauses Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Pauses <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            {manualEntryData.pauses.length > 0 && (
              <div className="space-y-2 mb-3">
                {manualEntryData.pauses.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
                    <span className="text-gray-500 font-mono text-xs">#{idx + 1}</span>
                    <span className="text-gray-700 dark:text-slate-300">{p.paused_at} → {p.resumed_at}</span>
                    {p.comment && <span className="text-gray-500 text-xs truncate">({p.comment})</span>}
                    <button onClick={() => setManualEntryData(prev => ({ ...prev, pauses: prev.pauses.filter((_, i) => i !== idx) }))} className="ml-auto text-red-500 hover:text-red-700 text-xs font-bold">Remove</button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input type="datetime-local" id="manual-pause-start" placeholder="Pause start" className="px-3 py-1.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:border-amber-500 focus:outline-none dark:bg-slate-700 dark:text-slate-200" />
              <input type="datetime-local" id="manual-pause-end" placeholder="Pause end" className="px-3 py-1.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:border-amber-500 focus:outline-none dark:bg-slate-700 dark:text-slate-200" />
              <div className="flex gap-2">
                <input type="text" id="manual-pause-comment" placeholder="Comment (opt)" className="flex-1 px-3 py-1.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:border-amber-500 focus:outline-none dark:bg-slate-700 dark:text-slate-200" />
                <button
                  type="button"
                  onClick={() => {
                    const startEl = document.getElementById('manual-pause-start') as HTMLInputElement;
                    const endEl = document.getElementById('manual-pause-end') as HTMLInputElement;
                    const commentEl = document.getElementById('manual-pause-comment') as HTMLInputElement;
                    if (!startEl?.value || !endEl?.value) { toast.error('Fill pause start and end'); return; }
                    setManualEntryData(prev => ({
                      ...prev,
                      pauses: [...prev.pauses, { paused_at: startEl.value, resumed_at: endEl.value, comment: commentEl?.value || '' }]
                    }));
                    startEl.value = ''; endEl.value = ''; if (commentEl) commentEl.value = '';
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold whitespace-nowrap"
                >+ Add</button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Comment <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              value={manualEntryData.comment}
              onChange={(e) => setManualEntryData({ ...manualEntryData, comment: e.target.value })}
              placeholder="Add a note about this work..."
              rows={2}
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Edit Entry Modal (ADMIN only) */}
      <Modal
        size="lg"
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Labor Entry"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsEditModalOpen(false)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Job Number
              </label>
              <input
                type="text"
                value={editEntryData.job_number}
                disabled
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 cursor-not-allowed text-gray-600 dark:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Work Center <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editEntryData.work_center}
                onChange={(e) => setEditEntryData({ ...editEntryData, work_center: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Operator Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editEntryData.operator_name}
              onChange={(e) => setEditEntryData({ ...editEntryData, operator_name: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={convertISOToLocal(editEntryData.start_time)}
                onChange={(e) => setEditEntryData({ ...editEntryData, start_time: convertLocalToISO(e.target.value) })}
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
                onChange={(e) => setEditEntryData({ ...editEntryData, end_time: convertLocalToISO(e.target.value) })}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Qty Completed <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="number"
              min="0"
              value={editEntryData.qty_completed}
              onChange={(e) => setEditEntryData({ ...editEntryData, qty_completed: e.target.value })}
              placeholder="Enter quantity..."
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200"
            />
          </div>

          {/* Existing Pauses */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Pauses {editEntryData.pause_logs.length > 0 && <span className="text-amber-600 text-xs">({editEntryData.pause_logs.length} total)</span>}
            </label>
            {editEntryData.pause_logs.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {editEntryData.pause_logs.map((pl, idx) => (
                  <div key={pl.id} className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
                    <span className="text-gray-500 font-mono text-xs">#{idx + 1}</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{pl.duration_seconds ? formatSecondsCompact(pl.duration_seconds) : 'active'}</span>
                    <span className="text-gray-500 dark:text-slate-400 text-xs">
                      {new Date(pl.paused_at).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' })}
                      {pl.resumed_at && ` → ${new Date(pl.resumed_at).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                    {pl.comment && <span className="text-gray-400 text-xs truncate">({pl.comment})</span>}
                    <button onClick={() => deletePauseFromEditEntry(pl.id)} className="ml-auto text-red-500 hover:text-red-700 text-xs font-bold" title="Remove pause">X</button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="datetime-local"
                value={editEntryData.newPause.paused_at}
                onChange={(e) => setEditEntryData(prev => ({ ...prev, newPause: { ...prev.newPause, paused_at: e.target.value } }))}
                className="px-3 py-1.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:border-amber-500 focus:outline-none dark:bg-slate-700 dark:text-slate-200"
                placeholder="Pause start"
              />
              <input
                type="datetime-local"
                value={editEntryData.newPause.resumed_at}
                onChange={(e) => setEditEntryData(prev => ({ ...prev, newPause: { ...prev.newPause, resumed_at: e.target.value } }))}
                className="px-3 py-1.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:border-amber-500 focus:outline-none dark:bg-slate-700 dark:text-slate-200"
                placeholder="Pause end"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editEntryData.newPause.comment}
                  onChange={(e) => setEditEntryData(prev => ({ ...prev, newPause: { ...prev.newPause, comment: e.target.value } }))}
                  placeholder="Comment (opt)"
                  className="flex-1 px-3 py-1.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:border-amber-500 focus:outline-none dark:bg-slate-700 dark:text-slate-200"
                />
                <button type="button" onClick={addPauseToEditEntry} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold whitespace-nowrap">+ Add</button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Comment <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              value={editEntryData.comment}
              onChange={(e) => setEditEntryData({ ...editEntryData, comment: e.target.value })}
              placeholder="Add or edit comment..."
              rows={2}
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all dark:bg-slate-700 dark:text-slate-200 resize-none"
            />
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
