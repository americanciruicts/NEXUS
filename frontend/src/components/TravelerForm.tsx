'use client';

import { useState, useEffect, useRef } from 'react';
import { TravelerType } from '@/types';
import { getWorkCentersByType, WorkCenterItem } from '@/data/workCenters';
import {
  PrinterIcon,
  QrCodeIcon,
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

  const [formData, setFormData] = useState({
    jobNumber: String(initialData?.job_number || ''),
    workOrderNumber: String(initialData?.work_order_number || ''),
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
    startDate: extractDateOnly(initialData?.created_at || initialData?.start_date),
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

  // Refs for step rows to enable auto-scroll after reordering
  const stepRowRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Keep page at top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  const travelerTypes = [
    { value: 'PCB_ASSEMBLY', label: 'PCB Assembly', color: 'bg-blue-600' },
    { value: 'PCB', label: 'PCB', color: 'bg-green-600' },
    { value: 'CABLES', label: 'Cables', color: 'bg-purple-600' },
    { value: 'PURCHASING', label: 'Purchasing', color: 'bg-orange-600' }
  ];

  useEffect(() => {
    console.log('🔵 selectedType useEffect triggered | mode:', mode, '| selectedType:', selectedType);

    if (mode === 'edit' && initialData) {
      console.log('📝 EDIT mode - loading initial data');
      // Store the database ID for edit mode
      if (initialData.id) {
        setTravelerDbId(Number(initialData.id));
      }

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
    } else if (selectedType && mode === 'create') {
      // In create mode, load default steps ONLY ONCE when type is first selected
      console.log('❌ LOADING DEFAULT STEPS for type:', selectedType);
      loadDefaultSteps(selectedType);
      // Set labor hours based on traveler type
      setIncludeLaborHours(selectedType !== 'PCB' && selectedType !== 'PARTS');
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

      const fetchLatestRevision = async () => {
        try {
          const url = `http://acidashboard.aci.local:100/api/travelers/latest-revision?job_number=${encodeURIComponent(formData.jobNumber)}&work_order=${encodeURIComponent(formData.workOrderNumber)}`;
          console.log('🌐 Fetching:', url);

          const response = await fetch(url);
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
              alert(`Auto-populated from revision ${oldRevision}!\n\nTraveler revision has been automatically incremented to: ${newRevision}`);

              // Keep page at top after auto-populating
              setTimeout(() => window.scrollTo(0, 0), 0);
            } else {
              console.log('⚠️ API returned null - no matching traveler found');
            }
          } else {
            console.warn('⚠️ API returned error status:', response.status);
          }
        } catch (error) {
          console.error('❌ Error fetching latest revision:', error);
        }
      };

      // Debounce the API call to avoid excessive requests (reduced to 300ms)
      const timeoutId = setTimeout(fetchLatestRevision, 300);
      return () => {
        console.log('🔄 Cleaning up auto-populate timeout');
        clearTimeout(timeoutId);
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
      alert('⚠️ Please enter a Job Number before printing the traveler.');
      return;
    }
    alert(`🖨️ Printing Traveler...\n\nJob Number: ${formData.jobNumber}\n\nThe traveler document is being prepared for printing.`);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const generateBarcode = () => {
    if (!formData.jobNumber) {
      alert('⚠️ Please enter a Job Number first before generating a barcode.');
      return;
    }
    const barcodeId = `TRV-${formData.jobNumber}-${Date.now()}`;
    console.log('Generated barcode:', barcodeId);
    alert(`✅ Barcode Generated Successfully!\n\n` +
          `Job Number: ${formData.jobNumber}\n` +
          `Barcode ID: ${barcodeId}\n\n` +
          `This barcode can be printed and attached to the traveler for tracking purposes.`);
  };

  const handleSubmit = async () => {
    if (!formData.jobNumber || !formData.workOrderNumber || !formData.partNumber) {
      alert('⚠️ Missing Required Fields\n\nPlease fill in the following required fields:\n• Job Number\n• Work Order Number\n• Part Number');
      return;
    }

    // Check if form was auto-populated and revision hasn't been changed
    if (mode === 'create' && wasAutoPopulated && formData.revision === autoPopulatedRevision) {
      alert('⚠️ Revision Not Changed\n\nThis traveler was auto-populated from revision: ' + autoPopulatedRevision + '\n\nYou MUST change the revision number before saving.\n\nPlease update the revision field to proceed.');
      return;
    }

    // Build full job number with compliance indicators
    let fullJobNumber = formData.jobNumber;
    if (isLeadFree) fullJobNumber += 'L';
    if (isITAR) fullJobNumber += 'M';

    // Map traveler type to backend enum
    const travelerTypeMap: { [key: string]: string } = {
      'PCB_ASSEMBLY': 'ASSY',
      'PCB': 'PCB',
      'CABLE': 'CABLE',
      'CABLE_ASSEMBLY': 'CABLE',
      'PCB_CABLE_ASSEMBLY': 'ASSY',
      'PARTS': 'ASSY',
      'ASSEMBLY': 'ASSY'
    };

    // PCB and PARTS travelers should never have labor hours
    const finalIncludeLaborHours = (selectedType === 'PCB' || selectedType === 'PARTS') ? false : includeLaborHours;

    // Prepare API payload
    const travelerData = {
      job_number: fullJobNumber,
      work_order_number: formData.workOrderNumber || fullJobNumber,
      po_number: formData.poNumber || '',
      traveler_type: travelerTypeMap[selectedType] || 'ASSY',
      part_number: formData.partNumber,
      part_description: formData.partDescription || 'Assembly',
      revision: formData.revision || 'A',
      customer_revision: formData.customerRevision || '',
      part_revision: formData.partRevision || '',
      quantity: parseInt(formData.quantity.toString()) || 1,
      customer_code: formData.customerCode || '',
      customer_name: formData.customerName || '',
      priority: formData.priority || 'NORMAL',
      work_center: formSteps[0]?.workCenter || 'ASSEMBLY',
      is_active: isActive,
      include_labor_hours: finalIncludeLaborHours,
      notes: formData.notes || '',
      specs: formData.specs || '',
      specs_date: formData.specsDate || '',
      from_stock: formData.fromStock || '',
      to_stock: formData.toStock || '',
      ship_via: formData.shipVia || '',
      comments: formData.comments || '',
      due_date: formData.dueDate || '',
      ship_date: formData.shipDate || formData.dueDate || '',
      process_steps: formSteps.map(step => ({
        step_number: step.sequence,
        operation: step.workCenter,
        work_center_code: step.workCenter.replace(/\s+/g, '_').toUpperCase(),
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
      const url = mode === 'edit'
        ? `http://acidashboard.aci.local:100/api/travelers/${travelerDbId || travelerId}`
        : 'http://acidashboard.aci.local:100/api/travelers/';
      const method = mode === 'edit' ? 'PUT' : 'POST';

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

      alert(`✅ Traveler ${action} Successfully!\n\n` +
            `Job Number: ${fullJobNumber}\n` +
            `Part Number: ${formData.partNumber}\n` +
            `Traveler Type: ${selectedType?.replace('_', ' ')}\n` +
            (complianceInfo.length > 0 ? `Compliance: ${complianceInfo.join(', ')}\n` : '') +
            `\nThe traveler has been ${action.toLowerCase()} and is now available in the travelers list.`);

      // Redirect to travelers list
      setTimeout(() => {
        window.location.href = '/travelers';
      }, 1500);
    } catch (error: unknown) {
      console.error('Error saving traveler:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Error ${mode === 'edit' ? 'Updating' : 'Creating'} Traveler\n\n${errorMessage}\n\nPlease check the console for more details.`);
    }
  };

  // If type not selected, show type selection
  if (!showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-4 lg:p-8">
        <div className="w-full">
          {/* Header Section */}
          <div className="text-center mb-10">
            <div className="inline-block p-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full mb-4 shadow-lg">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Create New Traveler</h1>
            <p className="text-lg text-gray-600">Select a traveler type to get started</p>
          </div>

          {/* Type Selection Cards */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-100 p-8 mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Traveler Types
              </h2>
              <p className="text-gray-600 ml-8">Choose the type that matches your manufacturing process</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {travelerTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleTypeSelect(type.value as TravelerType)}
                  className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300 p-5 text-left border border-indigo-300"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <svg className="w-7 h-7 text-indigo-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <svg className="w-5 h-5 text-indigo-200 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold mb-1">{type.label}</h3>
                    <p className="text-xs text-indigo-100 opacity-90">Click to create</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.history.back()}
              className="group px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-300 flex items-center space-x-2 border-2 border-gray-300"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Cancel</span>
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-4 lg:p-6">
      <div className="w-full">
        {/* Header with Type Badge - NO PRINT */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg rounded-lg p-6 mb-6 border-2 border-indigo-300 no-print">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className="px-4 py-2 bg-white text-indigo-700 rounded-lg font-bold shadow-md">
                {travelerTypes.find(t => t.value === selectedType)?.label}
              </span>
              <div>
                <h2 className="text-xl font-bold text-white">Traveler Form</h2>
                <p className="text-sm text-indigo-100">Fill in all required fields</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 transition-colors shadow-md"
            >
              Change Type
            </button>
          </div>
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
                <div className="border border-black bg-white inline-block" style={{padding: '0px', marginBottom: '0px', lineHeight: '0'}}>
                  <svg width="15" height="8" style={{display: 'block', margin: '0'}}>
                    <rect x="0.5" y="0.5" width="0.3" height="5" fill="black"/>
                    <rect x="1" y="0.5" width="0.2" height="5" fill="black"/>
                    <rect x="1.5" y="0.5" width="0.4" height="5" fill="black"/>
                    <rect x="2.2" y="0.5" width="0.2" height="5" fill="black"/>
                    <rect x="2.7" y="0.5" width="0.3" height="5" fill="black"/>
                    <rect x="3.2" y="0.5" width="0.2" height="5" fill="black"/>
                    <rect x="3.7" y="0.5" width="0.4" height="5" fill="black"/>
                    <rect x="4.4" y="0.5" width="0.3" height="5" fill="black"/>
                    <rect x="5" y="0.5" width="0.2" height="5" fill="black"/>
                    <rect x="5.4" y="0.5" width="0.3" height="5" fill="black"/>
                    <text x="7.5" y="7" fontSize="1.2" textAnchor="middle" fontWeight="bold">*{formData.jobNumber}{isLeadFree && 'L'}{isITAR && 'M'}*</text>
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
        <div className="bg-white shadow-lg rounded-lg border-2 border-indigo-100 p-8 mb-6">
          {/* Top Row - Compact */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Page</label>
              <input
                type="text"
                value={formData.pageNumber}
                onChange={(e) => setFormData({...formData, pageNumber: e.target.value})}
                className="w-full border-2 border-gray-300 rounded px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Job No * {isLeadFree && <span className="text-green-600">(L)</span>}{isITAR && <span className="text-red-600">(M)</span>}
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={formData.jobNumber}
                  onChange={async (e) => {
                    const value = e.target.value;
                    setFormData({...formData, jobNumber: value});
                    // Auto-populate on blur or after typing
                    if (value.length >= 3) {
                      try {
                        const response = await fetch(`http://acidashboard.aci.local:100/api/travelers/work-order/${value}`, {
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
                          }
                        });
                        if (response.ok) {
                          const data = await response.json();
                          setFormData(prev => ({
                            ...prev,
                            workOrderNumber: data.work_order_number || value,
                            partNumber: data.part_number || prev.partNumber,
                            partDescription: data.part_description || prev.partDescription,
                            revision: data.revision || prev.revision,
                            quantity: data.quantity || prev.quantity,
                            customerCode: data.customer_code || prev.customerCode,
                            customerName: data.customer_name || prev.customerName
                          }));
                        }
                      } catch (error) {
                        console.error('Error fetching work order:', error);
                      }
                    }
                  }}
                  className="flex-1 border-2 border-blue-300 rounded px-2 py-1.5 text-sm font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  placeholder="8414"
                />
                {isLeadFree && <span className="px-2 py-1.5 bg-green-100 text-green-800 font-bold rounded text-xs border border-green-300">L</span>}
                {isITAR && <span className="px-2 py-1.5 bg-purple-100 text-purple-800 font-bold rounded text-xs border border-purple-300">M</span>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Work Order *</label>
              <input
                type="text"
                value={formData.workOrderNumber}
                onChange={(e) => setFormData({...formData, workOrderNumber: e.target.value})}
                className="w-full border-2 border-blue-300 rounded px-2 py-1.5 text-sm font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                placeholder="WO-123"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full border-2 border-gray-300 rounded px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                className="w-full border-2 border-gray-300 rounded px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Ship Date</label>
              <input
                type="date"
                value={formData.shipDate}
                onChange={(e) => setFormData({...formData, shipDate: e.target.value})}
                className="w-full border-2 border-gray-300 rounded px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Customer and Part Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Customer Code</label>
                <input
                  type="text"
                  value={formData.customerCode}
                  onChange={(e) => setFormData({...formData, customerCode: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="750"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="ACME Corporation"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Part No *</label>
                <input
                  type="text"
                  value={formData.partNumber}
                  onChange={(e) => setFormData({...formData, partNumber: e.target.value})}
                  className="w-full border-2 border-blue-300 rounded-lg px-4 py-3 text-base font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="METSHIFT"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">PO Number</label>
                <input
                  type="text"
                  value={formData.poNumber}
                  onChange={(e) => setFormData({...formData, poNumber: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="PO-12345"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Operation</label>
                <input
                  type="text"
                  value={formData.operation}
                  onChange={(e) => setFormData({...formData, operation: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="84"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Part Description *</label>
                <input
                  type="text"
                  value={formData.partDescription}
                  onChange={(e) => setFormData({...formData, partDescription: e.target.value})}
                  className="w-full border-2 border-blue-300 rounded-lg px-4 py-3 text-base font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="METSHIFT Assembly"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
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
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="REV A"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Drawing Number</label>
                <input
                  type="text"
                  value={formData.drawingNumber}
                  onChange={(e) => setFormData({...formData, drawingNumber: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="DWG-88424"
                />
              </div>
            </div>
          </div>

          {/* Compliance and Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 shadow-sm">
            <div className="flex items-center space-x-4 p-3 bg-white rounded border border-gray-200">
              <input
                type="checkbox"
                id="leadFree"
                checked={isLeadFree}
                onChange={(e) => setIsLeadFree(e.target.checked)}
                className="w-5 h-5 text-green-600 border border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="leadFree" className="flex-1 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 font-bold rounded text-sm">L</span>
                  <div>
                    <p className="font-semibold text-gray-900">Lead Free (RoHS)</p>
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center space-x-4 p-3 bg-white rounded border border-gray-200">
              <input
                type="checkbox"
                id="itar"
                checked={isITAR}
                onChange={(e) => setIsITAR(e.target.checked)}
                className="w-5 h-5 text-red-600 border border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="itar" className="flex-1 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 font-bold rounded text-sm">M</span>
                  <div>
                    <p className="font-semibold text-gray-900">ITAR Controlled</p>
                  </div>
                </div>
              </label>
            </div>

            {/* Only show labor hours option for non-PCB and non-PARTS travelers */}
            {selectedType !== 'PCB' && selectedType !== 'PARTS' && (
              <div className={`flex items-center space-x-4 p-3 rounded border-2 transition-all ${includeLaborHours ? 'bg-green-50 border-green-500' : 'bg-white border-gray-200'}`}>
                <input
                  type="checkbox"
                  id="includeLaborHours"
                  checked={includeLaborHours}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    setIncludeLaborHours(newValue);
                    if (newValue) {
                      alert('✅ Labor Hours Table will be included in this traveler!\n\nThe labor tracking section will appear at the end of the traveler document.');
                    }
                  }}
                  className="w-5 h-5 text-blue-600 border border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="includeLaborHours" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-semibold text-gray-900">Include Labor Hours Table</p>
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
                    alert('✅ Traveler will be marked as ACTIVE\n\nThis traveler will appear in active travelers list.');
                  } else {
                    alert('⚠️ Traveler will be marked as INACTIVE\n\nThis traveler will be archived and hidden from main lists.');
                  }
                }}
                className="w-5 h-5 text-blue-600 border border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="isActive" className="flex-1 cursor-pointer">
                <div>
                  <p className="font-semibold text-gray-900">Active Traveler</p>
                  <p className="text-xs text-gray-500">Mark as active in production</p>
                </div>
              </label>
            </div>
          </div>

          {/* Specifications - Prominent Section with Date */}
          <div className="mb-6 p-5 bg-yellow-50 rounded-lg border-2 border-yellow-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-base font-bold text-gray-900">Specifications</label>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-semibold text-gray-700">Date:</label>
                <input
                  type="date"
                  value={formData.specsDate}
                  onChange={(e) => setFormData({...formData, specsDate: e.target.value})}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:border-blue-500"
                />
              </div>
            </div>
            <textarea
              value={formData.specs}
              onChange={(e) => setFormData({...formData, specs: e.target.value})}
              className="w-full border border-gray-300 rounded px-4 py-3 text-base text-gray-900 focus:border-blue-500 min-h-[120px] resize-y"
              placeholder="Enter specifications, notes, and special requirements..."
              style={{color: '#000000', backgroundColor: '#ffffff'}}
            />
          </div>

          {/* Stock and Shipping Info */}
          <div className="mb-6 p-5 bg-blue-50 rounded-lg border-2 border-blue-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-3">Stock &amp; Shipping Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">From Stock</label>
                <input
                  type="text"
                  value={formData.fromStock}
                  onChange={(e) => setFormData({...formData, fromStock: e.target.value})}
                  className="w-full border border-gray-300 rounded px-4 py-2 text-base focus:border-blue-500"
                  placeholder="Location..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">To Stock</label>
                <input
                  type="text"
                  value={formData.toStock}
                  onChange={(e) => setFormData({...formData, toStock: e.target.value})}
                  className="w-full border border-gray-300 rounded px-4 py-2 text-base focus:border-blue-500"
                  placeholder="Location..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ship Via</label>
                <input
                  type="text"
                  value={formData.shipVia}
                  onChange={(e) => setFormData({...formData, shipVia: e.target.value})}
                  className="w-full border border-gray-300 rounded px-4 py-2 text-base focus:border-blue-500"
                  placeholder="Shipping method..."
                />
              </div>
            </div>
          </div>

          {/* Process Steps - Card-Based Layout */}
          <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Process Steps (Routing)</h3>
              <button
                onClick={addNewStep}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-colors shadow-md"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Step</span>
              </button>
            </div>

            <div className="space-y-4">
              {formSteps.map((step, index) => (
                <div
                  key={step.id}
                  ref={(el) => {
                    stepRowRefs.current[step.id] = el;
                  }}
                  className="bg-white border-2 border-indigo-200 rounded-lg p-4 shadow-sm transition-colors duration-300"
                >
                  {/* Step Header */}
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                    <div className="flex items-center space-x-4">
                      <span className="bg-blue-600 text-white font-bold px-3 py-1 rounded">
                        Step {index + 1}
                      </span>
                      <div className="flex items-center space-x-2 bg-yellow-100 border-2 border-yellow-400 rounded-lg px-3 py-1">
                        <label className="text-sm font-bold text-yellow-800">SEQ #</label>
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
                          className="w-20 border-2 border-yellow-500 rounded px-3 py-1 text-lg font-bold text-center bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeStep(step.id)}
                      className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg transition-colors"
                      title="Remove step"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Step Fields - ALIGNED COLUMNS */}
                  <div className="space-y-4">
                    {/* Row 1: Work Center and Metrics in aligned columns */}
                    <div className="grid grid-cols-12 gap-3 items-start">
                      <div className="col-span-3 relative group">
                        <label className="block text-xs font-bold text-gray-700 mb-2">Work Center</label>
                        <select
                          value={step.workCenter}
                          onChange={(e) => updateStep(step.id, 'workCenter', e.target.value)}
                          className="w-full border-2 border-blue-500 rounded-lg px-3 py-2 text-sm font-bold focus:border-blue-600 focus:ring-2 focus:ring-blue-200 bg-white cursor-pointer"
                        >
                          <option value="">-- Select Work Center --</option>
                          {getWorkCentersByType(selectedType).map(wc => (
                            <option key={wc.name} value={wc.name} title={wc.description}>
                              {wc.name}
                            </option>
                          ))}
                        </select>
                        {step.workCenter && (
                          <div className="hidden group-hover:block absolute left-0 top-full mt-1 z-50 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl max-w-xs">
                            <div className="font-bold text-yellow-300 mb-1">{step.workCenter}</div>
                            <div>{getWorkCentersByType(selectedType).find(wc => wc.name === step.workCenter)?.description || ''}</div>
                          </div>
                        )}
                      </div>

                      {/* Quantity, Rejected, Accepted, Sign - ALIGNED */}
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-2 text-center">Quantity</label>
                        <input
                          type="number"
                          value={step.quantity}
                          onChange={(e) => updateStep(step.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full border-2 border-gray-300 rounded px-2 py-2 text-sm text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-red-700 mb-2 text-center">Rejected</label>
                        <input
                          type="number"
                          value={step.rejected}
                          onChange={(e) => updateStep(step.id, 'rejected', parseInt(e.target.value) || 0)}
                          className="w-full border-2 border-red-300 rounded px-2 py-2 text-sm text-center focus:border-red-500 focus:ring-1 focus:ring-red-200"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-green-700 mb-2 text-center">Accepted</label>
                        <input
                          type="number"
                          value={step.accepted}
                          onChange={(e) => updateStep(step.id, 'accepted', parseInt(e.target.value) || 0)}
                          className="w-full border-2 border-green-300 rounded px-2 py-2 text-sm text-center focus:border-green-500 focus:ring-1 focus:ring-green-200"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-purple-700 mb-2 text-center">Sign</label>
                        <input
                          type="text"
                          value={step.assign}
                          onChange={(e) => updateStep(step.id, 'assign', e.target.value)}
                          className="w-full border-2 border-purple-300 rounded px-2 py-2 text-sm text-center focus:border-purple-500 focus:ring-1 focus:ring-purple-200"
                          placeholder="Init"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-700 mb-2 text-center">Date</label>
                        <input
                          type="date"
                          value={step.date}
                          onChange={(e) => updateStep(step.id, 'date', e.target.value)}
                          className="w-full border-2 border-gray-300 rounded px-2 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                        />
                      </div>
                    </div>

                    {/* Row 2: Instructions - Full Width */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Instructions</label>
                      <textarea
                        value={step.instruction}
                        onChange={(e) => updateStep(step.id, 'instruction', e.target.value)}
                        className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 min-h-[80px] resize-y"
                        placeholder="Enter detailed instructions for this step..."
                        style={{color: '#000000', backgroundColor: '#ffffff'}}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {formSteps.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded border border-dashed border-gray-300">
                  <p className="text-gray-600">No process steps yet. Click &quot;Add Step&quot; to create one.</p>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section - Prominent */}
          <div className="mb-6 p-5 bg-green-50 rounded-lg border-2 border-green-200 shadow-sm">
            <label className="block text-base font-bold text-gray-900 mb-3">Comments &amp; Notes</label>
            <textarea
              value={formData.comments}
              onChange={(e) => setFormData({...formData, comments: e.target.value})}
              className="w-full border border-gray-300 rounded px-4 py-3 text-base text-gray-900 focus:border-blue-500 min-h-[150px] resize-y"
              placeholder="Enter any additional comments, notes, quality issues, or special instructions..."
              style={{color: '#000000', backgroundColor: '#ffffff', fontSize: '1rem', lineHeight: '1.6'}}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <PrinterIcon className="h-5 w-5" />
            <span>Print Traveler</span>
          </button>

          <button
            onClick={generateBarcode}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <QrCodeIcon className="h-5 w-5" />
            <span>Generate Barcode</span>
          </button>

          <button
            onClick={handleSubmit}
            className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg"
          >
            <span>{mode === 'create' ? 'Create Traveler' : 'Update Traveler'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
