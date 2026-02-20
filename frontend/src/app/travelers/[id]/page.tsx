'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import { ArrowLeftIcon, PrinterIcon, CheckIcon, XMarkIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { getWorkCentersByType, WorkCenterItem } from '@/data/workCenters';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config/api';

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
  travelerType: string;
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
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Dynamic work centers from DB
  const [dynamicWorkCenters, setDynamicWorkCenters] = useState<WorkCenterItem[]>([]);
  const dynamicWCNames = dynamicWorkCenters.map(wc => wc.name);

  // Refs for step rows to enable auto-scroll after reordering
  const stepRowRefs = useRef<{ [key: number]: HTMLTableRowElement | null }>({});

  // Keep page at top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch dynamic work centers when traveler type is known
  useEffect(() => {
    if (!traveler?.travelerType) return;
    const typeMap: Record<string, string> = { 'PCB_ASSEMBLY': 'PCB_ASSEMBLY', 'PCB': 'PCB', 'CABLE': 'CABLE', 'CABLES': 'CABLE', 'ASSY': 'PCB_ASSEMBLY', 'PURCHASING': 'PURCHASING' };
    const dbType = typeMap[traveler.travelerType] || 'PCB_ASSEMBLY';
    const fetchWC = async () => {
      try {
        const token = localStorage.getItem('nexus_token');
        const response = await fetch(`${API_BASE_URL}/work-centers-mgmt/?traveler_type=${dbType}`, {
          headers: { 'Authorization': `Bearer ${token || 'mock-token'}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setDynamicWorkCenters(data.map((wc: Record<string, string>) => ({ name: wc.name, description: wc.description || '', code: wc.code || '' })));
            return;
          }
        }
      } catch { /* fallback */ }
      setDynamicWorkCenters(getWorkCentersByType(traveler.travelerType));
    };
    fetchWC();
  }, [traveler?.travelerType]);

  // Load traveler from API
  useEffect(() => {
    const fetchTraveler = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/travelers/${travelerId}`, {
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
            travelerType: String(data.traveler_type || 'PCB_ASSEMBLY'),
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
            laborEntries: Array.from({ length: 20 }, (_, i) => ({
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

        const response = await fetch(`${API_BASE_URL}/barcodes/traveler/${travelerDbId}`, {
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

        const response = await fetch(`${API_BASE_URL}/barcodes/traveler/${travelerDbId}/steps-qr`, {
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
    // Deep copy traveler including all nested arrays
    setEditedTraveler(traveler ? {
      ...traveler,
      steps: traveler.steps.map(step => ({ ...step })),
      specs: traveler.specs.map(spec => ({ ...spec })),
      laborEntries: traveler.laborEntries.map(entry => ({ ...entry }))
    } : null);
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
        traveler_type: editedTraveler.travelerType || 'PCB_ASSEMBLY',
        priority: 'NORMAL',
        work_center: editedTraveler.steps.length > 0 ? (editedTraveler.steps[0].workCenter || 'ASSEMBLY') : 'ASSEMBLY',
        notes: '',
        process_steps: editedTraveler.steps.map(step => ({
          step_number: Number(step.seq) || 0,
          operation: step.workCenter || '',
          work_center_code: dynamicWorkCenters.find(wc => wc.name === step.workCenter)?.code || (step.workCenter || '').replace(/\s+/g, '_').toUpperCase() || 'UNKNOWN',
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

      const response = await fetch(`${API_BASE_URL}/travelers/${editedTraveler.travelerId}`, {
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
        toast.success('Traveler updated successfully!');
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
      toast.error(`Error updating traveler: ${errorMessage}. Check the console for more details.`);
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

        /* Mobile responsive styles - hide less important columns on small screens (but not when printing) */
        @media screen and (max-width: 768px) {
          .mobile-hide {
            display: none !important;
          }
          .routing-table {
            min-width: 100% !important;
          }
          /* Hide table on mobile, show card view instead */
          .routing-table-desktop {
            display: none !important;
          }
          .routing-cards-mobile {
            display: block !important;
          }
        }

        /* Desktop: Show table, hide cards */
        @media (min-width: 769px) {
          .routing-table-desktop {
            display: table !important;
          }
          .routing-cards-mobile {
            display: none !important;
          }
          .labor-table-desktop {
            display: table !important;
          }
          .labor-cards-mobile {
            display: none !important;
          }
        }

        /* Mobile: Hide labor table, show cards (but not when printing) */
        @media screen and (max-width: 768px) {
          .labor-table-desktop {
            display: none !important;
          }
          .labor-cards-mobile {
            display: block !important;
          }
        }

        /* Header styling for digital version */
        .bg-gray-100.border-b-2 { padding: 0.5rem 1rem; }
        .bg-gray-100 .grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0;
          align-items: center;
        }
        .bg-gray-100 .grid > div:first-child {
          text-align: left;
          padding-right: 1rem;
        }
        .bg-gray-100 .grid > div:nth-child(2) {
          text-align: center;
          padding: 0 1rem;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .bg-gray-100 .grid > div:last-child {
          text-align: right;
          padding-left: 1rem;
        }
        .bg-gray-100 .space-y-0\\.5 {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .bg-gray-100 .flex {
          gap: 0.5rem;
          align-items: baseline;
          justify-content: flex-end;
        }
        .bg-gray-100 .grid > div:first-child .flex {
          justify-content: flex-start;
        }
        .bg-gray-100 .text-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        @media print {
          /* Override mobile-hide to show all columns when printing */
          .mobile-hide {
            display: table-cell !important;
          }

          /* Show desktop table and hide mobile cards for print */
          .routing-table-desktop {
            display: table !important;
          }
          .routing-cards-mobile {
            display: none !important;
          }
          .labor-table-desktop {
            display: table !important;
          }
          .labor-cards-mobile {
            display: none !important;
          }

          @page {
            margin: 0.25in;
            size: letter;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: Arial, Helvetica, sans-serif !important;
            color: black !important;
            box-decoration-break: clone !important;
            -webkit-box-decoration-break: clone !important;
          }
          body { font-size: 10px !important; margin: 0 !important; padding: 0 !important; }

          /* Prevent borders from being cut off - increased border thickness */
          table, tr, td, th, div {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Increase all border thickness for print */
          .border { border-width: 2px !important; }
          .border-2 { border-width: 3px !important; }
          .border-b { border-bottom-width: 2px !important; }
          .border-b-2 { border-bottom-width: 3px !important; }
          .border-r { border-right-width: 2px !important; }
          .border-r-2 { border-right-width: 3px !important; }
          table.border-collapse { border-width: 3px !important; }

          /* Keep table rows together */
          tbody tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .max-w-7xl { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .p-6 { padding: 0 !important; }

          /* Reduce spacing between sections - keep routing directly below specifications */
          .border-b, .border-b-2 { margin-bottom: 0 !important; margin-top: 0 !important; }
          .space-y-6 > * { margin-top: 0 !important; margin-bottom: 0 !important; }
          .space-y-6 { gap: 0 !important; }

          /* Hide elements with no-print class */
          .no-print { display: none !important; }

          /* Keep section background colors for print */
          .bg-yellow-200, .bg-yellow-50, .bg-blue-200, .bg-purple-200, .bg-purple-100, .bg-gray-100 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Header section - Ultra compact like 1.jpg - force 3 columns in single row */
          .bg-gray-100.border-b-2 { padding: 0.2rem 0.5rem !important; }
          .bg-gray-100 .grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 0 !important;
            align-items: center !important;
          }
          .bg-gray-100 .grid > div:first-child { text-align: left !important; padding-right: 0.5rem !important; }
          .bg-gray-100 .grid > div:nth-child(2) {
            text-align: center !important;
            padding: 0 0.5rem !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }
          .bg-gray-100 .grid > div:last-child { text-align: right !important; padding-left: 0.5rem !important; }
          .bg-gray-100 .space-y-0\\.5 { row-gap: 0.2rem !important; margin: 0 !important; }
          .bg-gray-100 .flex { gap: 0.25rem !important; margin: 0 !important; align-items: baseline !important; justify-content: flex-end !important; }
          .bg-gray-100 .grid > div:first-child .flex { justify-content: flex-start !important; }
          .bg-gray-100 span { font-size: 12px !important; line-height: 1.4 !important; margin: 0 !important; padding: 0 !important; }
          .bg-gray-100 .font-bold { font-size: 12px !important; min-width: 70px !important; }
          .bg-gray-100 .text-xs { font-size: 12px !important; }
          .bg-gray-100 .text-\[10px\] { font-size: 12px !important; }

          /* Barcode - bigger and centered with tighter spacing */
          .bg-gray-100 img { width: 180px !important; height: 55px !important; display: block !important; margin: 0 auto !important; }
          .bg-gray-100 .border-2 { padding: 0.1rem !important; border-width: 1px !important; margin: 0 auto !important; display: inline-block !important; }
          .bg-gray-100 .text-xl { font-size: 14px !important; font-weight: 900 !important; text-align: center !important; }
          .bg-gray-100 .text-center { margin: 0 auto !important; padding: 0 !important; text-align: center !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; }

          /* Section headers - minimal padding like 1.jpg */
          .bg-yellow-200, .bg-blue-200, .bg-purple-200 { padding: 0.05rem 0.2rem !important; margin: 0 !important; }
          .bg-yellow-200 h2, .bg-blue-200 h2, .bg-purple-200 h2 { font-size: 12px !important; font-weight: bold !important; margin: 0 !important; }

          /* Keep all sections together - prevent page breaks between header, specs, and routing */
          .bg-gray-100.border-b-2 { page-break-after: avoid !important; break-after: avoid !important; }
          .bg-yellow-200.border-b { page-break-after: avoid !important; break-after: avoid !important; page-break-before: avoid !important; break-before: avoid !important; }
          .bg-yellow-50 { page-break-after: avoid !important; break-after: avoid !important; }
          .bg-blue-200.border-b { page-break-before: avoid !important; break-before: avoid !important; page-break-after: avoid !important; break-after: avoid !important; }
          .border-b.border-black:not(.bg-purple-200) { page-break-inside: avoid !important; break-inside: avoid !important; }

          /* Section content compact */
          .bg-yellow-50, .bg-purple-50 { padding: 0.05rem 0.1rem !important; font-size: 9px !important; margin: 0 !important; }
          .bg-purple-50 { padding: 0.1rem !important; min-height: 30px !important; }
          .bg-purple-50 .whitespace-pre-wrap { font-size: 9px !important; }

          /* Table headers - bigger font */
          thead th { padding: 0.2rem !important; font-size: 12px !important; font-weight: bold !important; }

          /* Table cells - bigger font */
          tbody td { padding: 0.2rem !important; }
          tbody td.text-lg { font-size: 12px !important; }
          tbody td.text-base { font-size: 12px !important; }
          tbody td.font-semibold { font-size: 11px !important; font-weight: 700 !important; } /* Work center - reduced to prevent overflow */

          /* Column width adjustments for print */
          table thead th:nth-child(1),
          table tbody td:nth-child(1) { width: 30px !important; max-width: 30px !important; } /* SQ - smaller */

          table thead th:nth-child(2),
          table tbody td:nth-child(2) { width: 145px !important; max-width: 145px !important; } /* WORK CENTER - bigger for 40px QR + text */

          table thead th:nth-child(3),
          table tbody td:nth-child(3) { width: auto !important; min-width: 200px !important; } /* INSTRUCTIONS - adjusted */

          table thead th:nth-child(4),
          table tbody td:nth-child(4) { width: 50px !important; max-width: 50px !important; } /* TIME */

          table thead th:nth-child(5),
          table tbody td:nth-child(5) { width: 50px !important; max-width: 50px !important; } /* QTY - same as TIME */

          table thead th:nth-child(6),
          table tbody td:nth-child(6) { width: 50px !important; max-width: 50px !important; } /* REJ */

          table thead th:nth-child(7),
          table tbody td:nth-child(7) { width: 50px !important; max-width: 50px !important; } /* ACC */

          table thead th:nth-child(8),
          table tbody td:nth-child(8) { width: 60px !important; max-width: 60px !important; } /* SIGN - smaller */

          table thead th:nth-child(9),
          table tbody td:nth-child(9) { width: 60px !important; max-width: 60px !important; } /* DATE - smaller */

          /* QR code alignment in work center column */
          table tbody td:nth-child(2) .flex {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          table tbody td:nth-child(2) img {
            margin-left: auto !important;
          }

          /* QR codes in table - bigger for better scanning */
          tbody td img { width: 40px !important; height: 40px !important; }
          tbody td .flex { gap: 0.1rem !important; }

          /* Additional Instructions */
          .bg-gray-50.border-b-2 { padding: 0.2rem !important; min-height: 750px !important; }
          .bg-gray-50 .text-gray-400 { font-size: 9px !important; }

          /* Bottom section compact - force 3 columns in one row */
          .bg-gray-50.px-3 {
            padding: 0.2rem !important;
            gap: 0.3rem !important;
            font-size: 10px !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
          }
          .bg-gray-50.px-3 .font-bold { font-size: 10px !important; min-width: 50px !important; }
          .bg-gray-50.px-3 span { font-size: 10px !important; }

          /* Labor Hours Tracking Table - Print Optimizations */
          .bg-purple-200.border-b-4 { padding: 0.2rem 0.3rem !important; }
          .bg-purple-200 h2 { font-size: 14px !important; font-weight: bold !important; }

          /* Labor hours table headers - reduce font and padding */
          .bg-purple-100 th { padding: 0.25rem 0.3rem !important; font-size: 12px !important; }

          /* Labor hours table cells - reduce font and padding */
          .border-r-4.border-gray-600 { padding: 0.25rem 0.3rem !important; }
          tbody td.text-xl { font-size: 11px !important; }

          /* Labor hours column widths - optimize space */
          .bg-purple-100 th:nth-child(1),
          tbody tr td:nth-child(1).border-r-4.border-gray-600 { width: 120px !important; max-width: 120px !important; } /* WORK CENTER */

          .bg-purple-100 th:nth-child(2),
          tbody tr td:nth-child(2).border-r-4.border-gray-600 { width: 150px !important; max-width: 150px !important; } /* OPERATOR NAME */

          .bg-purple-100 th:nth-child(3),
          tbody tr td:nth-child(3).border-r-4.border-gray-600 { width: 80px !important; max-width: 80px !important; } /* START TIME */

          .bg-purple-100 th:nth-child(4),
          tbody tr td:nth-child(4).border-r-4.border-gray-600 { width: 80px !important; max-width: 80px !important; } /* END TIME */

          .bg-purple-100 th:nth-child(5),
          tbody tr td:nth-child(5) { width: 80px !important; max-width: 80px !important; } /* TOTAL HOURS */

          /* Labor hours total row */
          .bg-purple-200.border-t-4 td { font-size: 12px !important; padding: 0.3rem !important; }
        }
      `}</style>
      <div className={`${isEditing ? 'w-full' : 'max-w-7xl mx-auto'} p-4 lg:p-6 space-y-6`}>
        {/* Action Bar - Screen Only */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2 md:gap-3 no-print bg-white shadow-md rounded-lg p-3 md:p-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center md:justify-start space-x-2 px-3 md:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm md:text-base font-medium"
          >
            <ArrowLeftIcon className="h-4 md:h-5 w-4 md:w-5" />
            <span>Back to Travelers</span>
          </button>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2">
            {!isEditing ? (
              <>
                {user?.role !== 'OPERATOR' && (
                  <>
                    <button
                      onClick={handlePrint}
                      className="flex items-center justify-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm md:text-base font-medium whitespace-nowrap shadow-sm"
                    >
                      <PrinterIcon className="h-4 md:h-5 w-4 md:w-5" />
                      <span className="hidden sm:inline">Print</span>
                      <span className="sm:hidden">Print</span>
                    </button>
                    <button
                      onClick={handleEdit}
                      className="flex items-center justify-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm md:text-base font-medium whitespace-nowrap shadow-sm"
                    >
                      <PencilIcon className="h-4 md:h-5 w-4 md:w-5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setConfirmModal({
                          title: 'Delete Traveler',
                          message: `Are you sure you want to delete traveler ${displayTraveler.jobNumber}?`,
                          onConfirm: async () => {
                            setConfirmModal(null);
                            try {
                              const token = localStorage.getItem('nexus_token');
                              const response = await fetch(`${API_BASE_URL}/travelers/${displayTraveler.travelerId}`, {
                                method: 'DELETE',
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });
                              if (response.ok) {
                                toast.success(`Traveler ${displayTraveler.jobNumber} deleted!`);
                                router.push('/travelers');
                              } else {
                                toast.error('Failed to delete traveler');
                              }
                            } catch (error) {
                              console.error('Error:', error);
                              toast.error('Failed to delete traveler');
                            }
                          }
                        });
                      }}
                      className="flex items-center justify-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm md:text-base font-medium whitespace-nowrap shadow-sm"
                    >
                      <TrashIcon className="h-4 md:h-5 w-4 md:w-5" />
                      <span className="hidden sm:inline">Delete</span>
                      <span className="sm:hidden">Del</span>
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="flex items-center justify-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm md:text-base font-medium whitespace-nowrap shadow-sm"
                >
                  <XMarkIcon className="h-4 md:h-5 w-4 md:w-5" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center justify-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm md:text-base font-medium whitespace-nowrap shadow-sm"
                >
                  <CheckIcon className="h-4 md:h-5 w-4 md:w-5" />
                  <span>Save Changes</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Traveler Form */}
        <div className="bg-white shadow-lg border-2 border-black overflow-x-auto" style={{fontFamily: 'Arial, Helvetica, sans-serif'}}>
          <div className="min-w-0 lg:min-w-[800px]">
          {/* Header Section */}
          <div className="bg-gray-100 border-b-2 border-black p-2 sm:p-3 md:p-4 print:p-2">
            {/* Mobile Layout - Barcode First */}
            <div className="block md:hidden print:hidden mb-4">
              <div className="flex flex-col items-center justify-center mb-4">
                <div className="text-base sm:text-lg font-black mb-2" style={{color: 'black', fontWeight: '900'}}>
                  {isEditing ? (
                    <div className="flex items-center gap-1 justify-center flex-wrap">
                      <span className="text-sm sm:text-base">Job:</span>
                      <input
                        type="text"
                        value={editedTraveler.jobNumber}
                        onChange={(e) => updateField('jobNumber', e.target.value)}
                        className="w-20 sm:w-24 border border-gray-300 rounded px-1 py-0.5 text-sm sm:text-base font-black"
                        style={{color: 'black'}}
                      />
                    </div>
                  ) : (
                    <span className="text-base sm:text-lg font-bold">Job: {displayTraveler.jobNumber}</span>
                  )}
                </div>
                <div className="border-2 border-black p-2 bg-white inline-block rounded">
                  {headerBarcode ? (
                    <img
                      src={`data:image/png;base64,${headerBarcode}`}
                      alt={`Barcode for ${displayTraveler.jobNumber}`}
                      className="mx-auto w-32 h-10 sm:w-40 sm:h-12"
                      style={{ objectFit: 'contain' }}
                      onError={(e) => {
                        console.error('Failed to load header barcode');
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center w-32 h-10 sm:w-40 sm:h-12">
                      <span className="text-xs text-gray-400">Loading barcode...</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Mobile Info - Organized by Sections */}
              <div className="space-y-3 text-xs">
                {/* Customer Information */}
                <div className="bg-blue-50 border-l-4 border-blue-600 p-2 rounded">
                  <div className="font-bold text-blue-800 mb-1 text-sm">Customer Information</div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="font-semibold">Code:</span> <span style={{color: 'black'}}>{isEditing ? <input type="text" value={editedTraveler.customerCode} onChange={(e) => updateField('customerCode', e.target.value)} className="w-32 border border-gray-300 rounded px-1" style={{color: 'black'}}/> : (displayTraveler.customerCode || '-')}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Name:</span> <span className="text-right" style={{color: 'black'}}>{isEditing ? <input type="text" value={editedTraveler.customerName} onChange={(e) => updateField('customerName', e.target.value)} className="w-40 border border-gray-300 rounded px-1" style={{color: 'black'}}/> : (displayTraveler.customerName || '-')}</span></div>
                  </div>
                </div>

                {/* Order Information */}
                <div className="bg-green-50 border-l-4 border-green-600 p-2 rounded">
                  <div className="font-bold text-green-800 mb-1 text-sm">Order Information</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex justify-between"><span className="font-semibold">WO:</span> <span style={{color: 'black'}}>{isEditing ? <input type="text" value={editedTraveler.workOrder} onChange={(e) => updateField('workOrder', e.target.value)} className="w-20 border border-gray-300 rounded px-1" style={{color: 'black'}}/> : (displayTraveler.workOrder || '-')}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">PO:</span> <span style={{color: 'black'}}>{isEditing ? <input type="text" value={editedTraveler.poNumber || ''} onChange={(e) => updateField('poNumber', e.target.value)} className="w-20 border border-gray-300 rounded px-1" style={{color: 'black'}}/> : (displayTraveler.poNumber || '-')}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Quantity:</span> <span style={{color: 'black'}}>{isEditing ? <input type="number" value={editedTraveler.quantity} onChange={(e) => updateField('quantity', parseInt(e.target.value) || 0)} className="w-16 border border-gray-300 rounded px-1" style={{color: 'black'}}/> : displayTraveler.quantity}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Traveler Rev:</span> <span style={{color: 'black'}}>{isEditing ? <input type="text" value={editedTraveler.revision} onChange={(e) => updateField('revision', e.target.value)} className="w-16 border border-gray-300 rounded px-1" style={{color: 'black'}}/> : (displayTraveler.revision || '- -')}</span></div>
                  </div>
                </div>

                {/* Part Information */}
                <div className="bg-purple-50 border-l-4 border-purple-600 p-2 rounded">
                  <div className="font-bold text-purple-800 mb-1 text-sm">Part Information</div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="font-semibold">Part No:</span> <span style={{color: 'black'}}>{isEditing ? <input type="text" value={editedTraveler.partNumber} onChange={(e) => updateField('partNumber', e.target.value)} className="w-32 border border-gray-300 rounded px-1" style={{color: 'black'}}/> : (displayTraveler.partNumber || '-')}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Description:</span> <span className="text-right truncate ml-2" style={{color: 'black'}}>{isEditing ? <input type="text" value={editedTraveler.description} onChange={(e) => updateField('description', e.target.value)} className="w-40 border border-gray-300 rounded px-1" style={{color: 'black'}}/> : (displayTraveler.description || '-')}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Cust. Rev:</span> <span style={{color: 'black'}}>{isEditing ? <input type="text" value={editedTraveler.customerRevision || ''} onChange={(e) => updateField('customerRevision', e.target.value)} className="w-20 border border-gray-300 rounded px-1" style={{color: 'black'}}/> : (displayTraveler.customerRevision || '- -')}</span></div>
                  </div>
                </div>

                {/* Important Dates */}
                <div className="bg-orange-50 border-l-4 border-orange-600 p-2 rounded">
                  <div className="font-bold text-orange-800 mb-1 text-sm">Important Dates</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex justify-between"><span className="font-semibold">Start:</span> <span style={{color: 'black'}}>{isEditing ? <input type="date" value={editedTraveler.createdAt} onChange={(e) => updateField('createdAt', e.target.value)} className="w-28 border border-gray-300 rounded px-1 text-[10px]" style={{color: 'black'}}/> : (formatDateDisplay(displayTraveler.createdAt) || '-')}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Due:</span> <span style={{color: 'black'}}>{isEditing ? <input type="date" value={editedTraveler.dueDate} onChange={(e) => updateField('dueDate', e.target.value)} className="w-28 border border-gray-300 rounded px-1 text-[10px]" style={{color: 'black'}}/> : (formatDateDisplay(displayTraveler.dueDate) || '-')}</span></div>
                    <div className="col-span-2 flex justify-between"><span className="font-semibold">Ship Date:</span> <span style={{color: 'black'}}>{isEditing ? <input type="date" value={editedTraveler.shipDate} onChange={(e) => updateField('shipDate', e.target.value)} className="w-28 border border-gray-300 rounded px-1 text-[10px]" style={{color: 'black'}}/> : (formatDateDisplay(displayTraveler.shipDate) || '-')}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop & Print Layout - Original 3 Columns */}
            <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-2 print:!grid print:!grid-cols-3 print:gap-2 items-start lg:items-center overflow-hidden">
              {/* Left Column */}
              <div className="space-y-1 md:space-y-1.5 lg:space-y-0.5 print:space-y-0.5 flex flex-col items-start overflow-hidden">
                <div className="flex items-baseline gap-1 md:gap-2 print:gap-1 w-full overflow-hidden">
                  <span className="font-bold text-xs md:text-sm min-w-[90px] md:min-w-[110px] lg:min-w-[100px] print:text-[8px] print:min-w-[70px] print:leading-tight flex-shrink-0">Cust. Code:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.customerCode}
                      onChange={(e) => updateField('customerCode', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm md:text-base max-w-full"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span className="flex-1 text-sm md:text-base print:text-[8px] print:leading-tight overflow-hidden" style={{color: 'black'}}>{displayTraveler.customerCode || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 md:gap-2 print:gap-1 w-full overflow-hidden">
                  <span className="font-bold text-xs md:text-sm min-w-[90px] md:min-w-[110px] lg:min-w-[100px] print:text-[8px] print:min-w-[70px] print:leading-tight flex-shrink-0">Cust. Name:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.customerName}
                      onChange={(e) => updateField('customerName', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm md:text-base max-w-full"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span className="flex-1 text-sm md:text-base print:text-[8px] truncate overflow-hidden" style={{color: 'black'}}>{displayTraveler.customerName || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 md:gap-2 print:gap-1 w-full overflow-hidden">
                  <span className="font-bold text-xs md:text-sm min-w-[90px] md:min-w-[110px] lg:min-w-[100px] print:text-[8px] print:min-w-[70px] print:leading-tight flex-shrink-0">Work Order:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.workOrder}
                      onChange={(e) => updateField('workOrder', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm md:text-base text-left max-w-full"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span className="flex-1 text-left text-sm md:text-base print:text-[8px] print:leading-tight overflow-hidden" style={{color: 'black'}}>{displayTraveler.workOrder || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 md:gap-2 print:gap-1 w-full overflow-hidden">
                  <span className="font-bold text-xs md:text-sm min-w-[90px] md:min-w-[110px] lg:min-w-[100px] print:text-[8px] print:min-w-[70px] print:leading-tight flex-shrink-0">PO Number:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.poNumber || ''}
                      onChange={(e) => updateField('poNumber', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm md:text-base text-left max-w-full"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span className="flex-1 text-left text-sm md:text-base print:text-[8px] print:leading-tight overflow-hidden" style={{color: 'black'}}>{displayTraveler.poNumber || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 md:gap-2 print:gap-1 w-full overflow-hidden">
                  <span className="font-bold text-xs md:text-sm min-w-[90px] md:min-w-[110px] lg:min-w-[100px] print:text-[8px] print:min-w-[70px] print:leading-tight flex-shrink-0">Quantity:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedTraveler.quantity}
                      onChange={(e) => updateField('quantity', parseInt(e.target.value) || 0)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm md:text-base text-left max-w-full"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span className="flex-1 text-left text-sm md:text-base print:text-[8px] print:leading-tight overflow-hidden" style={{color: 'black'}}>{displayTraveler.quantity}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 md:gap-2 print:gap-1 w-full overflow-hidden">
                  <span className="font-bold text-xs md:text-sm min-w-[90px] md:min-w-[110px] lg:min-w-[100px] print:text-[8px] print:min-w-[70px] print:leading-tight flex-shrink-0">Traveler Rev:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.revision}
                      onChange={(e) => updateField('revision', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm md:text-base text-left max-w-full"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span className="flex-1 text-left text-sm md:text-base print:text-[8px] print:leading-tight overflow-hidden" style={{color: 'black'}}>
                      {displayTraveler.revision ? displayTraveler.revision : '- -'}
                    </span>
                  )}
                </div>
              </div>

              {/* Center - Barcode with Details */}
              <div className="flex flex-col items-center justify-center">
                <div className="text-center">
                  <div className="text-base sm:text-lg md:text-xl font-black mb-2 print:mb-0 print:text-[10px] print:leading-tight" style={{color: 'black', fontWeight: '900'}}>
                    {isEditing ? (
                      <div className="flex items-center gap-1 justify-center flex-wrap">
                        <span className="text-sm sm:text-base md:text-lg">Job:</span>
                        <input
                          type="text"
                          value={editedTraveler.jobNumber}
                          onChange={(e) => updateField('jobNumber', e.target.value)}
                          className="w-20 sm:w-24 md:w-32 border border-gray-300 rounded px-1 py-0.5 text-sm sm:text-base md:text-lg font-black"
                          style={{color: 'black'}}
                        />
                      </div>
                    ) : (
                      <span className="text-base sm:text-lg md:text-xl font-bold print:text-[10px]">Job: {displayTraveler.jobNumber}</span>
                    )}
                  </div>
                  <div className="border-2 border-black p-2 bg-white inline-block rounded print:p-0.5 print:border">
                    {headerBarcode ? (
                      <img
                        src={`data:image/png;base64,${headerBarcode}`}
                        alt={`Barcode for ${displayTraveler.jobNumber}`}
                        className="mx-auto w-32 h-10 sm:w-40 sm:h-12 md:w-44 md:h-14 print:w-[100px] print:h-[30px]"
                        style={{ objectFit: 'contain' }}
                        onError={(e) => {
                          console.error('Failed to load header barcode');
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-32 h-10 sm:w-40 sm:h-12 md:w-44 md:h-14">
                        <span className="text-xs text-gray-400">Loading barcode...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-1 sm:space-y-0.5 print:space-y-0.5 flex flex-col items-end">
                <div className="flex items-baseline gap-1 sm:gap-2 print:gap-1 ">
                  <span className="font-bold text-xs sm:text-sm min-w-[90px] sm:min-w-[100px] print:text-[8px] print:min-w-[70px] print:leading-tight">Part No:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.partNumber}
                      onChange={(e) => updateField('partNumber', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs text-right"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span className="flex-1 text-right text-xs sm:text-sm print:text-[8px] print:leading-tight" style={{color: 'black'}}>{displayTraveler.partNumber || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 sm:gap-2 print:gap-1 ">
                  <span className="font-bold text-xs sm:text-sm min-w-[90px] sm:min-w-[100px] print:text-[8px] print:min-w-[70px] print:leading-tight">Description:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs text-right"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span className="flex-1 text-right text-xs print:text-[8px] break-words" style={{color: 'black'}}>{displayTraveler.description || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 sm:gap-2 print:gap-1 ">
                  <span className="font-bold text-xs sm:text-sm min-w-[90px] sm:min-w-[100px] print:text-[8px] print:min-w-[70px] print:leading-tight">Cust. Revision:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.customerRevision || ''}
                      onChange={(e) => updateField('customerRevision', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs text-right"
                      style={{color: 'black'}}
                      placeholder="Cust. Revision"
                    />
                  ) : (
                    <span className="flex-1 text-right text-xs sm:text-sm print:text-[8px] print:leading-tight" style={{color: 'black'}}>
                      {displayTraveler.customerRevision ? displayTraveler.customerRevision : '- -'}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 sm:gap-2 print:gap-1 ">
                  <span className="font-bold text-xs sm:text-sm min-w-[90px] sm:min-w-[100px] print:text-[8px] print:min-w-[70px] print:leading-tight">Start Date:</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedTraveler.createdAt}
                      onChange={(e) => updateField('createdAt', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs text-right"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span className="flex-1 text-right text-xs sm:text-sm print:text-[8px] print:leading-tight" style={{color: 'black'}}>{formatDateDisplay(displayTraveler.createdAt) || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 sm:gap-2 print:gap-1 ">
                  <span className="font-bold text-xs sm:text-sm min-w-[90px] sm:min-w-[100px] print:text-[8px] print:min-w-[70px] print:leading-tight">Due Date:</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedTraveler.dueDate}
                      onChange={(e) => updateField('dueDate', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs text-right"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span className="flex-1 text-right text-xs sm:text-sm print:text-[8px] print:leading-tight" style={{color: 'black'}}>{formatDateDisplay(displayTraveler.dueDate) || '-'}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 sm:gap-2 print:gap-1 ">
                  <span className="font-bold text-xs sm:text-sm min-w-[90px] sm:min-w-[100px] print:text-[8px] print:min-w-[70px] print:leading-tight">Ship Date:</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedTraveler.shipDate}
                      onChange={(e) => updateField('shipDate', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs text-right"
                      style={{color: 'black'}}
                    />
                  ) : (
                    <span className="flex-1 text-right text-xs sm:text-sm print:text-[8px] print:leading-tight" style={{color: 'black'}}>{formatDateDisplay(displayTraveler.shipDate) || '-'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Specifications Section */}
          <div className="border-b border-black print:break-inside-avoid">
            <div className="bg-yellow-200 border-b border-black px-2 py-0.5 flex justify-between items-center print:px-1 print:py-0">
              <h2 className="font-bold text-xs print:text-[9px]">SPECIFICATIONS</h2>
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
            <div className="bg-yellow-50 p-0.5 text-xs print:p-0 print:text-[8px]">
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
          <div className="border-b-2 border-black print:break-inside-avoid">
            <div className="bg-blue-200 border-b border-black px-2 py-0.5 flex justify-between items-center print:px-1 print:py-0">
              <h2 className="font-bold text-xs print:text-[9px]">ROUTING</h2>
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

            {/* Desktop Table View */}
            <div className="overflow-x-auto">
            <table className="routing-table routing-table-desktop w-full border-collapse text-sm border-2 border-gray-400 min-w-0 lg:min-w-[640px]">
              <thead>
                <tr className="bg-gray-200 border-b-2 border-gray-400">
                  <th className="border-r-2 border-gray-400 px-3 py-3 w-20 text-center font-bold text-base print:px-1 print:py-1 print:text-[10px]">SQ</th>
                  <th className="border-r-2 border-gray-400 px-3 py-3 w-52 text-left font-bold text-base print:px-1 print:py-1 print:text-[10px]">WORK CENTER</th>
                  <th className="border-r-2 border-gray-400 px-3 py-3 text-left font-bold text-base print:px-1 print:py-1 print:text-[10px]">INSTRUCTIONS</th>
                  <th className="border-r-2 border-gray-400 px-3 py-3 w-20 text-center font-bold text-base print:px-1 print:py-1 print:text-[10px]">TIME</th>
                  <th className="border-r-2 border-gray-400 px-3 py-3 w-24 text-center font-bold text-base print:px-1 print:py-1 print:text-[10px]">QTY</th>
                  <th className="border-r-2 border-gray-400 px-3 py-3 w-24 text-center font-bold text-base print:px-1 print:py-1 print:text-[10px]">REJ</th>
                  <th className="border-r-2 border-gray-400 px-3 py-3 w-24 text-center font-bold text-base print:px-1 print:py-1 print:text-[10px]">ACC</th>
                  <th className="border-r-2 border-gray-400 px-3 py-3 w-28 text-center font-bold text-base print:px-1 print:py-1 print:text-[10px]">SIGN</th>
                  <th className="border-r-2 border-gray-400 px-3 py-3 w-28 text-center font-bold text-base print:px-1 print:py-1 print:text-[10px]">DATE</th>
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
                              {step.workCenter === '__CUSTOM__' || (step.workCenter && dynamicWCNames.length > 0 && !dynamicWCNames.includes(step.workCenter)) ? (
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={step.workCenter === '__CUSTOM__' ? '' : step.workCenter}
                                    onChange={(e) => updateStep(index, 'workCenter', e.target.value)}
                                    className="flex-1 border-2 border-blue-400 rounded-md px-2 py-2 text-sm md:text-base font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    placeholder="Type custom work center name"
                                  />
                                  <button
                                    onClick={() => updateStep(index, 'workCenter', dynamicWCNames[0] || '')}
                                    className="px-2 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm md:text-base font-medium transition-colors"
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
                                  className="w-full border-2 border-blue-400 rounded-md px-2 py-2 text-sm md:text-base font-medium bg-white hover:border-blue-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-colors cursor-pointer overflow-hidden"
                                  style={{ maxWidth: '100%' }}
                                >
                                  <option value="">Select Work Center...</option>
                                  <option value="__CUSTOM__" className="font-bold">+ CUSTOM (Type Your Own)</option>
                                  {dynamicWorkCenters.map(wc => (
                                    <option key={wc.name} value={wc.name} title={wc.description}>{wc.name}</option>
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
                        <td className="border-r-2 border-b-2 border-gray-400 px-3 py-3 text-center font-bold text-lg print:px-1 print:py-1 print:text-[10px]">{step.seq}</td>
                        <td className="border-r-2 border-b-2 border-gray-400 px-3 py-3 font-semibold text-base break-words print:px-1 print:py-1 print:text-[9px]">
                          <div className="flex flex-row items-center justify-between gap-2 print:gap-1">
                            <span className="break-words">{step.workCenter.replace(/_/g, ' ')}</span>
                            {step.id && stepQRCodes[step.id] ? (
                              <img
                                src={`data:image/png;base64,${stepQRCodes[step.id]}`}
                                alt={`QR Code for ${step.workCenter}`}
                                className="border border-gray-200 flex-shrink-0 print:w-[25px] print:h-[25px]"
                                style={{ width: '40px', height: '40px' }}
                                onError={() => {
                                  console.error('Failed to load QR code for step', step.id);
                                }}
                              />
                            ) : step.id ? (
                              <div className="text-[8px] text-gray-400 flex-shrink-0 print:hidden">QR Loading...</div>
                            ) : null}
                          </div>
                        </td>
                        <td className="border-r-2 border-b-2 border-gray-400 px-3 py-3 text-base break-words print:px-1 print:py-1 print:text-[9px]">
                          {step.instruction ? step.instruction : <span className="inline-block w-full border-b border-gray-400" style={{minHeight: '16px'}}>&nbsp;</span>}
                        </td>
                        <td className="border-r-2 border-b-2 border-gray-400 px-3 py-3 text-center text-base print:px-1 print:py-1 print:text-[9px]">
                          <span className="inline-block w-full border-b border-gray-400" style={{minHeight: '16px'}}>&nbsp;</span>
                        </td>
                        <td className="border-r-2 border-b-2 border-gray-400 px-3 py-3 text-center text-lg font-bold print:px-1 print:py-1 print:text-[10px]">
                          <span className="inline-block w-full border-b border-gray-400" style={{minHeight: '16px'}}>&nbsp;</span>
                        </td>
                        <td className="border-r-2 border-b-2 border-gray-400 px-3 py-3 text-center text-lg font-bold text-red-700 print:px-1 print:py-1 print:text-[10px]">
                          <span className="inline-block w-full border-b border-gray-400" style={{minHeight: '16px'}}>&nbsp;</span>
                        </td>
                        <td className="border-r-2 border-b-2 border-gray-400 px-3 py-3 text-center text-lg font-bold text-green-700 print:px-1 print:py-1 print:text-[10px]">
                          <span className="inline-block w-full border-b border-gray-400" style={{minHeight: '16px'}}>&nbsp;</span>
                        </td>
                        <td className="border-r-2 border-b-2 border-gray-400 px-3 py-3 text-center text-lg font-bold print:px-1 print:py-1 print:text-[10px]">
                          <span className="inline-block w-full border-b border-gray-400" style={{minHeight: '16px'}}>&nbsp;</span>
                        </td>
                        <td className="border-r-2 border-b-2 border-gray-400 px-3 py-3 text-center text-base print:px-1 print:py-1 print:text-[9px]">
                          <span className="inline-block w-full border-b border-gray-400" style={{minHeight: '16px'}}>&nbsp;</span>
                        </td>
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
            </div>

            {/* Mobile Card View */}
            <div className="routing-cards-mobile space-y-3 p-2">
              {displayTraveler.steps.map((step, index) => (
                <div key={index} className="bg-white border-2 border-gray-400 rounded-lg shadow-sm">
                  {/* Card Header */}
                  <div className="bg-gray-200 border-b-2 border-gray-400 px-3 py-2 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="bg-blue-600 text-white font-bold px-2 py-1 rounded text-sm">
                        SQ {isEditing ? (
                          <input
                            type="number"
                            value={step.seq}
                            onChange={(e) => updateStep(index, 'seq', parseInt(e.target.value) || 0)}
                            className="w-12 ml-1 border border-white rounded px-1 text-center bg-blue-700 text-white font-bold"
                          />
                        ) : step.seq}
                      </span>
                      <span className="font-bold text-base">{step.workCenter.replace(/_/g, ' ')}</span>
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => removeStep(index)}
                        className="p-1 bg-red-600 hover:bg-red-700 text-white rounded"
                        title="Remove step"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-3 space-y-3">
                    {/* Work Center (edit mode only since it's shown in header) */}
                    {isEditing && (
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Work Center</label>
                        {step.workCenter === '__CUSTOM__' || (step.workCenter && dynamicWCNames.length > 0 && !dynamicWCNames.includes(step.workCenter)) ? (
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={step.workCenter === '__CUSTOM__' ? '' : step.workCenter}
                              onChange={(e) => updateStep(index, 'workCenter', e.target.value)}
                              className="flex-1 border-2 border-blue-400 rounded-md px-3 py-2.5 text-base font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              placeholder="Type custom work center name"
                            />
                            <button
                              onClick={() => updateStep(index, 'workCenter', dynamicWCNames[0] || '')}
                              className="px-3 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-base font-medium transition-colors"
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
                            className="w-full border-2 border-blue-400 rounded-md px-2 py-2.5 text-sm font-medium bg-white hover:border-blue-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-colors cursor-pointer overflow-hidden"
                            style={{ maxWidth: '100%' }}
                          >
                            <option value="">Select Work Center...</option>
                            <option value="__CUSTOM__" className="font-bold">+ CUSTOM (Type Your Own)</option>
                            {dynamicWorkCenters.map(wc => (
                              <option key={wc.name} value={wc.name} title={wc.description}>{wc.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {/* Instructions */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Instructions</label>
                      {isEditing ? (
                        <textarea
                          value={step.instruction}
                          onChange={(e) => updateStep(index, 'instruction', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 min-h-[60px] text-sm"
                          placeholder="Enter instructions..."
                        />
                      ) : (
                        <div className="text-sm bg-gray-50 p-2 rounded min-h-[40px]">
                          {step.instruction || <span className="text-gray-400">No instructions</span>}
                        </div>
                      )}
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Quantity</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={step.quantity}
                            onChange={(e) => updateStep(index, 'quantity', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-center text-sm font-bold bg-gray-50"
                          />
                        ) : (
                          <div className="text-sm font-bold text-center bg-gray-50 p-1.5 rounded">{step.quantity || '-'}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-red-700 mb-1">Rejected</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={step.rejected}
                            onChange={(e) => updateStep(index, 'rejected', e.target.value)}
                            className="w-full border border-red-300 rounded px-2 py-1.5 text-center text-sm font-bold text-red-700 bg-red-50"
                          />
                        ) : (
                          <div className="text-sm font-bold text-center text-red-700 bg-red-50 p-1.5 rounded">{step.rejected || '-'}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-green-700 mb-1">Accepted</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={step.accepted}
                            onChange={(e) => updateStep(index, 'accepted', e.target.value)}
                            className="w-full border border-green-300 rounded px-2 py-1.5 text-center text-sm font-bold text-green-700 bg-green-50"
                          />
                        ) : (
                          <div className="text-sm font-bold text-center text-green-700 bg-green-50 p-1.5 rounded">{step.accepted || '-'}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-purple-700 mb-1">Sign</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={step.sign}
                            onChange={(e) => updateStep(index, 'sign', e.target.value)}
                            className="w-full border border-purple-300 rounded px-2 py-1.5 text-center text-sm font-bold bg-purple-50"
                            placeholder="Sign"
                          />
                        ) : (
                          <div className="text-sm font-bold text-center bg-purple-50 p-1.5 rounded">{step.sign || '-'}</div>
                        )}
                      </div>
                    </div>

                    {/* Time and Date */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Time</label>
                        {isEditing ? (
                          <input
                            type="time"
                            value={step.completedTime || ''}
                            onChange={(e) => updateStep(index, 'completedTime', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                          />
                        ) : (
                          <div className="text-sm text-center bg-gray-50 p-1.5 rounded">{step.completedTime || '-'}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={step.completedDate}
                            onChange={(e) => updateStep(index, 'completedDate', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                          />
                        ) : (
                          <div className="text-sm text-center bg-gray-50 p-1.5 rounded">{step.completedDate || '-'}</div>
                        )}
                      </div>
                    </div>

                    {/* QR Code */}
                    {step.id && stepQRCodes[step.id] && (
                      <div className="flex justify-center pt-2 border-t border-gray-200">
                        <img
                          src={`data:image/png;base64,${stepQRCodes[step.id]}`}
                          alt={`QR Code for ${step.workCenter}`}
                          className="border border-gray-200"
                          style={{ width: '60px', height: '60px' }}
                          onError={() => {
                            console.error('Failed to load QR code for step', step.id);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {displayTraveler.steps.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                  <div className="text-sm font-bold">⚠️ No work center steps found!</div>
                  {isEditing && (
                    <div className="text-xs mt-2">Click &quot;Add Step&quot; button above to add work center steps.</div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Info */}
            <div className="bg-gray-50 px-3 py-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm border-t border-gray-300 print:px-2 print:py-1 print:gap-2 print:text-[9px]">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 print:gap-0.5">
                <span className="font-bold min-w-[85px] print:min-w-[60px] print:text-[9px]" style={{color: 'black'}}>From Stock:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTraveler.fromStock}
                    onChange={(e) => updateField('fromStock', e.target.value)}
                    className="flex-1 border border-gray-300 rounded bg-transparent px-2 py-1"
                    style={{color: 'black', outline: 'none'}}
                  />
                ) : (
                  <span className="flex-1 px-1 break-words print:text-[9px]" style={{color: 'black'}}>{displayTraveler.fromStock || '-'}</span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 print:gap-0.5">
                <span className="font-bold min-w-[85px] print:min-w-[60px] print:text-[9px]" style={{color: 'black'}}>To Stock:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTraveler.toStock}
                    onChange={(e) => updateField('toStock', e.target.value)}
                    className="flex-1 border border-gray-300 rounded bg-transparent px-2 py-1"
                    style={{color: 'black', outline: 'none'}}
                  />
                ) : (
                  <span className="flex-1 px-1 break-words print:text-[9px]" style={{color: 'black'}}>{displayTraveler.toStock || '-'}</span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                <span className="font-bold min-w-[85px] print:min-w-[60px] print:text-[9px]" style={{color: 'black'}}>Ship Via:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTraveler.shipVia}
                    onChange={(e) => updateField('shipVia', e.target.value)}
                    className="flex-1 border border-gray-300 rounded bg-transparent px-2 py-1"
                    style={{color: 'black', outline: 'none'}}
                  />
                ) : (
                  <span className="flex-1 px-1 break-words print:text-[9px]" style={{color: 'black'}}>{displayTraveler.shipVia || '-'}</span>
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
                        toast.success('Labor Hours Table will be included in this traveler! The labor tracking section will appear at the end of the traveler document when printed.');
                      } else {
                        toast.warning('Labor Hours Table will be removed from this traveler! The labor tracking section will NOT appear in the printed document.');
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
            <div className="bg-purple-200 px-3 py-2 print:px-1 print:py-0">
              <h2 className="font-bold text-sm print:text-[9px] print-section-title">COMMENTS & NOTES</h2>
            </div>
            <div className="bg-purple-50 p-3 min-h-[60px] text-sm print:p-1 print:min-h-[40px] print:text-[8px]">
              {isEditing ? (
                <textarea
                  value={editedTraveler.comments}
                  onChange={(e) => updateField('comments', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded min-h-[60px] text-sm"
                  placeholder="Enter comments..."
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm print:text-[8px]">{displayTraveler.comments || <span className="text-gray-400 italic">No comments</span>}</div>
              )}
            </div>
          </div>

          {/* Additional Instructions/Comments Space */}
          <div className="border-b-2 border-black">
            <div className="bg-gray-50 p-3 min-h-[120px] print:min-h-[750px] text-sm print:p-1">
              <div className="text-gray-400 text-xs print:text-[8px]">Additional Instructions/Comments:</div>
            </div>
          </div>

          {/* Labor Hours Section - Second Page (Page Break Before) - Show if includeLaborHours is true */}
          {displayTraveler.includeLaborHours && (
            <div className="print:break-before-page">
              <div className="bg-purple-200 border-b-4 border-black px-4 py-4">
                <h2 className="font-bold text-xl md:text-3xl">LABOR HOURS TRACKING</h2>
              </div>
              <div className="overflow-x-auto">
              <table className="labor-table-desktop w-full border-collapse min-w-0 lg:min-w-[640px]">
                <thead>
                  <tr className="bg-purple-100 border-b-4 border-black">
                    <th className="border-r-4 border-black px-6 py-5 text-left font-bold text-2xl">WORK CENTER</th>
                    <th className="border-r-4 border-black px-6 py-5 text-left font-bold text-2xl">OPERATOR NAME</th>
                    <th className="border-r-4 border-black px-6 py-5 text-center font-bold text-2xl">START TIME</th>
                    <th className="border-r-4 border-black px-6 py-5 text-center font-bold text-2xl">END TIME</th>
                    <th className="px-6 py-5 text-center font-bold text-2xl">TOTAL HOURS</th>
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
                          <td className="border-r-4 border-gray-600 px-6 text-xl">
                            {entry.workCenter || <span className="inline-block w-full border-b border-gray-400" style={{minHeight: '16px'}}>&nbsp;</span>}
                          </td>
                          <td className="border-r-4 border-gray-600 px-6 text-xl">
                            {entry.operatorName || <span className="inline-block w-full border-b border-gray-400" style={{minHeight: '16px'}}>&nbsp;</span>}
                          </td>
                          <td className="border-r-4 border-gray-600 px-6 text-xl text-center">
                            {entry.startTime || <span className="inline-block w-full border-b border-gray-400" style={{minHeight: '16px'}}>&nbsp;</span>}
                          </td>
                          <td className="border-r-4 border-gray-600 px-6 text-xl text-center">
                            {entry.endTime || <span className="inline-block w-full border-b border-gray-400" style={{minHeight: '16px'}}>&nbsp;</span>}
                          </td>
                          <td className="px-6 text-xl text-center">
                            {entry.totalHours || <span className="inline-block w-full border-b border-gray-400" style={{minHeight: '16px'}}>&nbsp;</span>}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-purple-200 border-t-4 border-black" style={{height: '70px'}}>
                    <td colSpan={3} className="border-r-4 border-black px-6 py-5 text-right font-bold text-2xl">TOTAL HOURS:</td>
                    <td className="border-r-4 border-black px-6 py-5 text-2xl"></td>
                    <td className="px-6 py-5 text-2xl"></td>
                  </tr>
                </tbody>
              </table>
              </div>

              {/* Mobile Card View for Labor Hours */}
              <div className="labor-cards-mobile space-y-3 p-2">
                {displayTraveler.laborEntries.map((entry) => (
                  <div key={entry.id} className="bg-white border-2 border-purple-400 rounded-lg shadow-sm">
                    <div className="bg-purple-100 border-b-2 border-purple-400 px-3 py-2">
                      <h3 className="font-bold text-sm">Labor Entry #{entry.id}</h3>
                    </div>
                    <div className="p-3 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Work Center</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={entry.workCenter}
                            onChange={(e) => updateLaborEntry(entry.id, 'workCenter', e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-base"
                            placeholder="Work center"
                          />
                        ) : (
                          <div className="text-base bg-gray-50 p-2 rounded min-h-[40px]">
                            {entry.workCenter || <span className="text-gray-400">-</span>}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Operator Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={entry.operatorName}
                            onChange={(e) => updateLaborEntry(entry.id, 'operatorName', e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-base"
                            placeholder="Operator name"
                          />
                        ) : (
                          <div className="text-base bg-gray-50 p-2 rounded min-h-[40px]">
                            {entry.operatorName || <span className="text-gray-400">-</span>}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Start Time</label>
                          {isEditing ? (
                            <input
                              type="time"
                              value={entry.startTime}
                              onChange={(e) => updateLaborEntry(entry.id, 'startTime', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-base"
                            />
                          ) : (
                            <div className="text-base text-center bg-gray-50 p-2 rounded">
                              {entry.startTime || <span className="text-gray-400">-</span>}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">End Time</label>
                          {isEditing ? (
                            <input
                              type="time"
                              value={entry.endTime}
                              onChange={(e) => updateLaborEntry(entry.id, 'endTime', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-base"
                            />
                          ) : (
                            <div className="text-base text-center bg-gray-50 p-2 rounded">
                              {entry.endTime || <span className="text-gray-400">-</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Total Hours</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={entry.totalHours}
                            onChange={(e) => updateLaborEntry(entry.id, 'totalHours', e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-base"
                            placeholder="Hours"
                          />
                        ) : (
                          <div className="text-base text-center bg-gray-50 p-2 rounded font-bold">
                            {entry.totalHours || <span className="text-gray-400">-</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
            <p className="text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold"
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
