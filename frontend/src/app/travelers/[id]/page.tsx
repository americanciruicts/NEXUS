'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import { ArrowLeftIcon, PrinterIcon, CheckIcon, XMarkIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { WORK_CENTERS } from '@/data/workCenters';
import { useAuth } from '@/context/AuthContext';

// Helper function to format YYYY-MM-DD to MM/DD/YYYY without timezone conversion
const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  // Check if already in MM/DD/YYYY format
  if (dateStr.includes('/')) return dateStr;

  // Parse YYYY-MM-DD format
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${month}/${day}/${year}`;
  }
  return dateStr;
};

interface ProcessStep {
  id?: number;
  seq: number;
  workCenter: string;
  instruction: string;
  quantity: number | string;
  accepted: number | string;
  rejected: number | string;
  sign: string;
  completedDate: string;
  completedTime?: string;
  status: string;
  assignee: string;
}

interface Specification {
  id: string;
  text: string;
  date: string;
}

interface LaborEntry {
  id: string;
  workCenter: string;
  operatorName: string;
  startTime: string;
  endTime: string;
  totalHours: string;
}

interface Traveler {
  id: string;
  travelerId: number;
  jobNumber: string;
  workOrder: string;
  poNumber?: string;
  partNumber: string;
  description: string;
  revision: string;
  customerRevision?: string;
  partRevision?: string;
  quantity: number;
  customerCode: string;
  customerName: string;
  status: string;
  createdAt: string;
  dueDate: string;
  shipDate: string;
  specs: Specification[];
  fromStock: string;
  toStock: string;
  shipVia: string;
  comments: string;
  steps: ProcessStep[];
  laborEntries: LaborEntry[];
  isActive: boolean;
  includeLaborHours: boolean;
}

export default function TravelerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const travelerId = params.id as string;

  const [traveler, setTraveler] = useState<Traveler | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTraveler, setEditedTraveler] = useState<Traveler | null>(null);
  const [stepQRCodes, setStepQRCodes] = useState<Record<number, string>>({});
  const [headerBarcode, setHeaderBarcode] = useState<string>('');

  // Refs for step rows to enable auto-scroll after reordering
  const stepRowRefs = useRef<{ [key: number]: HTMLTableRowElement | null }>({});

  // Keep page at top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load traveler from API
  useEffect(() => {
    const fetchTraveler = async () => {
      try {
        const response = await fetch(`http://acidashboard.aci.local:100/api/travelers/by-job/${travelerId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Parse specs - if it's a string, convert to array
          let specsArray: Specification[] = [];
          if (data.specs) {
            if (typeof data.specs === 'string') {
              try {
                const parsed = JSON.parse(data.specs);
                if (Array.isArray(parsed)) {
                  specsArray = parsed;
                } else {
                  specsArray = [{ id: '1', text: data.specs, date: String(data.specs_date || '') }];
                }
              } catch {
                specsArray = [{ id: '1', text: data.specs, date: String(data.specs_date || '') }];
              }
            } else if (Array.isArray(data.specs)) {
              specsArray = data.specs;
            }
          }

          const formattedTraveler = {
            id: String(data.job_number),
            travelerId: Number(data.id),
            jobNumber: String(data.job_number),
            workOrder: String(data.work_order_number || ''),
            poNumber: String(data.po_number || ''),
            partNumber: String(data.part_number),
            description: String(data.part_description),
            revision: String(data.revision),
            customerRevision: String(data.customer_revision || ''),
            partRevision: String(data.part_revision || ''),
            quantity: Number(data.quantity),
            customerCode: String(data.customer_code || ''),
            customerName: String(data.customer_name || ''),
            status: String(data.status),
            createdAt: String(data.created_at || ''),
            dueDate: String(data.due_date || ''),
            shipDate: String(data.ship_date || ''),
            specs: specsArray,
            fromStock: String(data.from_stock || ''),
            toStock: String(data.to_stock || ''),
            shipVia: String(data.ship_via || ''),
            comments: String(data.comments || ''),
            isActive: Boolean(data.is_active),
            includeLaborHours: Boolean(data.include_labor_hours),
            steps: (data.process_steps || []).map((step: Record<string, unknown>) => ({
              id: Number(step.id),
              seq: Number(step.step_number),
              workCenter: String(step.operation),
              instruction: String(step.instructions || ''),
              quantity: step.quantity || '',
              accepted: step.accepted || '',
              rejected: step.rejected || '',
              sign: String(step.sign || ''),
              completedDate: String(step.completed_date || ''),
              status: step.is_completed ? 'COMPLETED' : 'PENDING',
              assignee: ''
            })),
            laborEntries: Array.from({ length: 10 }, (_, i) => ({
              id: String(i + 1),
              workCenter: '',
              operatorName: '',
              startTime: '',
              endTime: '',
              totalHours: ''
            }))
          };
          setTraveler(formattedTraveler);
          setEditedTraveler(formattedTraveler);

          // Fetch QR codes for all steps
          fetchStepQRCodes(Number(data.id));

          // Fetch header barcode
          fetchHeaderBarcode(Number(data.id));
        } else {
          console.error('Failed to fetch traveler');
        }
      } catch (error) {
        console.error('Error fetching traveler:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchHeaderBarcode = async (travelerDbId: number) => {
      try {
        const token = localStorage.getItem('nexus_token');
        console.log('Fetching header barcode for traveler', travelerDbId);

        const response = await fetch(`http://acidashboard.aci.local:100/api/barcodes/traveler/${travelerDbId}`, {
          headers: {
            'Authorization': `Bearer ${token || 'mock-token'}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.barcode_image) {
            setHeaderBarcode(data.barcode_image);
            console.log('✅ Successfully loaded header barcode');
          }
        } else {
          console.error('❌ Failed to fetch header barcode, status:', response.status);
        }
      } catch (error) {
        console.error('❌ Error fetching header barcode:', error);
      }
    };

    const fetchStepQRCodes = async (travelerDbId: number) => {
      try {
        const token = localStorage.getItem('nexus_token');
        console.log('Fetching QR codes for traveler', travelerDbId, 'with token:', token ? 'exists' : 'missing');

        const response = await fetch(`http://acidashboard.aci.local:100/api/barcodes/traveler/${travelerDbId}/steps-qr`, {
          headers: {
            'Authorization': `Bearer ${token || 'mock-token'}`
          }
        });

        console.log('QR code API response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          const qrCodeMap: Record<number, string> = {};

          // Map process steps QR codes
          if (data.process_steps) {
            console.log('Found', data.process_steps.length, 'process steps');
            data.process_steps.forEach((step: {step_id: number; qr_code_image: string}) => {
              if (step.qr_code_image) {
                qrCodeMap[step.step_id] = step.qr_code_image;
                console.log('Added QR code for step', step.step_id, '- length:', step.qr_code_image.length);
              }
            });
          }

          // Map manual steps QR codes
          if (data.manual_steps) {
            data.manual_steps.forEach((step: {step_id: number; qr_code_image: string}) => {
              if (step.qr_code_image) {
                qrCodeMap[step.step_id] = step.qr_code_image;
              }
            });
          }

          console.log('✅ Successfully loaded QR codes for', Object.keys(qrCodeMap).length, 'steps');
          console.log('Step IDs with QR codes:', Object.keys(qrCodeMap));
          setStepQRCodes(qrCodeMap);
        } else {
          console.error('❌ Failed to fetch QR codes, status:', response.status);
          if (response.status === 401) {
            console.error('⚠️ AUTHENTICATION REQUIRED - Please log out and log back in to get a valid token');
          }
        }
      } catch (error) {
        console.error('❌ Error fetching QR codes:', error);
      }
    };

    if (travelerId) {
      fetchTraveler();
    }
  }, [travelerId]);

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedTraveler(traveler ? { ...traveler } : null);
    // Prevent page from scrolling when entering edit mode
    window.scrollTo(0, 0);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedTraveler(traveler);
    // Keep page at top when cancelling edit
    window.scrollTo(0, 0);
  };

  const handleSave = async () => {
    if (!editedTraveler) return;

    try {
      const payload = {
        job_number: editedTraveler.jobNumber,
        work_order_number: editedTraveler.workOrder,
        po_number: editedTraveler.poNumber || '',
        part_number: editedTraveler.partNumber,
        part_description: editedTraveler.description,
        revision: editedTraveler.revision,
        customer_revision: editedTraveler.customerRevision || '',
        part_revision: editedTraveler.partRevision || '',
        quantity: Number(editedTraveler.quantity) || 0,
        customer_code: editedTraveler.customerCode || '',
        customer_name: editedTraveler.customerName || '',
        due_date: editedTraveler.dueDate || '',
        ship_date: editedTraveler.shipDate || '',
        specs: typeof editedTraveler.specs === 'string' ? editedTraveler.specs : JSON.stringify(editedTraveler.specs),
        specs_date: editedTraveler.specs.length > 0 ? editedTraveler.specs[editedTraveler.specs.length - 1].date : '',
        from_stock: editedTraveler.fromStock || '',
        to_stock: editedTraveler.toStock || '',
        ship_via: editedTraveler.shipVia || '',
        comments: editedTraveler.comments || '',
        is_active: editedTraveler.isActive !== undefined ? editedTraveler.isActive : true,
        include_labor_hours: editedTraveler.includeLaborHours !== undefined ? editedTraveler.includeLaborHours : false,
        traveler_type: 'ASSY',
        priority: 'NORMAL',
        work_center: editedTraveler.steps.length > 0 ? (editedTraveler.steps[0].workCenter || 'ASSEMBLY') : 'ASSEMBLY',
        notes: '',
        process_steps: editedTraveler.steps.map(step => ({
          step_number: Number(step.seq) || 0,
          operation: step.workCenter || '',
          work_center_code: (step.workCenter || '').replace(/\s+/g, '_').toUpperCase() || 'UNKNOWN',
          instructions: step.instruction || '',
          estimated_time: 30,
          is_required: true,
          quantity: step.quantity ? Number(step.quantity) : null,
          accepted: step.accepted ? Number(step.accepted) : null,
          rejected: step.rejected ? Number(step.rejected) : null,
          sign: step.sign || null,
          completed_date: step.completedDate || null,
          sub_steps: []
        })),
        manual_steps: []
      };

      console.log('Sending update payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(`http://acidashboard.aci.local:100/api/travelers/${editedTraveler.travelerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
        },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response body:', responseText);

      if (response.ok) {
        setTraveler(editedTraveler);
        setIsEditing(false);
        alert('✅ Traveler updated successfully!');
        // Reload to fetch fresh data from server
        window.location.reload();
      } else {
        let errorMessage = 'Failed to update traveler';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error updating traveler:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Error updating traveler\n\n${errorMessage}\n\nCheck the console for more details.`);
    }
  };

  const updateField = (field: keyof Traveler, value: string | number) => {
    if (!editedTraveler) return;
    setEditedTraveler({ ...editedTraveler, [field]: value });
  };

  const updateStep = (index: number, field: keyof ProcessStep, value: string | number) => {
    if (!editedTraveler) return;
    const newSteps = [...editedTraveler.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };

    // If sequence number changed, reorder steps and renumber them
    if (field === 'seq') {
      // Store the target sequence number before reordering
      const targetSequence = Number(value);

      // Sort steps by sequence number
      const sortedSteps = newSteps.sort((a, b) => Number(a.seq) - Number(b.seq));

      // Renumber steps consecutively (1, 2, 3, etc.)
      const renumberedSteps = sortedSteps.map((step, idx) => ({
        ...step,
        seq: idx + 1
      }));

      setEditedTraveler({ ...editedTraveler, steps: renumberedSteps });

      // Scroll to the target step after React re-renders
      setTimeout(() => {
        const targetStep = renumberedSteps.find(step => step.seq === targetSequence);
        if (targetStep) {
          // Find the index of the target step (seq - 1 since array is 0-indexed)
          const targetIndex = targetSequence - 1;
          const stepElement = stepRowRefs.current[targetIndex];
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
      setEditedTraveler({ ...editedTraveler, steps: newSteps });
    }
  };

  const addStep = () => {
    if (!editedTraveler) return;
    const newStep: ProcessStep = {
      seq: editedTraveler.steps.length + 1,
      workCenter: '',
      instruction: '',
      quantity: '',
      accepted: '',
      rejected: '',
      sign: '',
      completedDate: '',
      status: 'PENDING',
      assignee: ''
    };
    setEditedTraveler({ ...editedTraveler, steps: [...editedTraveler.steps, newStep] });
  };

  const removeStep = (index: number) => {
    if (!editedTraveler) return;
    const newSteps = editedTraveler.steps.filter((_, i) => i !== index);

    // Renumber remaining steps consecutively
    const renumberedSteps = newSteps.map((step, idx) => ({
      ...step,
      seq: idx + 1
    }));

    setEditedTraveler({ ...editedTraveler, steps: renumberedSteps });
  };

  const addSpecification = () => {
    if (!editedTraveler) return;
    const newSpec: Specification = {
      id: Date.now().toString(),
      text: '',
      date: new Date().toISOString().split('T')[0]
    };
    setEditedTraveler({ ...editedTraveler, specs: [...editedTraveler.specs, newSpec] });
  };

  const updateSpecification = (id: string, field: 'text' | 'date', value: string) => {
    if (!editedTraveler) return;
    const newSpecs = editedTraveler.specs.map(spec =>
      spec.id === id ? { ...spec, [field]: value } : spec
    );
    setEditedTraveler({ ...editedTraveler, specs: newSpecs });
  };

  const removeSpecification = (id: string) => {
    if (!editedTraveler) return;
    const newSpecs = editedTraveler.specs.filter(spec => spec.id !== id);
    setEditedTraveler({ ...editedTraveler, specs: newSpecs });
  };

  const updateLaborEntry = (id: string, field: keyof LaborEntry, value: string) => {
    if (!editedTraveler) return;
    const newLaborEntries = editedTraveler.laborEntries.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    );
    setEditedTraveler({ ...editedTraveler, laborEntries: newLaborEntries });
  };

  if (isLoading) {
    return (
      <Layout fullWidth>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600">Loading traveler...</div>
        </div>
      </Layout>
    );
  }

  if (!traveler || !editedTraveler) {
    return (
      <Layout fullWidth>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-red-600">Traveler not found</div>
        </div>
      </Layout>
    );
  }

  const displayTraveler = isEditing ? editedTraveler : traveler;

  return (
    <Layout fullWidth>
      <style>{`
        * { font-family: Arial, Helvetica, sans-serif !important; }

        @media print {
          @page { margin: 0.25in; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: Arial, Helvetica, sans-serif !important;
            color: black !important;
          }
          body { font-size: 11px !important; margin: 0 !important; padding: 0 !important; }
          .max-w-7xl { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .p-6 { padding: 0 !important; }

          /* Hide elements with no-print class */
          .no-print { display: none !important; }

          /* Force black and white printing for most backgrounds, keep colors for sections */
          .bg-gray-100, .bg-gray-50, .bg-gray-200 {
            background-color: white !important;
            border-color: black !important;
          }

          /* Header section - 11px */
          .print-header { font-size: 11px !important; padding: 4px !important; }
          .print-header * { font-size: 11px !important; line-height: 1.2 !important; }
          .print-header span { font-size: 11px !important; }
          .print-header div { font-size: 11px !important; }
          .print-header .font-bold { font-size: 11px !important; font-weight: bold !important; }

          /* Section titles - 11px and bold */
          .print-section-title { font-size: 11px !important; line-height: 1.1 !important; font-weight: 900 !important; padding: 3px 6px !important; }

          /* Specifications section - REDUCE PADDING */
          .print-specs-title { font-size: 10px !important; line-height: 1.1 !important; font-weight: 700 !important; padding: 3px 6px !important; }
          .print-specs-content { font-size: 9px !important; line-height: 1.1 !important; padding: 2px 4px !important; }
          .print-specs-content * { font-size: 9px !important; line-height: 1.1 !important; }
          .print-specs-content div { font-size: 9px !important; padding: 0 !important; margin: 0 !important; }

          /* Content areas - 11px */
          .print-content { font-size: 11px !important; line-height: 1.3 !important; padding: 4px 6px !important; }
          .print-content * { font-size: 11px !important; line-height: 1.3 !important; }
          .print-content div { font-size: 11px !important; }
          .print-content span { font-size: 11px !important; }
          .print-content p { font-size: 11px !important; margin: 0 !important; }

          /* Job number above barcode - LARGER AND BOLDER */
          .print-job-number { font-size: 22px !important; font-weight: 900 !important; line-height: 1.2 !important; }
          .text-xl.font-black { font-size: 22px !important; font-weight: 900 !important; }
          .text-xl.font-bold { font-size: 22px !important; font-weight: 900 !important; }

          /* Reduce barcode box border and padding for print */
          .border-2.border-black.rounded { border-width: 1px !important; padding: 2px !important; }

          /* Table headers - 11px and bold */
          .print-table-header { font-size: 11px !important; line-height: 1.2 !important; font-weight: 900 !important; padding: 2px 4px !important; }

          /* Table cells - 11px */
          .print-table-cell { font-size: 11px !important; line-height: 1.2 !important; padding: 2px 4px !important; }

          /* Nuclear option - override ALL Tailwind text utilities */
          [class*="text-xs"], [class*="text-sm"], [class*="text-base"], [class*="text-lg"] { font-size: inherit !important; }
          .text-xs, .text-sm, .text-base, .text-lg, .text-xl, .text-2xl { font-size: inherit !important; }
        }
      `}</style>
      <div className={`${isEditing ? 'w-full' : 'max-w-7xl mx-auto'} p-4 lg:p-6 space-y-6`}>
        {/* Action Bar - Screen Only */}
        <div className="flex justify-between items-center no-print bg-white shadow rounded-lg p-4">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <>
                {user?.role !== 'OPERATOR' && (
                  <>
                    <button
                      onClick={handlePrint}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <PrinterIcon className="h-5 w-5" />
                      <span>Print</span>
                    </button>
                    <button
                      onClick={handleEdit}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <PencilIcon className="h-5 w-5" />
                      <span>Edit</span>
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <CheckIcon className="h-5 w-5" />
                  <span>Save</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Traveler Form */}
        <div className="bg-white shadow-lg border-2 border-black" style={{fontFamily: 'Arial, Helvetica, sans-serif'}}>
          {/* Header Section */}
          <div className="bg-gray-100 border-b-2 border-black p-4 print:p-1">
            <div className="grid grid-cols-3 gap-8 print-header print:gap-2">
              {/* Left */}
              <div className="space-y-3 print:space-y-0.5">
                <div className="flex items-baseline gap-4" style={{whiteSpace: 'nowrap'}}>
                  <span className="font-bold inline-block" style={{width: '90px'}}>Cust. Code:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.customerCode}
                      onChange={(e) => updateField('customerCode', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span style={{color: 'black'}}>{displayTraveler.customerCode || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-4" style={{whiteSpace: 'nowrap'}}>
                  <span className="font-bold inline-block" style={{width: '90px'}}>Cust. Name:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.customerName}
                      onChange={(e) => updateField('customerName', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span style={{color: 'black'}}>{displayTraveler.customerName || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-4" style={{whiteSpace: 'nowrap'}}>
                  <span className="font-bold inline-block" style={{width: '90px'}}>Work Order:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.workOrder}
                      onChange={(e) => updateField('workOrder', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span style={{color: 'black'}}>{displayTraveler.workOrder || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-4" style={{whiteSpace: 'nowrap'}}>
                  <span className="font-bold inline-block" style={{width: '90px'}}>PO Number:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.poNumber || ''}
                      onChange={(e) => updateField('poNumber', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span style={{color: 'black'}}>{displayTraveler.poNumber || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-4" style={{whiteSpace: 'nowrap'}}>
                  <span className="font-bold inline-block" style={{width: '90px'}}>Quantity:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedTraveler.quantity}
                      onChange={(e) => updateField('quantity', parseInt(e.target.value) || 0)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span style={{color: 'black'}}>{displayTraveler.quantity}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-4" style={{whiteSpace: 'nowrap'}}>
                  <span className="font-bold inline-block" style={{width: '90px'}}>Traveler Rev:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.revision}
                      onChange={(e) => updateField('revision', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span style={{color: 'black'}}>
                      {displayTraveler.revision ? displayTraveler.revision : '- -'}
                    </span>
                  )}
                </div>
              </div>

              {/* Center - Barcode with Details */}
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-black mb-1 print-job-number" style={{color: 'black', fontSize: '18px', fontWeight: '900'}}>
                    {isEditing ? (
                      <div className="flex items-center gap-1 justify-center">
                        <span>Job:</span>
                        <input
                          type="text"
                          value={editedTraveler.jobNumber}
                          onChange={(e) => updateField('jobNumber', e.target.value)}
                          className="w-24 border border-gray-300 rounded px-1 py-0.5 text-lg font-black"
                        />
                      </div>
                    ) : (
                      <span className="text-xl font-bold">Job: {displayTraveler.jobNumber}</span>
                    )}
                  </div>
                  <div className="border-2 border-black p-2 bg-white inline-block rounded">
                    {headerBarcode ? (
                      <img
                        src={`data:image/png;base64,${headerBarcode}`}
                        alt={`Barcode for ${displayTraveler.jobNumber}`}
                        className="mx-auto"
                        style={{ height: '60px', width: '180px', objectFit: 'contain' }}
                        onError={(e) => {
                          console.error('Failed to load header barcode');
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center" style={{ height: '60px', width: '180px' }}>
                        <span className="text-xs text-gray-400">Loading barcode...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="space-y-3 print:space-y-0.5">
                <div className="flex items-baseline gap-4" style={{whiteSpace: 'nowrap'}}>
                  <span className="font-bold inline-block" style={{width: '100px'}}>Part No:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.partNumber}
                      onChange={(e) => updateField('partNumber', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span style={{color: 'black'}}>{displayTraveler.partNumber || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-4" style={{whiteSpace: 'nowrap'}}>
                  <span className="font-bold inline-block" style={{width: '100px'}}>Description:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span style={{color: 'black'}}>{displayTraveler.description || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-4" style={{whiteSpace: 'nowrap'}}>
                  <span className="font-bold inline-block" style={{width: '100px'}}>Cust. Revision:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.customerRevision || ''}
                      onChange={(e) => updateField('customerRevision', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5"
                      style={{color: 'black'}}
                      placeholder="Cust. Revision"
                    />
                  ) : (
                    <span style={{color: 'black'}}>
                      {displayTraveler.customerRevision ? displayTraveler.customerRevision : '- -'}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-4" style={{whiteSpace: 'nowrap'}}>
                  <span className="font-bold inline-block" style={{width: '100px'}}>Start Date:</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedTraveler.createdAt}
                      onChange={(e) => updateField('createdAt', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span style={{color: 'black'}}>{formatDateDisplay(displayTraveler.createdAt) || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-3" style={{whiteSpace: 'nowrap'}}>
                  <span className="font-bold inline-block" style={{width: '85px'}}>Due Date:</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedTraveler.dueDate}
                      onChange={(e) => updateField('dueDate', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span style={{color: 'black'}}>{formatDateDisplay(displayTraveler.dueDate) || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-3" style={{whiteSpace: 'nowrap'}}>
                  <span className="font-bold inline-block" style={{width: '85px'}}>Ship Date:</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedTraveler.shipDate}
                      onChange={(e) => updateField('shipDate', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span style={{color: 'black'}}>{formatDateDisplay(displayTraveler.shipDate) || '-'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Specifications Section */}
          <div className="border-b-2 border-black">
            <div className="bg-yellow-200 border-b border-black px-2 py-1 print:px-1 print:py-0.5 flex justify-between items-center print-specs-title print:mb-1 print:bg-white">
              <h2 className="font-bold text-xs">SPECIFICATIONS</h2>
              {isEditing && (
                <button
                  onClick={addSpecification}
                  className="flex items-center space-x-1 px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs no-print"
                >
                  <PlusIcon className="h-3 w-3" />
                  <span>Add Specification</span>
                </button>
              )}
            </div>
            <div className="bg-yellow-50 p-1 print:p-1 print-specs-content text-xs print:bg-white">
              {isEditing ? (
                <div className="space-y-2">
                  {editedTraveler.specs.map((spec) => (
                    <div key={spec.id} className="flex items-start space-x-2 border-b border-green-200 pb-2">
                      <textarea
                        value={spec.text}
                        onChange={(e) => updateSpecification(spec.id, 'text', e.target.value)}
                        className="flex-1 p-1 border border-gray-300 rounded min-h-[40px] text-xs"
                        placeholder="Enter specification..."
                      />
                      <input
                        type="date"
                        value={spec.date}
                        onChange={(e) => updateSpecification(spec.id, 'date', e.target.value)}
                        className="w-32 border border-gray-300 rounded px-1 py-0.5 text-xs"
                      />
                      <button
                        onClick={() => removeSpecification(spec.id)}
                        className="p-0.5 bg-red-600 hover:bg-red-700 text-white rounded no-print"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {editedTraveler.specs.length === 0 && (
                    <p className="text-xs text-gray-500">No specifications yet. Click &quot;Add Specification&quot; to create one.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {displayTraveler.specs.map((spec) => (
                    <div key={spec.id} className="flex justify-between pb-0.5">
                      <div className="whitespace-pre-wrap flex-1 text-xs" style={{color: 'black'}}>{spec.text || '-'}</div>
                      <div className="font-bold ml-2 text-xs" style={{color: 'black'}}>{spec.date}</div>
                    </div>
                  ))}
                  {displayTraveler.specs.length === 0 && (
                    <div className="text-gray-500 text-xs">No specifications</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Routing Section */}
          <div className="border-b-2 border-black">
            <div className="bg-blue-200 border-b border-black px-3 py-2 print:px-2 print:py-1 flex justify-between items-center">
              <h2 className="font-bold text-sm print-section-title">ROUTING</h2>
              {isEditing && (
                <button
                  onClick={addStep}
                  className="flex items-center space-x-1 px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs no-print"
                >
                  <PlusIcon className="h-3 w-3" />
                  <span>Add Step</span>
                </button>
              )}
            </div>

            {/* Table */}
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-200 border-b border-black">
                  <th className="border-r border-black px-3 py-3 w-20 text-center font-bold print-table-header print:px-1 print:py-1 text-base print:text-xs">SEQ</th>
                  <th className="border-r border-black px-3 py-3 w-32 text-left font-bold print-table-header print:px-1 print:py-1 text-base print:text-xs">WORK CENTER</th>
                  <th className="border-r border-black px-3 py-3 text-left font-bold print-table-header print:px-1 print:py-1 text-base print:text-xs">INSTRUCTIONS</th>
                  <th className="border-r border-black px-3 py-3 w-20 text-center font-bold print-table-header print:px-1 print:py-1 text-base print:text-xs">TIME</th>
                  <th className="border-r border-black px-3 py-3 w-24 text-center font-bold print-table-header print:px-1 print:py-1 text-base print:text-xs">QTY</th>
                  <th className="border-r border-black px-3 py-3 w-24 text-center font-bold print-table-header print:px-1 print:py-1 text-base print:text-xs">REJ</th>
                  <th className="border-r border-black px-3 py-3 w-24 text-center font-bold print-table-header print:px-1 print:py-1 text-base print:text-xs">ACC</th>
                  <th className="border-r border-black px-3 py-3 w-28 text-center font-bold print-table-header print:px-1 print:py-1 text-base print:text-xs">SIGN</th>
                  <th className="px-3 py-3 w-28 text-center font-bold print-table-header print:px-1 print:py-1 text-base print:text-xs">DATE</th>
                </tr>
              </thead>
              <tbody>
                {displayTraveler.steps.map((step, index) => (
                  <tr
                    key={index}
                    ref={(el) => {
                      if (isEditing) {
                        stepRowRefs.current[index] = el;
                      }
                    }}
                    className="border-b border-gray-300 transition-colors duration-300"
                  >
                    {isEditing ? (
                      <>
                        <td className="border-r border-gray-300 px-3 py-3 text-center">
                          <input
                            type="number"
                            value={step.seq}
                            onChange={(e) => updateStep(index, 'seq', parseInt(e.target.value) || 0)}
                            className="w-full border-2 border-gray-300 rounded px-3 py-2 text-center text-lg font-bold"
                          />
                        </td>
                        <td className="border-r border-gray-300 px-1 py-1">
                          <div className="flex flex-row items-center justify-between gap-2">
                            <div className="flex-1">
                              {step.workCenter === '__CUSTOM__' || (step.workCenter && !WORK_CENTERS.includes(step.workCenter as typeof WORK_CENTERS[number])) ? (
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={step.workCenter === '__CUSTOM__' ? '' : step.workCenter}
                                    onChange={(e) => updateStep(index, 'workCenter', e.target.value)}
                                    className="flex-1 border border-blue-400 rounded px-1 py-0.5 text-xs"
                                    placeholder="Type custom work center name"
                                  />
                                  <button
                                    onClick={() => updateStep(index, 'workCenter', WORK_CENTERS[0])}
                                    className="px-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs"
                                    title="Back to dropdown"
                                  >
                                    ↩
                                  </button>
                                </div>
                              ) : (
                                <select
                                  value={step.workCenter}
                                  onChange={(e) => {
                                    if (e.target.value === '__CUSTOM__') {
                                      updateStep(index, 'workCenter', '__CUSTOM__');
                                    } else {
                                      updateStep(index, 'workCenter', e.target.value);
                                    }
                                  }}
                                  className="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
                                >
                                  <option value="">Select...</option>
                                  <option value="__CUSTOM__" className="font-bold bg-yellow-100">➕ CUSTOM (Type Your Own)</option>
                                  {WORK_CENTERS.map(wc => (
                                    <option key={wc} value={wc}>{wc}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {step.id && stepQRCodes[step.id] && (
                              <img
                                src={`data:image/png;base64,${stepQRCodes[step.id]}`}
                                alt={`QR Code for ${step.workCenter}`}
                                className="border border-gray-200 flex-shrink-0"
                                style={{ width: '40px', height: '40px' }}
                                onError={() => {
                                  console.error('Failed to load QR code for step', step.id);
                                }}
                              />
                            )}
                          </div>
                        </td>
                        <td className="border-r border-gray-300 px-1 py-1">
                          <textarea
                            value={step.instruction}
                            onChange={(e) => updateStep(index, 'instruction', e.target.value)}
                            className="w-full border border-gray-300 rounded px-1 py-0.5 min-h-[60px] text-xs"
                            placeholder="Enter instructions..."
                          />
                        </td>
                        <td className="border-r border-gray-300 px-1 py-1">
                          <input
                            type="time"
                            value={step.completedTime || ''}
                            onChange={(e) => updateStep(index, 'completedTime', e.target.value)}
                            className="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
                          />
                        </td>
                        <td className="border-r border-gray-300 px-3 py-3">
                          <input
                            type="text"
                            value={step.quantity}
                            onChange={(e) => updateStep(index, 'quantity', e.target.value)}
                            className="w-full border-2 border-gray-300 rounded px-3 py-2 text-center text-lg font-bold bg-gray-50"
                          />
                        </td>
                        <td className="border-r border-gray-300 px-3 py-3">
                          <input
                            type="text"
                            value={step.rejected}
                            onChange={(e) => updateStep(index, 'rejected', e.target.value)}
                            className="w-full border-2 border-red-400 rounded px-3 py-2 text-center text-lg font-bold text-red-700 bg-red-50"
                          />
                        </td>
                        <td className="border-r border-gray-300 px-3 py-3">
                          <input
                            type="text"
                            value={step.accepted}
                            onChange={(e) => updateStep(index, 'accepted', e.target.value)}
                            className="w-full border-2 border-green-400 rounded px-3 py-2 text-center text-lg font-bold text-green-700 bg-green-50"
                          />
                        </td>
                        <td className="border-r border-gray-300 px-3 py-3">
                          <input
                            type="text"
                            value={step.sign}
                            onChange={(e) => updateStep(index, 'sign', e.target.value)}
                            className="w-full border-2 border-purple-400 rounded px-3 py-2 text-center text-lg font-bold bg-purple-50"
                            placeholder="Sign"
                          />
                        </td>
                        <td className="px-1 py-1 flex items-center space-x-1">
                          <input
                            type="date"
                            value={step.completedDate}
                            onChange={(e) => updateStep(index, 'completedDate', e.target.value)}
                            className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs"
                          />
                          <button
                            onClick={() => removeStep(index)}
                            className="p-0.5 bg-red-600 hover:bg-red-700 text-white rounded no-print"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border-r border-gray-300 px-3 py-3 text-center font-bold text-lg print:text-xs print-table-cell">{step.seq}</td>
                        <td className="border-r border-gray-300 px-3 py-3 font-semibold text-base print:text-xs print-table-cell break-words">
                          <div className="flex flex-row items-center justify-between gap-2">
                            <span>{step.workCenter}</span>
                            {step.id && stepQRCodes[step.id] ? (
                              <img
                                src={`data:image/png;base64,${stepQRCodes[step.id]}`}
                                alt={`QR Code for ${step.workCenter}`}
                                className="border border-gray-200 flex-shrink-0"
                                style={{ width: '40px', height: '40px' }}
                                onError={() => {
                                  console.error('Failed to load QR code for step', step.id);
                                }}
                              />
                            ) : step.id ? (
                              <div className="text-[8px] text-gray-400 flex-shrink-0">QR Loading...</div>
                            ) : null}
                          </div>
                        </td>
                        <td className="border-r border-gray-300 px-3 py-3 text-base print:text-xs print-table-cell break-words">{step.instruction || ''}</td>
                        <td className="border-r border-gray-300 px-3 py-3 text-center text-base print:text-xs print-table-cell">{step.completedTime || ''}</td>
                        <td className="border-r border-gray-300 px-3 py-3 text-center text-lg font-bold print:text-xs print-table-cell">{step.quantity || ''}</td>
                        <td className="border-r border-gray-300 px-3 py-3 text-center text-lg font-bold text-red-700 print:text-xs print-table-cell">{step.rejected || ''}</td>
                        <td className="border-r border-gray-300 px-3 py-3 text-center text-lg font-bold text-green-700 print:text-xs print-table-cell">{step.accepted || ''}</td>
                        <td className="border-r border-gray-300 px-3 py-3 text-center text-lg font-bold print:text-xs print-table-cell">{step.sign || ''}</td>
                        <td className="px-3 py-3 text-center text-base print:text-xs print-table-cell">{step.completedDate || ''}</td>
                      </>
                    )}
                  </tr>
                ))}
                {displayTraveler.steps.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500 bg-yellow-50">
                      <div className="text-sm font-bold">⚠️ No work center steps found!</div>
                      {isEditing && (
                        <div className="text-xs mt-2">Click &quot;Add Step&quot; button above to add work center steps.</div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Bottom Info */}
            <div className="bg-gray-50 px-2 py-2 grid grid-cols-3 gap-2 text-xs border-t border-gray-300">
              <div className="flex items-baseline" style={{whiteSpace: 'nowrap'}}>
                <span className="font-bold" style={{width: '70px', color: 'black'}}>From Stock:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTraveler.fromStock}
                    onChange={(e) => updateField('fromStock', e.target.value)}
                    className="flex-1 border-b border-black bg-transparent px-1"
                    style={{color: 'black', outline: 'none'}}
                  />
                ) : (
                  <span className="border-b border-black flex-1 px-1" style={{color: 'black'}}>{displayTraveler.fromStock || ''}</span>
                )}
              </div>
              <div className="flex items-baseline" style={{whiteSpace: 'nowrap'}}>
                <span className="font-bold" style={{width: '70px', color: 'black'}}>To Stock:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTraveler.toStock}
                    onChange={(e) => updateField('toStock', e.target.value)}
                    className="flex-1 border-b border-black bg-transparent px-1"
                    style={{color: 'black', outline: 'none'}}
                  />
                ) : (
                  <span className="border-b border-black flex-1 px-1" style={{color: 'black'}}>{displayTraveler.toStock || ''}</span>
                )}
              </div>
              <div className="flex items-baseline" style={{whiteSpace: 'nowrap'}}>
                <span className="font-bold" style={{width: '70px', color: 'black'}}>Ship Via:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTraveler.shipVia}
                    onChange={(e) => updateField('shipVia', e.target.value)}
                    className="flex-1 border-b border-black bg-transparent px-1"
                    style={{color: 'black', outline: 'none'}}
                  />
                ) : (
                  <span className="border-b border-black flex-1 px-1" style={{color: 'black'}}>{displayTraveler.shipVia || ''}</span>
                )}
              </div>
            </div>
          </div>

          {/* Labor Hours Toggle - Edit Mode Only - NO PRINT */}
          {isEditing && (
            <div className="border-b-2 border-black no-print">
              <div className="bg-blue-200 px-3 py-2">
                <h2 className="font-bold text-sm">TRAVELER OPTIONS</h2>
              </div>
              <div className="bg-blue-50 p-4">
                <div className="flex items-center space-x-3 p-3 bg-white rounded border-2 border-blue-300">
                  <input
                    type="checkbox"
                    id="editIncludeLaborHours"
                    checked={editedTraveler.includeLaborHours}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setEditedTraveler({ ...editedTraveler, includeLaborHours: newValue });
                      if (newValue) {
                        alert('✅ Labor Hours Table will be included in this traveler!\n\nThe labor tracking section will appear at the end of the traveler document when printed.');
                      } else {
                        alert('⚠️ Labor Hours Table will be removed from this traveler!\n\nThe labor tracking section will NOT appear in the printed document.');
                      }
                    }}
                    className="w-5 h-5 text-blue-600 border border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="editIncludeLaborHours" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-semibold text-gray-900">Include Labor Hours Table</p>
                      <p className="text-xs text-gray-500">
                        {editedTraveler.includeLaborHours ? '✓ Labor tracking enabled - will print on second page' : 'Add labor tracking section to traveler'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Comments Section - First Page Only */}
          <div className="border-b-2 border-black">
            <div className="bg-purple-200 px-3 py-2 print:px-2 print:py-0.5 print:border-b-0">
              <h2 className="font-bold text-sm print-section-title">COMMENTS & NOTES</h2>
            </div>
            <div className="bg-purple-50 p-3 min-h-[60px] print:min-h-[20px] print:p-1 print-content text-sm">
              {isEditing ? (
                <textarea
                  value={editedTraveler.comments}
                  onChange={(e) => updateField('comments', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded min-h-[60px] text-sm"
                  placeholder="Enter comments..."
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm">{displayTraveler.comments || <span className="text-gray-400 italic">No comments</span>}</div>
              )}
            </div>
          </div>

          {/* Additional Instructions/Comments Space */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-50 p-3 min-h-[80px] print:min-h-[60px] print:p-2 text-sm">
              <div className="text-gray-400 text-xs print:text-gray-300">Additional Instructions/Comments:</div>
            </div>
          </div>

          {/* Labor Hours Section - Second Page (Page Break Before) - Only show if includeLaborHours is true */}
          {displayTraveler.includeLaborHours && (
            <div className="print:break-before-page">
              <div className="bg-purple-200 border-b-4 border-black px-4 py-4">
                <h2 className="font-bold text-3xl print:text-4xl">LABOR HOURS TRACKING</h2>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-purple-100 border-b-4 border-black">
                    <th className="border-r-4 border-black px-6 py-5 text-left font-bold text-2xl print:text-3xl">WORK CENTER</th>
                    <th className="border-r-4 border-black px-6 py-5 text-left font-bold text-2xl print:text-3xl">OPERATOR NAME</th>
                    <th className="border-r-4 border-black px-6 py-5 text-center font-bold text-2xl print:text-3xl">START TIME</th>
                    <th className="border-r-4 border-black px-6 py-5 text-center font-bold text-2xl print:text-3xl">END TIME</th>
                    <th className="px-6 py-5 text-center font-bold text-2xl print:text-3xl">TOTAL HOURS</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTraveler.laborEntries.map((entry) => (
                    <tr key={entry.id} className="border-b-4 border-gray-600" style={{height: '65px'}}>
                      {isEditing ? (
                        <>
                          <td className="border-r-4 border-gray-600 px-2 py-2">
                            <input
                              type="text"
                              value={entry.workCenter}
                              onChange={(e) => updateLaborEntry(entry.id, 'workCenter', e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-lg"
                              placeholder="Work center"
                            />
                          </td>
                          <td className="border-r-4 border-gray-600 px-2 py-2">
                            <input
                              type="text"
                              value={entry.operatorName}
                              onChange={(e) => updateLaborEntry(entry.id, 'operatorName', e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-lg"
                              placeholder="Operator name"
                            />
                          </td>
                          <td className="border-r-4 border-gray-600 px-2 py-2">
                            <input
                              type="time"
                              value={entry.startTime}
                              onChange={(e) => updateLaborEntry(entry.id, 'startTime', e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-lg"
                            />
                          </td>
                          <td className="border-r-4 border-gray-600 px-2 py-2">
                            <input
                              type="time"
                              value={entry.endTime}
                              onChange={(e) => updateLaborEntry(entry.id, 'endTime', e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-lg"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={entry.totalHours}
                              onChange={(e) => updateLaborEntry(entry.id, 'totalHours', e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-lg"
                              placeholder="Hours"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="border-r-4 border-gray-600 px-6 text-xl print:text-2xl">{entry.workCenter}</td>
                          <td className="border-r-4 border-gray-600 px-6 text-xl print:text-2xl">{entry.operatorName}</td>
                          <td className="border-r-4 border-gray-600 px-6 text-xl print:text-2xl text-center">{entry.startTime}</td>
                          <td className="border-r-4 border-gray-600 px-6 text-xl print:text-2xl text-center">{entry.endTime}</td>
                          <td className="px-6 text-xl print:text-2xl text-center">{entry.totalHours}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-purple-200 border-t-4 border-black" style={{height: '70px'}}>
                    <td colSpan={3} className="border-r-4 border-black px-6 py-5 text-right font-bold text-2xl print:text-3xl">TOTAL HOURS:</td>
                    <td className="border-r-4 border-black px-6 py-5 text-2xl print:text-3xl"></td>
                    <td className="px-6 py-5 text-2xl print:text-3xl"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
