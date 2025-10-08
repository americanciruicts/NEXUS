'use client';

import { useState, useEffect } from 'react';
import { TravelerType } from '@/types';
import { WORK_CENTERS } from '@/data/workCenters';
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

export default function TravelerForm({ mode = 'create', initialData, travelerId }: TravelerFormProps) {
  // Step 1: Select Traveler Type
  const [selectedType, setSelectedType] = useState<TravelerType | ''>(initialData?.traveler_type as TravelerType || '');
  const [showForm, setShowForm] = useState(mode === 'edit' || false);

  const [formData, setFormData] = useState({
    jobNumber: initialData?.job_number || '',
    workOrderNumber: initialData?.work_order_number || '',
    partNumber: initialData?.part_number || '',
    partDescription: initialData?.part_description || '',
    revision: initialData?.revision || '',
    quantity: initialData?.quantity || 0,
    customerCode: initialData?.customer_code || '',
    customerName: initialData?.customer_name || '',
    priority: (initialData?.priority || 'NORMAL') as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    notes: initialData?.notes || '',
    poNumber: '',
    operation: '',
    pageNumber: '1',
    totalPages: '1',
    partRev: '',
    drawingNumber: '',
    specs: initialData?.specs || '',
    specsDate: '',
    fromStock: initialData?.from_stock || '',
    toStock: initialData?.to_stock || '',
    shipVia: initialData?.ship_via || '',
    lot: '',
    dueDate: initialData?.due_date || '',
    shipDate: initialData?.ship_date || '',
    comments: initialData?.comments || ''
  });

  const [formSteps, setFormSteps] = useState<FormStep[]>([]);
  const [isLeadFree, setIsLeadFree] = useState(false);
  const [isITAR, setIsITAR] = useState(false);

  const travelerTypes = [
    { value: 'PCB_ASSEMBLY', label: 'PCB Assembly', color: 'from-blue-500 to-blue-600' },
    { value: 'PCB', label: 'PCB', color: 'from-indigo-500 to-indigo-600' },
    { value: 'CABLE', label: 'Cable', color: 'from-yellow-500 to-yellow-600' },
    { value: 'CABLE_ASSEMBLY', label: 'Cable Assembly', color: 'from-orange-500 to-orange-600' },
    { value: 'PCB_CABLE_ASSEMBLY', label: 'PCB Cable Assembly', color: 'from-purple-500 to-purple-600' },
    { value: 'PARTS', label: 'Parts', color: 'from-green-500 to-green-600' },
    { value: 'ASSEMBLY', label: 'Assembly', color: 'from-pink-500 to-pink-600' }
  ];

  useEffect(() => {
    if (mode === 'edit' && initialData?.process_steps) {
      // Load existing steps for edit mode
      const existingSteps = (initialData.process_steps as Array<Record<string, unknown>>).map((step: Record<string, unknown>, index: number) => ({
        id: String(step.id || index),
        sequence: Number(step.step_number),
        workCenter: String(step.operation),
        instruction: String(step.instructions || ''),
        quantity: Number(step.quantity || 0),
        rejected: Number(step.rejected || 0),
        accepted: Number(step.accepted || 0),
        assign: String(step.sign || ''),
        date: String(step.completed_date || '')
      }));
      setFormSteps(existingSteps);
    } else if (selectedType) {
      loadDefaultSteps(selectedType);
    }
  }, [selectedType, mode, initialData]);

  const loadDefaultSteps = (type: TravelerType) => {
    const defaultSteps: Record<TravelerType, FormStep[]> = {
      PCB_ASSEMBLY: [
        { id: '1', sequence: 1, workCenter: 'ENGINEER', instruction: 'Review PCB assembly specifications', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '2', sequence: 2, workCenter: 'MAKE BOM', instruction: 'Create Bill of Materials', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '3', sequence: 6, workCenter: 'PREPARE', instruction: 'Prepare components', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '4', sequence: 10, workCenter: 'AUTO INSERTION', instruction: 'Automated component insertion', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '5', sequence: 12, workCenter: 'WASH', instruction: 'Wash PCB assembly', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '6', sequence: 16, workCenter: 'MANUAL INNER', instruction: 'Manual inner component placement', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '7', sequence: 30, workCenter: 'WAVE SOLDER', instruction: 'Wave soldering process', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '8', sequence: 32, workCenter: 'WASH', instruction: 'Post-solder cleaning', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '9', sequence: 34, workCenter: 'TRIM', instruction: 'PCB Trim/Cut', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '10', sequence: 36, workCenter: 'VISUAL INSPECTION', instruction: 'Visual inspection', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '11', sequence: 40, workCenter: 'E-TEST', instruction: 'Electrical testing', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '12', sequence: 42, workCenter: 'MANUAL OUTER', instruction: 'Conformal Coating', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '13', sequence: 44, workCenter: 'SUB-ASSY', instruction: 'Cable routing/test/kit', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '14', sequence: 46, workCenter: 'FINAL INSPEC', instruction: 'Final quality inspection', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '15', sequence: 48, workCenter: 'LABELING', instruction: 'Apply labels', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '16', sequence: 50, workCenter: 'PACKAGING', instruction: 'Package for shipment', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '17', sequence: 52, workCenter: 'SHIPPING', instruction: 'Prepare for shipping', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' }
      ],
      PCB: [
        { id: '1', sequence: 1, workCenter: 'ENGINEER', instruction: 'Review PCB specifications', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '2', sequence: 2, workCenter: 'PCB FABRICATION', instruction: 'PCB fabrication process', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '3', sequence: 3, workCenter: 'VISUAL INSPECTION', instruction: 'Visual inspection', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' }
      ],
      CABLE: [
        { id: '1', sequence: 1, workCenter: 'WIRE PREP', instruction: 'Prepare wires and cables', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '2', sequence: 2, workCenter: 'CRIMPING', instruction: 'Crimp connectors', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '3', sequence: 3, workCenter: 'VISUAL INSPECTION', instruction: 'Visual inspection', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' }
      ],
      CABLE_ASSEMBLY: [
        { id: '1', sequence: 1, workCenter: 'WIRE PREP', instruction: 'Prepare wires', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '2', sequence: 2, workCenter: 'CRIMPING', instruction: 'Crimp connectors', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '3', sequence: 3, workCenter: 'CABLE ASSEMBLY', instruction: 'Assemble cable harness', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '4', sequence: 4, workCenter: 'TESTING', instruction: 'Test cable assembly', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '5', sequence: 5, workCenter: 'LABELING', instruction: 'Apply labels', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '6', sequence: 6, workCenter: 'PACKAGING', instruction: 'Package for shipment', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' }
      ],
      PCB_CABLE_ASSEMBLY: [
        { id: '1', sequence: 1, workCenter: 'ENGINEER', instruction: 'Review PCB and cable assembly specifications', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '2', sequence: 2, workCenter: 'ASSEMBLY', instruction: 'PCB assembly', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '3', sequence: 3, workCenter: 'CABLE ASSEMBLY', instruction: 'Cable assembly and routing', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '4', sequence: 4, workCenter: 'TESTING', instruction: 'Integrated testing', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '5', sequence: 5, workCenter: 'FINAL INSPEC', instruction: 'Final quality inspection', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '6', sequence: 6, workCenter: 'PACKAGING', instruction: 'Package for shipment', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' }
      ],
      PARTS: [
        { id: '1', sequence: 1, workCenter: 'ENGINEER', instruction: 'Review parts specifications', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '2', sequence: 2, workCenter: 'PREPARE', instruction: 'Prepare and sort parts', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '3', sequence: 3, workCenter: 'QC', instruction: 'Quality control check', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '4', sequence: 4, workCenter: 'PACKAGING', instruction: 'Package parts', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' }
      ],
      ASSEMBLY: [
        { id: '1', sequence: 1, workCenter: 'ENGINEER', instruction: 'Review assembly specifications', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '2', sequence: 2, workCenter: 'PREPARE', instruction: 'Prepare components', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '3', sequence: 3, workCenter: 'ASSEMBLY', instruction: 'General assembly process', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '4', sequence: 4, workCenter: 'TESTING', instruction: 'Test assembled product', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '5', sequence: 5, workCenter: 'FINAL INSPEC', instruction: 'Final quality inspection', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' },
        { id: '6', sequence: 6, workCenter: 'PACKAGING', instruction: 'Package for shipment', quantity: 0, rejected: 0, accepted: 0, assign: '', date: '' }
      ]
    };

    setFormSteps(defaultSteps[type] || []);
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
    setFormSteps(formSteps.filter(step => step.id !== id));
  };

  const updateStep = (id: string, field: keyof FormStep, value: string | number) => {
    setFormSteps(formSteps.map(step =>
      step.id === id ? { ...step, [field]: value } : step
    ));
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

    // Prepare API payload
    const travelerData = {
      job_number: fullJobNumber,
      work_order_number: formData.workOrderNumber || fullJobNumber,
      traveler_type: travelerTypeMap[selectedType] || 'ASSY',
      part_number: formData.partNumber,
      part_description: formData.partDescription || 'Assembly',
      revision: formData.revision || 'A',
      quantity: parseInt(formData.quantity.toString()) || 1,
      customer_code: formData.customerCode || '',
      customer_name: formData.customerName || '',
      priority: formData.priority || 'NORMAL',
      work_center: formSteps[0]?.workCenter || 'ASSEMBLY',
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
        ? `http://localhost:3002/travelers/${travelerId}`
        : 'http://localhost:3002/travelers/';
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Create New Traveler</h1>
            <p className="text-lg text-gray-600">Select the type of traveler you want to create</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {travelerTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => handleTypeSelect(type.value as TravelerType)}
                className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-gray-100"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${type.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                <div className="p-8 relative z-10">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${type.color} mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                    {type.label.charAt(0)}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{type.label}</h3>
                  <p className="text-sm text-gray-600">Click to create {type.label.toLowerCase()}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Type Badge - NO PRINT */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-6 border-2 border-blue-200 no-print">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold text-lg shadow-md">
                {travelerTypes.find(t => t.value === selectedType)?.label}
              </span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Traveler Form</h2>
                <p className="text-sm text-gray-600">Fill in all required fields</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
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
                <div className="border-2 border-black p-1 bg-white inline-block mb-1">
                  <svg width="120" height="60">
                    <rect x="2" y="5" width="2" height="40" fill="black"/>
                    <rect x="6" y="5" width="1" height="40" fill="black"/>
                    <rect x="9" y="5" width="3" height="40" fill="black"/>
                    <rect x="14" y="5" width="1" height="40" fill="black"/>
                    <rect x="17" y="5" width="2" height="40" fill="black"/>
                    <rect x="21" y="5" width="1" height="40" fill="black"/>
                    <rect x="24" y="5" width="3" height="40" fill="black"/>
                    <rect x="29" y="5" width="2" height="40" fill="black"/>
                    <rect x="33" y="5" width="1" height="40" fill="black"/>
                    <rect x="36" y="5" width="2" height="40" fill="black"/>
                    <text x="60" y="52" fontSize="7" textAnchor="middle" fontWeight="bold">*{formData.jobNumber}{isLeadFree && 'L'}{isITAR && 'M'}*</text>
                  </svg>
                </div>
                <div className="text-xs font-bold">Job: {formData.jobNumber}{isLeadFree && 'L'}{isITAR && 'M'}</div>
                <div className="text-xs">Qty: {formData.quantity}</div>
                <div className="text-xs">Rev: {formData.revision}</div>
              </div>
            </div>

            {/* Right */}
            <div className="space-y-1">
              <div className="flex">
                <span className="font-bold w-20">Part No:</span>
                <span>{formData.partNumber}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-20">Desc:</span>
                <span>{formData.partDescription}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-20">Due Date:</span>
                <span>{formData.dueDate || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form - Page 1 */}
        <div className="bg-white shadow-lg rounded-xl border-2 border-gray-200 p-8 mb-6">
          {/* Top Row - Compact */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
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
                        const response = await fetch(`http://localhost:3002/travelers/work-order/${value}`, {
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
                {isITAR && <span className="px-2 py-1.5 bg-red-100 text-red-800 font-bold rounded text-xs border border-red-300">M</span>}
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">Revision</label>
                  <input
                    type="text"
                    value={formData.revision}
                    onChange={(e) => setFormData({...formData, revision: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                    placeholder="V0.2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Part Revision</label>
                <input
                  type="text"
                  value={formData.partRev}
                  onChange={(e) => setFormData({...formData, partRev: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="V0.2 01/24/24"
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

          {/* Compliance Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300">
            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-green-400 transition-all">
              <input
                type="checkbox"
                id="leadFree"
                checked={isLeadFree}
                onChange={(e) => setIsLeadFree(e.target.checked)}
                className="w-6 h-6 text-green-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
              />
              <label htmlFor="leadFree" className="flex-1 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-green-100 text-green-800 font-bold rounded-lg border-2 border-green-300 text-sm">L</span>
                  <div>
                    <p className="font-bold text-gray-900">Lead Free (RoHS)</p>
                    <p className="text-sm text-gray-600">Lead-free manufacturing process</p>
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-red-400 transition-all">
              <input
                type="checkbox"
                id="itar"
                checked={isITAR}
                onChange={(e) => setIsITAR(e.target.checked)}
                className="w-6 h-6 text-red-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-red-500 cursor-pointer"
              />
              <label htmlFor="itar" className="flex-1 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-red-100 text-red-800 font-bold rounded-lg border-2 border-red-300 text-sm">M</span>
                  <div>
                    <p className="font-bold text-gray-900">ITAR Controlled</p>
                    <p className="text-sm text-gray-600">Export controlled manufacturing</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Specifications - Prominent Section with Date */}
          <div className="mb-6 p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl border-3 border-yellow-300 shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-lg font-bold text-yellow-900 uppercase">Specifications</label>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-bold text-yellow-900">Date:</label>
                <input
                  type="date"
                  value={formData.specsDate}
                  onChange={(e) => setFormData({...formData, specsDate: e.target.value})}
                  className="border-2 border-yellow-400 rounded px-3 py-1.5 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-200"
                />
              </div>
            </div>
            <textarea
              value={formData.specs}
              onChange={(e) => setFormData({...formData, specs: e.target.value})}
              className="w-full border-2 border-yellow-400 rounded-lg px-4 py-3 text-base text-gray-900 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 min-h-[120px] resize-y shadow-inner"
              placeholder="Enter specifications, notes, and special requirements..."
              style={{color: '#000000', backgroundColor: '#ffffff'}}
            />
          </div>

          {/* Stock and Shipping Info */}
          <div className="mb-6 p-5 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border-2 border-green-300">
            <h3 className="text-sm font-bold text-green-900 mb-3 uppercase">Stock &amp; Shipping Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-green-900 mb-2">From Stock</label>
                <input
                  type="text"
                  value={formData.fromStock}
                  onChange={(e) => setFormData({...formData, fromStock: e.target.value})}
                  className="w-full border-2 border-green-300 rounded-lg px-4 py-3 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  placeholder="Location..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-green-900 mb-2">To Stock</label>
                <input
                  type="text"
                  value={formData.toStock}
                  onChange={(e) => setFormData({...formData, toStock: e.target.value})}
                  className="w-full border-2 border-green-300 rounded-lg px-4 py-3 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  placeholder="Location..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-green-900 mb-2">Ship Via</label>
                <input
                  type="text"
                  value={formData.shipVia}
                  onChange={(e) => setFormData({...formData, shipVia: e.target.value})}
                  className="w-full border-2 border-green-300 rounded-lg px-4 py-3 text-base focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  placeholder="Shipping method..."
                />
              </div>
            </div>
          </div>

          {/* Process Steps - Card-Based Layout */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-900 uppercase">Process Steps (Routing)</h3>
              <button
                onClick={addNewStep}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-md"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Step</span>
              </button>
            </div>

            <div className="space-y-4">
              {formSteps.map((step, index) => (
                <div key={step.id} className="bg-white border-2 border-gray-300 rounded-xl p-5 hover:border-blue-400 hover:shadow-lg transition-all">
                  {/* Step Header */}
                  <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-gray-200">
                    <div className="flex items-center space-x-3">
                      <span className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg text-lg">
                        Step {index + 1}
                      </span>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs font-bold text-gray-600">Sequence:</label>
                        <input
                          type="number"
                          value={step.sequence}
                          onChange={(e) => updateStep(step.id, 'sequence', parseInt(e.target.value) || 0)}
                          className="w-20 border-2 border-gray-300 rounded px-2 py-1 text-sm font-bold text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeStep(step.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                      title="Remove step"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Step Fields - ALIGNED COLUMNS */}
                  <div className="space-y-4">
                    {/* Row 1: Work Center and Metrics in aligned columns */}
                    <div className="grid grid-cols-12 gap-3 items-start">
                      <div className="col-span-3">
                        <label className="block text-xs font-bold text-gray-700 mb-2">Work Center</label>
                        <select
                          value={step.workCenter}
                          onChange={(e) => updateStep(step.id, 'workCenter', e.target.value)}
                          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="">Select Work Center...</option>
                          {WORK_CENTERS.map(wc => (
                            <option key={wc} value={wc}>{wc}</option>
                          ))}
                        </select>
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
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <p className="text-gray-600 font-medium">No process steps yet. Click &quot;Add Step&quot; to create one.</p>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section - Prominent */}
          <div className="mb-6 p-6 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border-3 border-orange-300 shadow-lg">
            <label className="block text-xl font-bold text-orange-900 mb-3 uppercase">Comments &amp; Notes</label>
            <textarea
              value={formData.comments}
              onChange={(e) => setFormData({...formData, comments: e.target.value})}
              className="w-full border-2 border-orange-300 rounded-lg px-4 py-3 text-base text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 min-h-[150px] resize-y shadow-inner"
              placeholder="Enter any additional comments, notes, quality issues, or special instructions..."
              style={{color: '#000000', backgroundColor: '#ffffff', fontSize: '1rem', lineHeight: '1.6'}}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
          >
            <PrinterIcon className="h-5 w-5" />
            <span>Print Traveler</span>
          </button>

          <button
            onClick={generateBarcode}
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
          >
            <QrCodeIcon className="h-5 w-5" />
            <span>Generate Barcode</span>
          </button>

          <button
            onClick={handleSubmit}
            className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold transition-colors shadow-lg text-lg"
          >
            <span>{mode === 'create' ? 'Create Traveler' : 'Update Traveler'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
