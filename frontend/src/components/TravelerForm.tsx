'use client';

import { useState, useEffect, useRef } from 'react';
import { TravelerType } from '@/types';
import { getWorkCentersByType, WorkCenterItem } from '@/data/workCenters';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config/api';
import {
  PrinterIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface TravelerFormProps {
  mode?: 'create' | 'edit' | 'view';
  initialData?: Record<string, unknown>;
  travelerId?: string;
}

interface FormStep {
  id: string;
  sequence: number;
  workCenter: string;
  instruction: string;
  quantity: number;
  rejected: number;
  accepted: number;
  assign: string;
  date: string;
}

interface TravelerListItem {
  id: number;
  job_number: string;
  work_order_number?: string;
  part_number: string;
  part_description: string;
}

interface ProcessStepData {
  step_number: number;
  operation?: string;
  work_center_code: string;
  instructions: string;
  quantity?: number;
  rejected?: number;
  accepted?: number;
  sign?: string;
  completed_date?: string;
}

interface FullTravelerData {
  id: number;
  job_number: string;
  work_order_number?: string;
  part_number: string;
  part_description: string;
  revision: string;
  quantity: number;
  customer_code?: string;
  customer_name?: string;
  specs?: string;
  from_stock?: string;
  to_stock?: string;
  ship_via?: string;
  comments?: string;
  process_steps?: ProcessStepData[];
}

// Helper function to convert any date format to YYYY-MM-DD for date inputs
const extractDateOnly = (dateStr: unknown): string => {
  if (!dateStr) return '';
  const str = String(dateStr);

  // If already YYYY-MM-DD, return as is
  const ymdMatch = str.match(/^\d{4}-\d{2}-\d{2}/);
  if (ymdMatch) return ymdMatch[0];

  // If MM/DD/YYYY format, convert to YYYY-MM-DD
  const mdyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return `${year}-${month}-${day}`;
  }

  // If ISO timestamp format (YYYY-MM-DDTHH:mm:ss), extract date part
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  return '';
};

// Helper function to increment revision: A → B, B → C, ..., Z → AA, etc.
const incrementRevision = (revision: string): string => {
  if (!revision) return 'A';

  const trimmed = revision.trim().toUpperCase();

  // Handle single letter (A-Z)
  if (trimmed.length === 1 && /^[A-Z]$/.test(trimmed)) {
    const charCode = trimmed.charCodeAt(0);
    if (charCode < 90) { // A-Y
      return String.fromCharCode(charCode + 1);
    } else { // Z
      return 'AA';
    }
  }

  // Handle multi-letter (AA, AB, etc.)
  if (/^[A-Z]+$/.test(trimmed)) {
    const result = trimmed.split('');
    let i = result.length - 1;

    while (i >= 0) {
      if (result[i] === 'Z') {
        result[i] = 'A';
        i--;
      } else {
        result[i] = String.fromCharCode(result[i].charCodeAt(0) + 1);
        break;
      }
    }

    if (i < 0) {
      result.unshift('A');
    }

    return result.join('');
  }

  // Handle numeric versions (V1.0, V1.1, etc.) - increment last number
  const numMatch = trimmed.match(/^(.*)(\d+)$/);
  if (numMatch) {
    const prefix = numMatch[1];
    const number = parseInt(numMatch[2]);
    return prefix + (number + 1);
  }

  // Default: just append 'B' if we can't parse
  return trimmed + 'B';
};

export default function TravelerForm({ mode = 'create', initialData, travelerId }: TravelerFormProps) {
  // Step 1: Select Traveler Type
  const [selectedType, setSelectedType] = useState<TravelerType | ''>(initialData?.traveler_type as TravelerType || '');
  const [showForm, setShowForm] = useState(mode === 'edit' || false);

  // Update selectedType when initialData loads (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && initialData?.traveler_type) {
      setSelectedType(initialData.traveler_type as TravelerType);
      setShowForm(true);
    }
  }, [mode, initialData?.traveler_type]);

  // Split work order into prefix (auto-generated) and suffix (user-editable)
  const splitWorkOrder = (workOrder: string): { prefix: string; suffix: string } => {
    if (!workOrder) return { prefix: '', suffix: '' };
    const parts = workOrder.split('-');
    if (parts.length >= 2) {
      return { prefix: parts[0], suffix: parts.slice(1).join('-') };
    }
    return { prefix: workOrder, suffix: '' };
  };

  const initialWorkOrder = String(initialData?.work_order_number || '');
  const { prefix: initialPrefix, suffix: initialSuffix } = splitWorkOrder(initialWorkOrder);

  const [workOrderPrefix, setWorkOrderPrefix] = useState(initialPrefix);
  const [workOrderSuffix, setWorkOrderSuffix] = useState(initialSuffix);

  const [formData, setFormData] = useState({
    jobNumber: String(initialData?.job_number || ''),
    workOrderNumber: initialWorkOrder,
    partNumber: String(initialData?.part_number || ''),
    partDescription: String(initialData?.part_description || ''),
    revision: String(initialData?.revision || ''),
    customerRevision: String(initialData?.customer_revision || ''),
    partRevision: String(initialData?.part_revision || ''),
    quantity: Number(initialData?.quantity) || 0,
    customerCode: String(initialData?.customer_code || ''),
    customerName: String(initialData?.customer_name || ''),
    priority: (initialData?.priority || 'NORMAL') as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    notes: String(initialData?.notes || ''),
    poNumber: '',
    operation: '',
    pageNumber: '1',
    totalPages: '1',
    drawingNumber: '',
    specs: String(initialData?.specs || ''),
    specsDate: '',
    fromStock: String(initialData?.from_stock || ''),
    toStock: String(initialData?.to_stock || ''),
    shipVia: String(initialData?.ship_via || ''),
    lot: '',
    startDate: extractDateOnly(initialData?.start_date || initialData?.created_at),
    dueDate: extractDateOnly(initialData?.due_date),
    shipDate: extractDateOnly(initialData?.ship_date),
    comments: String(initialData?.comments || '')
  });

  const [formSteps, setFormSteps] = useState<FormStep[]>([]);
  const [isLeadFree, setIsLeadFree] = useState(false);
  const [isITAR, setIsITAR] = useState(false);
  const [includeLaborHours, setIncludeLaborHours] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [travelerDbId, setTravelerDbId] = useState<number | null>(null);
  const [autoPopulatedRevision, setAutoPopulatedRevision] = useState<string>('');
  const [wasAutoPopulated, setWasAutoPopulated] = useState(false);

  // Dynamic work centers from DB (fetched per traveler type)
  const [dynamicWorkCenters, setDynamicWorkCenters] = useState<WorkCenterItem[]>([]);

  // Auto-save draft state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [draftId, setDraftId] = useState<number | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');

  // Refs for step rows to enable auto-scroll after reordering
  const stepRowRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Ref for abort controller to prevent race conditions in auto-populate
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep page at top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch work centers from DB when traveler type changes, fallback to static
  useEffect(() => {
    if (!selectedType) return;
    const typeMap: Record<string, string> = { 'PCB_ASSEMBLY': 'PCB_ASSEMBLY', 'PCB': 'PCB', 'CABLE': 'CABLE', 'CABLES': 'CABLE', 'PURCHASING': 'PURCHASING' };
    const dbType = typeMap[selectedType] || selectedType;
    const fetchWC = async () => {
      try {
        const token = localStorage.getItem('nexus_token');
        const response = await fetch(`${API_BASE_URL}/work-centers-mgmt/?traveler_type=${dbType}`, {
          headers: { 'Authorization': `Bearer ${token || 'mock-token'}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setDynamicWorkCenters(data.map((wc: any) => ({ name: wc.name, description: wc.description || '', code: wc.code || '' })));
            return;
          }
        }
      } catch { /* fallback to static */ }
      setDynamicWorkCenters(getWorkCentersByType(selectedType));
    };
    fetchWC();
  }, [selectedType]);

  // Fetch next sequential work order number on create mode
  useEffect(() => {
    if (mode === 'create' && !initialData?.work_order_number) {
      const fetchNextWorkOrderNumber = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/travelers/next-work-order-number`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.next_work_order_prefix) {
              setWorkOrderPrefix(data.next_work_order_prefix);
            }
          }
        } catch (error) {
          console.error('Failed to fetch next work order number:', error);
        }
      };
      fetchNextWorkOrderNumber();
    }
  }, [mode, initialData?.work_order_number]);

  // Sync workOrderNumber when prefix or suffix changes
  useEffect(() => {
    let fullWorkOrder = '';
    if (workOrderPrefix && workOrderSuffix) {
      fullWorkOrder = `${workOrderPrefix}-${workOrderSuffix}`;
    } else if (workOrderPrefix) {
      fullWorkOrder = workOrderPrefix;
    } else if (workOrderSuffix) {
      fullWorkOrder = workOrderSuffix; // Don't create "-suffix" if no prefix
    }
    setFormData(prev => ({ ...prev, workOrderNumber: fullWorkOrder }));
  }, [workOrderPrefix, workOrderSuffix]);

  // Debug: Monitor formSteps changes
  const prevStepsCountRef = useRef(0);
  useEffect(() => {
    const prevCount = prevStepsCountRef.current;
    const newCount = formSteps.length;

    if (newCount > prevCount) {
      console.log('📊 formSteps INCREASED:', prevCount, '→', newCount);
      if (newCount > 0) {
        console.log('   First step:', formSteps[0]);
      }
    } else if (newCount < prevCount) {
      console.warn('⚠️ formSteps DECREASED:', prevCount, '→', newCount, '- STEPS WERE CLEARED!');
    } else if (newCount > 0) {
      console.log('📊 formSteps updated (same count):', newCount);
    }

    prevStepsCountRef.current = newCount;
  }, [formSteps]);

  // Auto-save draft functionality
  useEffect(() => {
    // Only auto-save in create mode, when form is shown, and job number exists
    if (mode !== 'create' || !showForm || !formData.jobNumber.trim()) {
      return;
    }

    // Create a snapshot of the current form data for comparison
    const currentDataSnapshot = JSON.stringify({
      formData,
      formSteps,
      selectedType,
      isLeadFree,
      isITAR,
      includeLaborHours
    });

    // Don't save if data hasn't changed
    if (currentDataSnapshot === lastSavedDataRef.current) {
      return;
    }

    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Debounce auto-save by 3 seconds
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');

        // Build full job number with compliance indicators
        let fullJobNumber = formData.jobNumber;
        if (isLeadFree) fullJobNumber += 'L';
        if (isITAR) fullJobNumber += 'M';

        // Map traveler type to backend enum
        const travelerTypeMap: { [key: string]: string } = {
          'PCB_ASSEMBLY': 'PCB_ASSEMBLY',
          'PCB': 'PCB',
          'CABLE': 'CABLE',
          'PURCHASING': 'PURCHASING'
        };

        // Construct proper work order number from prefix and suffix
        let fullWorkOrderNumber = '';
        if (workOrderPrefix && workOrderSuffix) {
          fullWorkOrderNumber = `${workOrderPrefix}-${workOrderSuffix}`;
        } else if (workOrderPrefix) {
          fullWorkOrderNumber = workOrderPrefix;
        } else if (workOrderSuffix) {
          fullWorkOrderNumber = workOrderSuffix;
        } else {
          fullWorkOrderNumber = formData.workOrderNumber || fullJobNumber;
        }

        const draftData = {
          job_number: fullJobNumber,
          work_order_number: fullWorkOrderNumber,
          po_number: formData.poNumber || '',
          traveler_type: travelerTypeMap[selectedType] || 'ASSY',
          part_number: formData.partNumber || '',
          part_description: formData.partDescription || '',
          revision: formData.revision || 'A',
          customer_revision: formData.customerRevision || '',
          part_revision: formData.partRevision || '',
          quantity: parseInt(formData.quantity.toString()) || 1,
          customer_code: formData.customerCode || '',
          customer_name: formData.customerName || '',
          priority: formData.priority || 'NORMAL',
          work_center: formSteps[0]?.workCenter || 'ASSEMBLY',
          status: 'DRAFT',
          is_active: false,
          include_labor_hours: false,
          notes: formData.notes || '',
          specs: formData.specs || '',
          specs_date: formData.specsDate || '',
          from_stock: formData.fromStock || '',
          to_stock: formData.toStock || '',
          ship_via: formData.shipVia || '',
          comments: formData.comments || '',
          start_date: formData.startDate || '',
          due_date: formData.dueDate || '',
          ship_date: formData.shipDate || '',
          process_steps: formSteps.map(step => ({
            step_number: step.sequence,
            operation: step.workCenter,
            work_center_code: dynamicWorkCenters.find(wc => wc.name === step.workCenter)?.code || step.workCenter.replace(/\s+/g, '_').toUpperCase(),
            instructions: step.instruction || '',
            estimated_time: 30,
            is_required: true,
            quantity: step.quantity || null,
            accepted: step.accepted || null,
            rejected: step.rejected || null,
            sign: step.assign || '',
            completed_date: step.date || ''
          }))
        };

        const token = localStorage.getItem('nexus_token');
        const url = draftId
          ? `${API_BASE_URL}/travelers/${draftId}`
          : `${API_BASE_URL}/travelers/`;
        const method = draftId ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(draftData)
        });

        if (response.ok) {
          const result = await response.json();
          if (!draftId && result.id) {
            setDraftId(result.id);
          }
          lastSavedDataRef.current = currentDataSnapshot;
          setAutoSaveStatus('saved');
          console.log('✅ Draft auto-saved successfully');

          // Reset status to idle after 2 seconds
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        } else {
          console.warn('⚠️ Auto-save failed:', response.status);
          setAutoSaveStatus('error');
          setTimeout(() => setAutoSaveStatus('idle'), 3000);
        }
      } catch (error) {
        console.error('❌ Auto-save error:', error);
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      }
    }, 3000); // 3 second debounce

    // Cleanup
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, formSteps, selectedType, isLeadFree, isITAR, includeLaborHours, mode, showForm, draftId, workOrderPrefix, workOrderSuffix]);

  const travelerTypes = [
    {
      value: 'PCB_ASSEMBLY',
      label: 'PCB Assembly',
      description: 'Full board assembly with components',
      gradient: 'from-blue-500 to-blue-700',
      hoverGradient: 'from-blue-600 to-blue-800',
      borderColor: 'border-blue-400',
      bgAccent: 'bg-blue-400/20',
      iconBg: 'bg-blue-400/30'
    },
    {
      value: 'PCB',
      label: 'PCB',
      description: 'Bare circuit board fabrication',
      gradient: 'from-green-500 to-green-700',
      hoverGradient: 'from-green-600 to-green-800',
      borderColor: 'border-green-400',
      bgAccent: 'bg-green-400/20',
      iconBg: 'bg-green-400/30'
    },
    {
      value: 'CABLE',
      label: 'Cables',
      description: 'Cable and wire harness assembly',
      gradient: 'from-purple-500 to-purple-700',
      hoverGradient: 'from-purple-600 to-purple-800',
      borderColor: 'border-purple-400',
      bgAccent: 'bg-purple-400/20',
      iconBg: 'bg-purple-400/30'
    },
    {
      value: 'PURCHASING',
      label: 'Purchasing',
      description: 'Parts and components procurement',
      gradient: 'from-orange-500 to-orange-700',
      hoverGradient: 'from-orange-600 to-orange-800',
      borderColor: 'border-orange-400',
      bgAccent: 'bg-orange-400/20',
      iconBg: 'bg-orange-400/30'
    }
  ];

  useEffect(() => {
    console.log('🔵 selectedType useEffect triggered | mode:', mode, '| selectedType:', selectedType);

    if (mode === 'edit' && initialData) {
      console.log('📝 EDIT mode - loading initial data');
      // Store the database ID for edit mode
      if (initialData.id) {
        setTravelerDbId(Number(initialData.id));
      }

      // Update formData with initialData values
      setFormData({
        jobNumber: String(initialData.job_number || ''),
        workOrderNumber: String(initialData.work_order_number || ''),
        partNumber: String(initialData.part_number || ''),
        partDescription: String(initialData.part_description || ''),
        revision: String(initialData.revision || ''),
        customerRevision: String(initialData.customer_revision || ''),
        partRevision: String(initialData.part_revision || ''),
        quantity: Number(initialData.quantity) || 0,
        customerCode: String(initialData.customer_code || ''),
        customerName: String(initialData.customer_name || ''),
        priority: (initialData.priority || 'NORMAL') as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
        notes: String(initialData.notes || ''),
        poNumber: String(initialData.po_number || ''),
        operation: '',
        pageNumber: '1',
        totalPages: '1',
        drawingNumber: '',
        specs: String(initialData.specs || ''),
        specsDate: '',
        fromStock: String(initialData.from_stock || ''),
        toStock: String(initialData.to_stock || ''),
        shipVia: String(initialData.ship_via || ''),
        lot: '',
        startDate: extractDateOnly(initialData.start_date || initialData.created_at),
        dueDate: extractDateOnly(initialData.due_date),
        shipDate: extractDateOnly(initialData.ship_date),
        comments: String(initialData.comments || '')
      });

      // Update work order prefix and suffix
      const workOrder = String(initialData.work_order_number || '');
      const { prefix, suffix } = splitWorkOrder(workOrder);
      setWorkOrderPrefix(prefix);
      setWorkOrderSuffix(suffix);

      // Load labor hours and active status
      if (typeof initialData.include_labor_hours === 'boolean') {
        setIncludeLaborHours(initialData.include_labor_hours);
      }
      if (typeof initialData.is_active === 'boolean') {
        setIsActive(initialData.is_active);
      }

      // Load existing steps for edit mode
      if (initialData.process_steps) {
        const existingSteps = (initialData.process_steps as Array<Record<string, unknown>>).map((step: Record<string, unknown>, index: number) => {
          // Extract just the date part (YYYY-MM-DD) from datetime strings
          let dateValue = '';
          if (step.completed_date) {
            const dateStr = String(step.completed_date);
            // Extract YYYY-MM-DD from ISO string or datetime
            const match = dateStr.match(/^\d{4}-\d{2}-\d{2}/);
            dateValue = match ? match[0] : '';
          }

          return {
            id: String(step.id || index),
            sequence: Number(step.step_number),
            workCenter: String(step.operation),
            instruction: String(step.instructions || ''),
            quantity: Number(step.quantity || 0),
            rejected: Number(step.rejected || 0),
            accepted: Number(step.accepted || 0),
            assign: String(step.sign || ''),
            date: dateValue
          };
        });
        setFormSteps(existingSteps);
      }
      // Prevent page from scrolling when loading edit data
      setTimeout(() => window.scrollTo(0, 0), 0);
    } else if (selectedType && mode === 'create' && formSteps.length === 0) {
      // In create mode, load default steps ONLY if formSteps is empty (not already auto-populated)
      console.log('❌ LOADING DEFAULT STEPS for type:', selectedType);
      loadDefaultSteps(selectedType);
      // Set labor hours based on traveler type (only PCB doesn't have labor hours)
      setIncludeLaborHours(selectedType !== 'PCB');
      // Keep page at top when selecting type
      setTimeout(() => window.scrollTo(0, 0), 0);
    }
  }, [selectedType, mode, initialData]);

  // Auto-populate form when job number and work order match an existing traveler
  useEffect(() => {
    console.log('🔍 Auto-populate check:', {
      mode,
      jobNumber: formData.jobNumber,
      workOrder: formData.workOrderNumber,
      willTrigger: mode === 'create' && formData.jobNumber && formData.workOrderNumber
    });

    // Only do this in create mode (not edit mode) and when both fields are filled with meaningful values
    if (mode === 'create' && formData.jobNumber.trim().length >= 3 && formData.workOrderNumber.trim().length >= 3) {
      console.log('✅ Auto-populate triggered! Waiting 300ms then fetching...');

      // Cancel any previous request to prevent race conditions
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      const currentController = abortControllerRef.current;

      const fetchLatestRevision = async () => {
        try {
          const url = `${API_BASE_URL}/travelers/latest-revision?job_number=${encodeURIComponent(formData.jobNumber)}&work_order=${encodeURIComponent(formData.workOrderNumber)}`;
          console.log('🌐 Fetching:', url);

          const response = await fetch(url, {
            signal: currentController.signal
          });
          console.log('📡 Response status:', response.status);

          if (response.ok) {
            const latestTraveler = await response.json();
            console.log('✅ Got traveler data:', latestTraveler);

            if (latestTraveler) {
              // Parse specs if it's a JSON array
              let specsText = '';
              try {
                const specsData = latestTraveler.specs;
                if (specsData) {
                  if (typeof specsData === 'string') {
                    // Try to parse if it's a JSON string
                    const parsed = JSON.parse(specsData);
                    if (Array.isArray(parsed)) {
                      specsText = parsed.map((spec: Record<string, unknown>) => String(spec.text || '')).join('\n');
                    } else {
                      specsText = specsData;
                    }
                  } else if (Array.isArray(specsData)) {
                    specsText = specsData.map((spec: Record<string, unknown>) => String(spec.text || '')).join('\n');
                  }
                }
              } catch {
                // If parsing fails, just use the raw value
                specsText = String(latestTraveler.specs || '');
              }

              // Auto-increment the traveler revision
              const oldRevision = String(latestTraveler.revision || 'A');
              const newRevision = incrementRevision(oldRevision);

              // Auto-populate form fields from the latest revision with incremented revision
              setFormData(prev => ({
                ...prev,
                partNumber: String(latestTraveler.part_number || ''),
                partDescription: String(latestTraveler.part_description || ''),
                revision: newRevision,
                customerRevision: String(latestTraveler.customer_revision || ''),
                partRevision: String(latestTraveler.part_revision || ''),
                quantity: Number(latestTraveler.quantity) || 0,
                customerCode: String(latestTraveler.customer_code || ''),
                customerName: String(latestTraveler.customer_name || ''),
                priority: (latestTraveler.priority || 'NORMAL') as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
                specs: specsText,
                fromStock: String(latestTraveler.from_stock || ''),
                toStock: String(latestTraveler.to_stock || ''),
                shipVia: String(latestTraveler.ship_via || ''),
                dueDate: extractDateOnly(latestTraveler.due_date),
                shipDate: extractDateOnly(latestTraveler.ship_date),
                comments: String(latestTraveler.comments || '')
              }));

              // Load process steps from the latest revision FIRST (before setting traveler type)
              console.log('Latest traveler data:', latestTraveler);
              console.log('Process steps from API:', latestTraveler.process_steps);
              console.log('Is array?', Array.isArray(latestTraveler.process_steps));

              if (latestTraveler.process_steps && Array.isArray(latestTraveler.process_steps)) {
                console.log('Number of process steps:', latestTraveler.process_steps.length);
                const existingSteps = latestTraveler.process_steps.map((step: Record<string, unknown>, index: number) => ({
                  id: String(Date.now() + index), // Generate new IDs for the form
                  sequence: Number(step.step_number),
                  workCenter: String(step.operation),
                  instruction: String(step.instructions || ''),
                  quantity: Number(step.quantity || 0),
                  rejected: 0, // Reset these for new traveler
                  accepted: 0,
                  assign: '',
                  date: ''
                }));
                console.log('✅ Mapped steps count:', existingSteps.length);
                console.log('✅ First step:', existingSteps[0]);
                console.log('✅ Calling setFormSteps with', existingSteps.length, 'steps');
                setFormSteps(existingSteps);
                console.log('✅ setFormSteps called - React will update on next render');
              } else {
                console.warn('No process steps found or not an array');
              }

              // Set flags
              setIsLeadFree(latestTraveler.is_lead_free || false);
              setIsITAR(latestTraveler.is_itar || false);
              setIncludeLaborHours(latestTraveler.include_labor_hours || false);

              console.log('✅ Auto-populate complete with', latestTraveler.process_steps?.length || 0, 'steps');

              // Store the old and new revisions
              setAutoPopulatedRevision(newRevision);
              setWasAutoPopulated(true);

              // Show notification to user
              toast.info(`Auto-populated from revision ${oldRevision}! Revision incremented to: ${newRevision}`);

              // Keep page at top after auto-populating
              setTimeout(() => window.scrollTo(0, 0), 0);
            } else {
              console.log('⚠️ API returned null - no matching traveler found');
            }
          } else {
            console.warn('⚠️ API returned error status:', response.status);
          }
        } catch (error) {
          // Ignore abort errors (they're expected when a new request cancels the old one)
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('🔄 Previous request cancelled');
            return;
          }
          console.error('❌ Error fetching latest revision:', error);
        }
      };

      // Debounce the API call to avoid excessive requests (reduced to 300ms)
      const timeoutId = setTimeout(fetchLatestRevision, 300);
      return () => {
        console.log('🔄 Cleaning up auto-populate timeout');
        clearTimeout(timeoutId);
        // Cancel ongoing request on cleanup
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }
  }, [formData.jobNumber, formData.workOrderNumber, mode]);

  const loadDefaultSteps = (type: TravelerType) => {
    // Default empty steps with sequential numbering
    const defaultSteps: FormStep[] = [
      { id: '1', sequence: 1, workCenter: '', instruction: '', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
      { id: '2', sequence: 2, workCenter: '', instruction: '', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
      { id: '3', sequence: 3, workCenter: '', instruction: '', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
      { id: '4', sequence: 4, workCenter: '', instruction: '', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
      { id: '5', sequence: 5, workCenter: '', instruction: '', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' }
    ];

    setFormSteps(defaultSteps);
  };

  const handleTypeSelect = (type: TravelerType) => {
    setSelectedType(type);
    setShowForm(true);
  };

  const addNewStep = () => {
    const newStep: FormStep = {
      id: Date.now().toString(),
      sequence: formSteps.length + 1,
      workCenter: '',
      instruction: '',
      quantity: formData.quantity,
      rejected: 0,
      accepted: 0,
      assign: '',
      date: ''
    };
    setFormSteps([...formSteps, newStep]);
  };

  const removeStep = (id: string) => {
    const newSteps = formSteps.filter(step => step.id !== id);

    // Renumber remaining steps consecutively
    const renumberedSteps = newSteps.map((step, idx) => ({
      ...step,
      sequence: idx + 1
    }));

    setFormSteps(renumberedSteps);
  };

  const updateStep = (id: string, field: keyof FormStep, value: string | number) => {
    // If sequence number changed, reorder steps properly
    if (field === 'sequence') {
      const targetSequence = Number(value);

      // Find the step being moved
      const movingStep = formSteps.find(step => step.id === id);
      if (!movingStep) return;

      // Remove the moving step from the array
      const otherSteps = formSteps.filter(step => step.id !== id);

      // Insert it at the target position (targetSequence - 1 because array is 0-indexed)
      const insertIndex = Math.max(0, Math.min(targetSequence - 1, otherSteps.length));
      const reorderedSteps = [
        ...otherSteps.slice(0, insertIndex),
        movingStep,
        ...otherSteps.slice(insertIndex)
      ];

      // Renumber all steps consecutively
      const renumberedSteps = reorderedSteps.map((step, idx) => ({
        ...step,
        sequence: idx + 1
      }));

      setFormSteps(renumberedSteps);

      // Scroll to the step at the target position
      setTimeout(() => {
        const targetStep = renumberedSteps[targetSequence - 1];
        if (targetStep) {
          const stepElement = stepRowRefs.current[targetStep.id];
          if (stepElement) {
            stepElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight the row briefly
            stepElement.style.backgroundColor = '#dbeafe'; // Light blue
            setTimeout(() => {
              stepElement.style.backgroundColor = '';
            }, 1500);
          }
        }
      }, 100);
    } else {
      // For all other fields, just update normally
      const newSteps = formSteps.map(step =>
        step.id === id ? { ...step, [field]: value } : step
      );
      setFormSteps(newSteps);
    }
  };

  const handlePrint = () => {
    if (!formData.jobNumber) {
      toast.warning('Please enter a Job Number before printing.');
      return;
    }
    toast.info(`Printing Traveler: ${formData.jobNumber}`);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleSubmit = async () => {
    if (!formData.jobNumber || !formData.workOrderNumber || !formData.partNumber) {
      toast.warning('Missing Required Fields: Please fill in Job Number, Work Order Number, Part Number');
      return;
    }

    // Check if form was auto-populated and revision hasn't been changed
    if (mode === 'create' && wasAutoPopulated && formData.revision === autoPopulatedRevision) {
      toast.warning('Revision Not Changed: This was auto-populated from revision ' + autoPopulatedRevision + '. You MUST change the revision before saving.');
      return;
    }

    // Build full job number with compliance indicators
    let fullJobNumber = formData.jobNumber;
    if (isLeadFree) fullJobNumber += 'L';
    if (isITAR) fullJobNumber += 'M';

    // Map traveler type to backend enum - ONLY 4 types
    const travelerTypeMap: { [key: string]: string } = {
      'PCB_ASSEMBLY': 'PCB_ASSEMBLY',
      'PCB': 'PCB',
      'CABLE': 'CABLE',
      'PURCHASING': 'PURCHASING'
    };

    // PCB travelers should never have labor hours
    const finalIncludeLaborHours = (selectedType === 'PCB') ? false : includeLaborHours;

    // Auto-increment revision when editing (if changes were made)
    const finalRevision = mode === 'edit' && initialData?.revision
      ? incrementRevision(String(initialData.revision))
      : formData.revision || 'A';

    // Prepare API payload
    const travelerData = {
      job_number: fullJobNumber,
      work_order_number: formData.workOrderNumber || fullJobNumber,
      po_number: formData.poNumber || '',
      traveler_type: travelerTypeMap[selectedType] || 'PCB_ASSEMBLY',
      part_number: formData.partNumber,
      part_description: formData.partDescription || 'Assembly',
      revision: finalRevision,
      customer_revision: formData.customerRevision || '',
      part_revision: formData.partRevision || '',
      quantity: parseInt(formData.quantity.toString()) || 1,
      customer_code: formData.customerCode || '',
      customer_name: formData.customerName || '',
      priority: formData.priority || 'NORMAL',
      work_center: formSteps[0]?.workCenter || 'ASSEMBLY',
      status: 'CREATED',
      is_active: true,
      include_labor_hours: finalIncludeLaborHours,
      notes: formData.notes || '',
      specs: formData.specs || '',
      specs_date: formData.specsDate || '',
      from_stock: formData.fromStock || '',
      to_stock: formData.toStock || '',
      ship_via: formData.shipVia || '',
      comments: formData.comments || '',
      start_date: formData.startDate || '',
      due_date: formData.dueDate || '',
      ship_date: formData.shipDate || formData.dueDate || '',
      process_steps: formSteps.map(step => ({
        step_number: step.sequence,
        operation: step.workCenter,
        work_center_code: dynamicWorkCenters.find(wc => wc.name === step.workCenter)?.code || step.workCenter.replace(/\s+/g, '_').toUpperCase(),
        instructions: step.instruction || '',
        estimated_time: 30,
        is_required: true,
        quantity: step.quantity || null,
        accepted: step.accepted || null,
        rejected: step.rejected || null,
        sign: step.assign || null,
        completed_date: step.date || null,
        sub_steps: []
      })),
      manual_steps: []
    };

    console.log('Submitting traveler data:', JSON.stringify(travelerData, null, 2));

    try {
      // Call API to create or update traveler
      // Use draftId if available (from auto-save), otherwise use existing ID for edit mode
      const existingId = draftId || travelerDbId || (mode === 'edit' ? travelerId : null);
      const url = existingId
        ? `${API_BASE_URL}/travelers/${existingId}`
        : `${API_BASE_URL}/travelers/`;
      const method = existingId ? 'PUT' : 'POST';

      console.log(`Making ${method} request to ${url}`);

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
        },
        body: JSON.stringify(travelerData)
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response body:', responseText);

      if (!response.ok) {
        let errorMessage = `Failed to ${mode === 'edit' ? 'update' : 'create'} traveler`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = JSON.parse(responseText);
      console.log('Traveler saved successfully:', result);

      const action = mode === 'create' ? 'Created' : 'Updated';
      const complianceInfo = [];
      if (isLeadFree) complianceInfo.push('🟢 Lead Free (RoHS)');
      if (isITAR) complianceInfo.push('⚠️ ITAR Controlled');

      toast.success(`Traveler ${action} Successfully! Job: ${fullJobNumber} | Part: ${formData.partNumber}`);

      // Redirect to travelers list
      setTimeout(() => {
        window.location.href = '/travelers';
      }, 1500);
    } catch (error: unknown) {
      console.error('Error saving traveler:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Error ${mode === 'edit' ? 'Updating' : 'Creating'} Traveler: ${errorMessage}`);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.jobNumber) {
      toast.warning('Job Number Required: Please enter a Job Number to save as draft.');
      return;
    }

    // Build full job number with compliance indicators
    let fullJobNumber = formData.jobNumber;
    if (isLeadFree) fullJobNumber += 'L';
    if (isITAR) fullJobNumber += 'M';

    // Construct proper work order number from prefix and suffix
    let fullWorkOrderNumber = '';
    if (workOrderPrefix && workOrderSuffix) {
      fullWorkOrderNumber = `${workOrderPrefix}-${workOrderSuffix}`;
    } else if (workOrderPrefix) {
      fullWorkOrderNumber = workOrderPrefix;
    } else if (workOrderSuffix) {
      fullWorkOrderNumber = workOrderSuffix;
    } else {
      fullWorkOrderNumber = formData.workOrderNumber || fullJobNumber;
    }

    // Map traveler type to backend enum
    const travelerTypeMap: { [key: string]: string } = {
      'PCB_ASSEMBLY': 'PCB_ASSEMBLY',
      'PCB': 'PCB',
      'CABLE': 'CABLE',
      'PURCHASING': 'PURCHASING'
    };

    // Prepare API payload with DRAFT status
    const travelerData = {
      job_number: fullJobNumber,
      work_order_number: fullWorkOrderNumber,
      po_number: formData.poNumber || '',
      traveler_type: travelerTypeMap[selectedType] || 'PCB_ASSEMBLY',
      part_number: formData.partNumber || '',
      part_description: formData.partDescription || '',
      revision: formData.revision || 'A',
      customer_revision: formData.customerRevision || '',
      part_revision: formData.partRevision || '',
      quantity: parseInt(formData.quantity.toString()) || 1,
      customer_code: formData.customerCode || '',
      customer_name: formData.customerName || '',
      priority: formData.priority || 'NORMAL',
      work_center: formSteps[0]?.workCenter || 'ASSEMBLY',
      status: 'DRAFT',  // Set status to DRAFT
      is_active: false,  // Drafts are not active
      include_labor_hours: false,
      notes: formData.notes || '',
      specs: formData.specs || '',
      specs_date: formData.specsDate || '',
      from_stock: formData.fromStock || '',
      to_stock: formData.toStock || '',
      ship_via: formData.shipVia || '',
      comments: formData.comments || '',
      start_date: formData.startDate || '',
      due_date: formData.dueDate || '',
      ship_date: formData.shipDate || '',
      process_steps: formSteps.map(step => ({
        step_number: step.sequence,
        operation: step.workCenter,
        work_center_code: dynamicWorkCenters.find(wc => wc.name === step.workCenter)?.code || step.workCenter.replace(/\s+/g, '_').toUpperCase(),
        instructions: step.instruction || '',
        estimated_time: 30,
        is_required: true,
        quantity: step.quantity || null,
        accepted: step.accepted || null,
        rejected: step.rejected || null,
        sign: step.assign || '',
        completed_date: step.date || ''
      }))
    };

    try {
      const token = localStorage.getItem('nexus_token');
      // Use existing draft ID if available (from auto-save), otherwise create new or edit existing
      const existingId = draftId || (mode === 'edit' ? travelerId : null);
      const url = existingId
        ? `${API_BASE_URL}/travelers/${existingId}`
        : `${API_BASE_URL}/travelers/`;

      const method = existingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(travelerData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Draft saved successfully:', result);

      // Update draftId if this was a new draft
      if (!draftId && result.id) {
        setDraftId(result.id);
      }

      toast.success(`Draft Saved Successfully! Job: ${fullJobNumber} | Status: DRAFT`);

      // Redirect to travelers list
      setTimeout(() => {
        window.location.href = '/travelers';
      }, 1500);
    } catch (error: unknown) {
      console.error('Error saving draft:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Error Saving Draft: ${errorMessage}`);
    }
  };

  // If type not selected, show type selection
  if (!showForm) {
    return (
      <div className="h-[calc(100vh-6rem)] bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 flex flex-col items-center justify-center -m-4 sm:-m-4 rounded-xl overflow-hidden">
        <div className="w-full max-w-3xl px-4">
          {/* Header */}
          <div className="mb-4 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white rounded-2xl p-5 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl border border-white/20 mb-3">
                <svg className="w-7 h-7 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">Select Traveler Type</h1>
              <p className="text-sm text-blue-200/80">Choose the type that matches your manufacturing process</p>
            </div>
          </div>

          {/* Cards Grid - 2x2 */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3">
            {/* PCB Assembly */}
            <button
              onClick={() => handleTypeSelect('PCB_ASSEMBLY' as TravelerType)}
              className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700"></div>
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="bg-white/15 backdrop-blur-sm p-3 sm:p-3.5 rounded-xl border border-white/20 mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5">PCB Assembly</h3>
                <p className="text-[11px] sm:text-xs text-white/70">Board assembly with components</p>
                <div className="mt-2.5 flex items-center gap-1 text-white/50 group-hover:text-white transition-colors duration-300">
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Select</span>
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* PCB */}
            <button
              onClick={() => handleTypeSelect('PCB' as TravelerType)}
              className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700"></div>
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="bg-white/15 backdrop-blur-sm p-3 sm:p-3.5 rounded-xl border border-white/20 mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m3-2v2m3-2v2M9 19v2m3-2v2m3-2v2M3 9h2m-2 3h2m-2 3h2M19 9h2m-2 3h2m-2 3h2M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h3v3H8zM13 12h3v3h-3z" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5">PCB</h3>
                <p className="text-[11px] sm:text-xs text-white/70">Bare circuit board fabrication</p>
                <div className="mt-2.5 flex items-center gap-1 text-white/50 group-hover:text-white transition-colors duration-300">
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Select</span>
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Cables */}
            <button
              onClick={() => handleTypeSelect('CABLE' as TravelerType)}
              className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-violet-700"></div>
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="bg-white/15 backdrop-blur-sm p-3 sm:p-3.5 rounded-xl border border-white/20 mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4M10 3v4M7 17v4M10 17v4M5 7h7a1 1 0 011 1v1a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1zM5 15h7a1 1 0 011 1v1a1 1 0 01-1 1H5a1 1 0 01-1-1v-1a1 1 0 011-1zM13 8.5c2 0 3 1.5 3 3.5s-1 3.5-3 3.5" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5">Cables</h3>
                <p className="text-[11px] sm:text-xs text-white/70">Wire harness assembly</p>
                <div className="mt-2.5 flex items-center gap-1 text-white/50 group-hover:text-white transition-colors duration-300">
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Select</span>
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Purchasing */}
            <button
              onClick={() => handleTypeSelect('PURCHASING' as TravelerType)}
              className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-700"></div>
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="bg-white/15 backdrop-blur-sm p-3 sm:p-3.5 rounded-xl border border-white/20 mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4M17 12h4M7 8v8h10V8H7z" />
                    <line x1="9.5" y1="10" x2="9.5" y2="14" />
                    <line x1="12" y1="10" x2="12" y2="14" />
                    <line x1="14.5" y1="10" x2="14.5" y2="14" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5">Purchasing</h3>
                <p className="text-[11px] sm:text-xs text-white/70">Parts & components procurement</p>
                <div className="mt-2.5 flex items-center gap-1 text-white/50 group-hover:text-white transition-colors duration-300">
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Select</span>
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          {/* Back Button */}
          <div className="text-center">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to Travelers
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Debug: Log render state
  console.log('🎨 RENDER: formSteps.length =', formSteps.length, '| selectedType =', selectedType);

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-2 sm:p-4 lg:p-6 overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto overflow-x-hidden">
        {/* Header with Type Badge - NO PRINT */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 shadow-2xl rounded-2xl p-4 sm:p-5 md:p-8 mb-3 sm:mb-4 md:mb-6 no-print relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:space-x-4">
              <span className="px-3 py-2 bg-white text-indigo-700 rounded-lg font-bold shadow-md text-sm md:text-base">
                {travelerTypes.find(t => t.value === selectedType)?.label}
              </span>
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white">Traveler Form</h2>
                <p className="text-sm text-blue-200/80 mt-0.5">Fill in all required fields</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="w-full sm:w-auto px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white rounded-xl font-semibold transition-colors border border-white/20 text-sm md:text-base"
            >
              Change Type
            </button>
          </div>
        </div>

        {/* Action Buttons - Top of Form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <PrinterIcon className="h-5 w-5" />
            <span>Print Traveler</span>
          </button>

          <button
            onClick={handleSaveDraft}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <span>💾 Save as Draft</span>
          </button>

          <button
            onClick={handleSubmit}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg"
          >
            <span>{mode === 'create' ? 'Create Traveler' : 'Update Traveler'}</span>
          </button>
        </div>

        {/* Print Header with Barcode - PRINT ONLY */}
        <div className="hidden print:block bg-gray-100 border-b-2 border-black p-3 mb-0">
          <div className="grid grid-cols-3 gap-4 text-xs">
            {/* Left */}
            <div className="space-y-1">
              <div className="flex">
                <span className="font-bold w-24">Cust. Code:</span>
                <span>{formData.customerCode || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24">Cust. Name:</span>
                <span>{formData.customerName || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24">Work Order:</span>
                <span>{formData.workOrderNumber || '-'}</span>
              </div>
            </div>

            {/* Center - Barcode with Details */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="border border-black bg-white inline-block" style={{padding: '1px 2px', marginBottom: '0px', lineHeight: '0'}}>
                  <svg width="28" height="10" style={{display: 'block', margin: '0'}}>
                    <rect x="1" y="1" width="0.6" height="6" fill="black"/>
                    <rect x="2" y="1" width="0.4" height="6" fill="black"/>
                    <rect x="3" y="1" width="0.8" height="6" fill="black"/>
                    <rect x="4.5" y="1" width="0.4" height="6" fill="black"/>
                    <rect x="5.5" y="1" width="0.6" height="6" fill="black"/>
                    <rect x="6.5" y="1" width="0.4" height="6" fill="black"/>
                    <rect x="7.5" y="1" width="0.8" height="6" fill="black"/>
                    <rect x="9" y="1" width="0.6" height="6" fill="black"/>
                    <rect x="10" y="1" width="0.4" height="6" fill="black"/>
                    <rect x="11" y="1" width="0.6" height="6" fill="black"/>
                    <text x="14" y="8.5" fontSize="2" textAnchor="middle" fontWeight="bold">*{formData.jobNumber}{isLeadFree && 'L'}{isITAR && 'M'}*</text>
                  </svg>
                </div>
                <div style={{fontSize: '5px', fontWeight: 'bold', lineHeight: '1', marginTop: '1px'}}>Job: {formData.jobNumber}{isLeadFree && 'L'}{isITAR && 'M'}</div>
                <div style={{fontSize: '4px', lineHeight: '1'}}>Cust: {formData.customerName}</div>
                <div style={{fontSize: '4px', lineHeight: '1'}}>WO: {formData.workOrderNumber}</div>
                <div style={{fontSize: '4px', lineHeight: '1'}}>Qty: {formData.quantity}</div>
              </div>
            </div>

            {/* Right */}
            <div className="space-y-1">
              <div className="flex">
                <span className="font-bold w-24">Start Date:</span>
                <span>{formData.startDate || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24">Due Date:</span>
                <span>{formData.dueDate || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24">Ship Date:</span>
                <span>{formData.shipDate || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form - Page 1 */}
        <div className="bg-white shadow-lg rounded-lg border-2 border-indigo-100 p-3 sm:p-4 md:p-6 lg:p-8 mb-3 sm:mb-4 md:mb-6 overflow-hidden">
          {/* Top Row - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Page</label>
              <input
                type="text"
                value={formData.pageNumber}
                onChange={(e) => setFormData({...formData, pageNumber: e.target.value})}
                className="w-full min-w-0 border-2 border-gray-300 rounded px-2 py-1.5 text-xs sm:text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Job No * {isLeadFree && <span className="text-green-600">(L)</span>}{isITAR && <span className="text-red-600">(M)</span>}
              </label>
              <div className="flex items-center gap-1 min-w-0">
                <input
                  type="text"
                  value={formData.jobNumber}
                  onChange={async (e) => {
                    const value = e.target.value;
                    setFormData({...formData, jobNumber: value});
                    // Auto-populate from existing traveler with same job number
                    if (value.length >= 3 && mode === 'create') {
                      try {
                        const response = await fetch(`${API_BASE_URL}/travelers/`, {
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
                          }
                        });
                        if (response.ok) {
                          const travelers: TravelerListItem[] = await response.json();
                          // Find traveler with matching job number
                          const matchingTraveler = travelers.find((t: TravelerListItem) =>
                            t.job_number.toLowerCase() === value.toLowerCase()
                          );

                          if (matchingTraveler) {
                            // Fetch full traveler details with steps
                            const detailResponse = await fetch(`${API_BASE_URL}/travelers/${matchingTraveler.id}`, {
                              headers: {
                                'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
                              }
                            });

                            if (detailResponse.ok) {
                              const fullData: FullTravelerData = await detailResponse.json();

                              // Split work order number into prefix and suffix
                              if (fullData.work_order_number) {
                                const { prefix, suffix } = splitWorkOrder(fullData.work_order_number);
                                setWorkOrderPrefix(prefix);
                                setWorkOrderSuffix(suffix);
                              }

                              // Auto-populate all fields
                              setFormData(prev => ({
                                ...prev,
                                workOrderNumber: fullData.work_order_number || prev.workOrderNumber,
                                partNumber: fullData.part_number || prev.partNumber,
                                partDescription: fullData.part_description || prev.partDescription,
                                revision: fullData.revision || prev.revision,
                                quantity: fullData.quantity || prev.quantity,
                                customerCode: fullData.customer_code || prev.customerCode,
                                customerName: fullData.customer_name || prev.customerName,
                                specs: fullData.specs || prev.specs,
                                fromStock: fullData.from_stock || prev.fromStock,
                                toStock: fullData.to_stock || prev.toStock,
                                shipVia: fullData.ship_via || prev.shipVia,
                                comments: fullData.comments || prev.comments
                              }));

                              // Auto-populate process steps
                              if (fullData.process_steps && fullData.process_steps.length > 0) {
                                console.log('📋 Auto-populating steps:', fullData.process_steps.length);
                                const newSteps = fullData.process_steps.map((step: ProcessStepData, index: number) => ({
                                  id: `step-${Date.now()}-${index}`,
                                  sequence: step.step_number,
                                  workCenter: step.operation || step.work_center_code || '',
                                  instruction: step.instructions || '',
                                  quantity: step.quantity || 0,
                                  rejected: step.rejected || 0,
                                  accepted: step.accepted || 0,
                                  assign: step.sign || '',
                                  date: step.completed_date || ''
                                }));
                                console.log('✅ Setting form steps:', newSteps);
                                setFormSteps(newSteps);
                              }

                              console.log('✅ Auto-populated data from existing traveler:', matchingTraveler.job_number);
                            }
                          }
                        }
                      } catch (error) {
                        console.error('Error fetching traveler data:', error);
                      }
                    }
                  }}
                  className="flex-1 min-w-0 border-2 border-blue-300 rounded px-2 py-1.5 text-xs sm:text-sm font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  placeholder="8414"
                />
                {isLeadFree && <span className="flex-shrink-0 px-2 py-1.5 bg-green-100 text-green-800 font-bold rounded text-xs border border-green-300">L</span>}
                {isITAR && <span className="flex-shrink-0 px-2 py-1.5 bg-purple-100 text-purple-800 font-bold rounded text-xs border border-purple-300">M</span>}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Work Order *</label>
              <div className="flex items-center gap-1 min-w-0">
                <input
                  type="text"
                  value={workOrderPrefix}
                  readOnly
                  className="flex-1 min-w-0 border-2 border-gray-300 bg-gray-100 rounded px-2 py-1.5 text-xs sm:text-sm font-bold text-gray-600 cursor-not-allowed"
                  placeholder="12345"
                  title="Auto-generated prefix (read-only)"
                />
                <span className="text-gray-600 font-bold flex-shrink-0 text-xs sm:text-sm">-</span>
                <input
                  type="text"
                  value={workOrderSuffix}
                  onChange={(e) => setWorkOrderSuffix(e.target.value)}
                  className="w-14 sm:w-16 md:w-20 flex-shrink-0 border-2 border-blue-300 rounded px-1 sm:px-2 py-1.5 text-xs sm:text-sm font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  placeholder="6"
                  title="Editable suffix"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full min-w-0 border-2 border-gray-300 rounded px-2 py-1.5 text-xs sm:text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                className="w-full min-w-0 border-2 border-gray-300 rounded px-2 py-1.5 text-xs sm:text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Ship Date</label>
              <input
                type="date"
                value={formData.shipDate}
                onChange={(e) => setFormData({...formData, shipDate: e.target.value})}
                className="w-full min-w-0 border-2 border-gray-300 rounded px-2 py-1.5 text-xs sm:text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Customer and Part Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8 mb-3 sm:mb-4 md:mb-6">
            {/* Left Column */}
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Customer Code</label>
                <input
                  type="text"
                  value={formData.customerCode}
                  onChange={(e) => setFormData({...formData, customerCode: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm md:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="750"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm md:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="ACME Corporation"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Part No *</label>
                <input
                  type="text"
                  value={formData.partNumber}
                  onChange={(e) => setFormData({...formData, partNumber: e.target.value})}
                  className="w-full border-2 border-blue-300 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm md:text-base font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="METSHIFT"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">PO Number</label>
                <input
                  type="text"
                  value={formData.poNumber}
                  onChange={(e) => setFormData({...formData, poNumber: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm md:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="PO-12345"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Part Description *</label>
                <input
                  type="text"
                  value={formData.partDescription}
                  onChange={(e) => setFormData({...formData, partDescription: e.target.value})}
                  className="w-full border-2 border-blue-300 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm md:text-base font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="METSHIFT Assembly"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Quantity *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                    className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 text-sm font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                    placeholder="250"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Lot</label>
                  <input
                    type="text"
                    value={formData.lot}
                    onChange={(e) => setFormData({...formData, lot: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Traveler Revision</label>
                  <input
                    type="text"
                    value={formData.revision}
                    onChange={(e) => {
                      setFormData({...formData, revision: e.target.value});
                      // Clear auto-populate flag when user manually changes revision
                      if (wasAutoPopulated && e.target.value !== autoPopulatedRevision) {
                        setWasAutoPopulated(false);
                      }
                    }}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                    placeholder="A"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Customer Revision</label>
                <input
                  type="text"
                  value={formData.customerRevision}
                  onChange={(e) => setFormData({...formData, customerRevision: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm md:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="REV A"
                />
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 md:p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 shadow-sm">
            {/* Only show labor hours option for non-PCB travelers */}
            {selectedType !== 'PCB' && (
              <div className={`flex items-center space-x-4 p-3 rounded border-2 transition-all ${includeLaborHours ? 'bg-green-50 border-green-500' : 'bg-white border-gray-200'}`}>
                <input
                  type="checkbox"
                  id="includeLaborHours"
                  checked={includeLaborHours}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    setIncludeLaborHours(newValue);
                    if (newValue) {
                      toast.success('Labor Hours Table will be included in this traveler!');
                    }
                  }}
                  className="w-5 h-5 text-blue-600 border border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="includeLaborHours" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm md:text-base">Include Labor Hours Table</p>
                    <p className="text-xs text-gray-500">
                      {includeLaborHours ? '✓ Labor tracking enabled' : 'Add labor tracking section'}
                    </p>
                  </div>
                </label>
              </div>
            )}

            <div className={`flex items-center space-x-4 p-3 rounded border-2 transition-all ${isActive ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}>
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setIsActive(newValue);
                  if (newValue) {
                    toast.success('Traveler will be marked as ACTIVE');
                  } else {
                    toast.warning('Traveler will be marked as INACTIVE');
                  }
                }}
                className="w-5 h-5 text-blue-600 border border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="isActive" className="flex-1 cursor-pointer">
                <div>
                  <p className="font-semibold text-gray-900 text-sm md:text-base">Active Traveler</p>
                  <p className="text-xs text-gray-500">Mark as active in production</p>
                </div>
              </label>
            </div>
          </div>

          {/* Specifications - Prominent Section with Date */}
          <div className="mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 md:p-5 bg-yellow-50 rounded-lg border-2 border-yellow-200 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-3">
              <label className="block text-sm md:text-base font-bold text-gray-900">Specifications</label>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <label className="text-xs md:text-sm font-semibold text-gray-700">Date:</label>
                <input
                  type="date"
                  value={formData.specsDate}
                  onChange={(e) => setFormData({...formData, specsDate: e.target.value})}
                  className="flex-1 sm:flex-none border border-gray-300 rounded px-2 md:px-3 py-1.5 text-sm focus:border-blue-500"
                />
              </div>
            </div>
            <textarea
              value={formData.specs}
              onChange={(e) => setFormData({...formData, specs: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 focus:border-blue-500 min-h-[100px] md:min-h-[120px] resize-y"
              placeholder="Enter specifications, notes, and special requirements..."
              style={{color: '#000000', backgroundColor: '#ffffff'}}
            />
          </div>

          {/* Stock and Shipping Info */}
          <div className="mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 md:p-5 bg-blue-50 rounded-lg border-2 border-blue-200 shadow-sm">
            <h3 className="text-sm md:text-base font-bold text-gray-900 mb-3">Stock &amp; Shipping Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">From Stock</label>
                <input
                  type="text"
                  value={formData.fromStock}
                  onChange={(e) => setFormData({...formData, fromStock: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 md:px-4 py-2 text-sm md:text-base focus:border-blue-500"
                  placeholder="Location..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">To Stock</label>
                <input
                  type="text"
                  value={formData.toStock}
                  onChange={(e) => setFormData({...formData, toStock: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 md:px-4 py-2 text-sm md:text-base focus:border-blue-500"
                  placeholder="Location..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ship Via</label>
                <input
                  type="text"
                  value={formData.shipVia}
                  onChange={(e) => setFormData({...formData, shipVia: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 md:px-4 py-2 text-sm md:text-base focus:border-blue-500"
                  placeholder="Shipping method..."
                />
              </div>
            </div>
          </div>

          {/* Process Steps - Card-Based Layout */}
          <div className="mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 md:p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 shadow-sm max-w-full overflow-hidden" style={{ maxWidth: '100%' }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Process Steps (Routing)</h3>
              <button
                onClick={addNewStep}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-colors shadow-md"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Step</span>
              </button>
            </div>

            <div className="space-y-3 md:space-y-4 overflow-x-hidden w-full" style={{ maxWidth: '100%' }}>
              {formSteps.map((step, index) => (
                <div
                  key={step.id}
                  ref={(el) => {
                    stepRowRefs.current[step.id] = el;
                  }}
                  className="bg-white border-2 border-indigo-200 rounded-lg p-3 md:p-4 shadow-sm transition-colors duration-300 overflow-x-hidden max-w-full"
                  style={{ maxWidth: '100%', width: '100%' }}
                >
                  {/* Step Header */}
                  <div className="mb-4 pb-3 border-b border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded text-sm">
                        Step {index + 1}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
                      <div className="flex items-center gap-2 bg-yellow-100 border-2 border-yellow-400 rounded-lg px-3 py-1.5">
                        <label className="text-xs md:text-sm font-bold text-yellow-800">SEQ #</label>
                        <input
                          type="number"
                          min="1"
                          value={step.sequence}
                          onChange={(e) => {
                            const newSeq = parseInt(e.target.value);
                            if (!isNaN(newSeq) && newSeq >= 1) {
                              updateStep(step.id, 'sequence', newSeq);
                            }
                          }}
                          className="w-16 md:w-20 border-2 border-yellow-500 rounded px-2 md:px-3 py-1 text-base md:text-lg font-bold text-center bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <button
                        onClick={() => removeStep(step.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm font-semibold"
                        title="Remove step"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span>Remove Step</span>
                      </button>
                    </div>
                  </div>

                  {/* Step Fields - RESPONSIVE COLUMNS */}
                  <div className="space-y-4 overflow-x-hidden w-full" style={{ maxWidth: '100%' }}>
                    {/* Row 1: Work Center - Full Width on Mobile */}
                    <div className="w-full overflow-x-hidden" style={{ maxWidth: '100%' }}>
                      <label className="block text-xs font-bold text-gray-700 mb-2">Work Center</label>
                      <div className="w-full overflow-hidden" style={{ maxWidth: '100%' }}>
                        <select
                          value={step.workCenter}
                          onChange={(e) => updateStep(step.id, 'workCenter', e.target.value)}
                          className="block w-full border-2 border-blue-400 rounded-lg px-2 font-medium hover:border-blue-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 bg-white cursor-pointer"
                          style={{
                            minHeight: '28px',
                            fontSize: '13px',
                            lineHeight: '1.2',
                            paddingTop: '4px',
                            paddingBottom: '4px',
                            width: '100%',
                            maxWidth: '80vw',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden'
                          }}
                        >
                          <option value="" style={{ fontSize: '13px' }}>Select Work Center...</option>
                          {dynamicWorkCenters.map(wc => (
                            <option key={wc.name} value={wc.name} title={wc.description} style={{ fontSize: '13px' }}>
                              {wc.name}
                            </option>
                          ))}
                        </select>
                        {step.workCenter && (
                          <div className="hidden md:group-hover:block absolute left-0 top-full mt-1 z-50 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl max-w-xs">
                            <div className="font-bold text-yellow-300 mb-1">{step.workCenter}</div>
                            <div>{dynamicWorkCenters.find(wc => wc.name === step.workCenter)?.description || ''}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Quantity, Rejected, Accepted, Sign, Date - RESPONSIVE */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 overflow-hidden">
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-700 mb-2 text-center">Quantity</label>
                        <input
                          type="number"
                          value={step.quantity}
                          onChange={(e) => updateStep(step.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full border-2 border-gray-300 rounded px-2 py-2 text-sm text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-red-700 mb-2 text-center">Rejected</label>
                        <input
                          type="number"
                          value={step.rejected}
                          onChange={(e) => updateStep(step.id, 'rejected', parseInt(e.target.value) || 0)}
                          className="w-full border-2 border-red-300 rounded px-2 py-2 text-sm text-center focus:border-red-500 focus:ring-1 focus:ring-red-200"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-green-700 mb-2 text-center">Accepted</label>
                        <input
                          type="number"
                          value={step.accepted}
                          onChange={(e) => updateStep(step.id, 'accepted', parseInt(e.target.value) || 0)}
                          className="w-full border-2 border-green-300 rounded px-2 py-2 text-sm text-center focus:border-green-500 focus:ring-1 focus:ring-green-200"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-purple-700 mb-2 text-center">Sign</label>
                        <input
                          type="text"
                          value={step.assign}
                          onChange={(e) => updateStep(step.id, 'assign', e.target.value)}
                          className="w-full border-2 border-purple-300 rounded px-2 py-2 text-sm text-center focus:border-purple-500 focus:ring-1 focus:ring-purple-200"
                          placeholder="Init"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-bold text-gray-700 mb-2 text-center">Date</label>
                        <input
                          type="date"
                          value={step.date}
                          onChange={(e) => updateStep(step.id, 'date', e.target.value)}
                          className="w-full border-2 border-gray-300 rounded px-1.5 md:px-2 py-2 text-xs md:text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 overflow-hidden"
                          style={{ maxWidth: '100%' }}
                        />
                      </div>
                    </div>

                    {/* Row 2: Instructions - Full Width */}
                    <div>
                      <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">Instructions</label>
                      <textarea
                        value={step.instruction}
                        onChange={(e) => updateStep(step.id, 'instruction', e.target.value)}
                        className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 min-h-[60px] md:min-h-[80px] resize-y"
                        placeholder="Enter detailed instructions for this step..."
                        style={{color: '#000000', backgroundColor: '#ffffff'}}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {formSteps.length === 0 && (
                <div className="text-center py-6 md:py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-sm md:text-base text-gray-600">No process steps yet. Click &quot;Add Step&quot; to create one.</p>
                </div>
              )}
            </div>

            {/* Add Step Button at Bottom */}
            <div className="flex justify-center mt-4">
              <button
                onClick={addNewStep}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-colors shadow-md"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Step</span>
              </button>
            </div>
          </div>

          {/* Comments Section - Prominent */}
          <div className="mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 md:p-5 bg-green-50 rounded-lg border-2 border-green-200 shadow-sm">
            <label className="block text-sm md:text-base font-bold text-gray-900 mb-3">Comments &amp; Notes</label>
            <textarea
              value={formData.comments}
              onChange={(e) => setFormData({...formData, comments: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 focus:border-blue-500 min-h-[120px] md:min-h-[150px] resize-y"
              placeholder="Enter any additional comments, notes, quality issues, or special instructions..."
              style={{color: '#000000', backgroundColor: '#ffffff'}}
            />
          </div>
        </div>

        {/* Auto-Save Status Indicator */}
        {mode === 'create' && formData.jobNumber && (
          <div className="flex items-center justify-end mb-2 px-1">
            {autoSaveStatus === 'saving' && (
              <span className="flex items-center text-sm text-blue-600">
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Auto-saving draft...
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="flex items-center text-sm text-green-600">
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Draft saved automatically
              </span>
            )}
            {autoSaveStatus === 'error' && (
              <span className="flex items-center text-sm text-red-600">
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Auto-save failed
              </span>
            )}
          </div>
        )}

        {/* Action Buttons - Bottom of Form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t-2 border-gray-200">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <PrinterIcon className="h-5 w-5" />
            <span>Print Traveler</span>
          </button>

          <button
            onClick={handleSaveDraft}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <span>💾 Save as Draft</span>
          </button>

          <button
            onClick={handleSubmit}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg"
          >
            <span>{mode === 'create' ? 'Create Traveler' : 'Update Traveler'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
