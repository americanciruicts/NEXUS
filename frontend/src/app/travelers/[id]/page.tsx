'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { ArrowLeftIcon, PrinterIcon, CheckIcon, XMarkIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { WORK_CENTERS } from '@/data/workCenters';

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
  status: string;
  assignee: string;
}

interface Traveler {
  id: string;
  jobNumber: string;
  workOrder: string;
  partNumber: string;
  description: string;
  revision: string;
  quantity: number;
  customerCode: string;
  customerName: string;
  status: string;
  createdAt: string;
  dueDate: string;
  shipDate: string;
  specs: string;
  specsDate: string;
  fromStock: string;
  toStock: string;
  shipVia: string;
  comments: string;
  steps: ProcessStep[];
}

export default function TravelerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const travelerId = params.id as string;

  const [traveler, setTraveler] = useState<Traveler | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTraveler, setEditedTraveler] = useState<Traveler | null>(null);

  // Load traveler from API
  useEffect(() => {
    const fetchTraveler = async () => {
      try {
        const response = await fetch(`http://localhost:3002/travelers/by-job/${travelerId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const formattedTraveler = {
            id: String(data.job_number),
            jobNumber: String(data.job_number),
            workOrder: String(data.work_order_number || ''),
            partNumber: String(data.part_number),
            description: String(data.part_description),
            revision: String(data.revision),
            quantity: Number(data.quantity),
            customerCode: String(data.customer_code || ''),
            customerName: String(data.customer_name || ''),
            status: String(data.status),
            createdAt: new Date(data.created_at).toLocaleDateString(),
            dueDate: String(data.due_date || ''),
            shipDate: String(data.ship_date || ''),
            specs: String(data.specs || ''),
            specsDate: String(data.specs_date || ''),
            fromStock: String(data.from_stock || ''),
            toStock: String(data.to_stock || ''),
            shipVia: String(data.ship_via || ''),
            comments: String(data.comments || ''),
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
            }))
          };
          setTraveler(formattedTraveler);
          setEditedTraveler(formattedTraveler);
        } else {
          console.error('Failed to fetch traveler');
        }
      } catch (error) {
        console.error('Error fetching traveler:', error);
      } finally {
        setIsLoading(false);
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
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedTraveler(traveler);
  };

  const handleSave = async () => {
    if (!editedTraveler) return;

    try {
      const response = await fetch(`http://localhost:3002/travelers/${travelerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
        },
        body: JSON.stringify({
          job_number: editedTraveler.jobNumber,
          work_order_number: editedTraveler.workOrder,
          part_number: editedTraveler.partNumber,
          part_description: editedTraveler.description,
          revision: editedTraveler.revision,
          quantity: editedTraveler.quantity,
          customer_code: editedTraveler.customerCode,
          customer_name: editedTraveler.customerName,
          due_date: editedTraveler.dueDate,
          ship_date: editedTraveler.shipDate,
          specs: editedTraveler.specs,
          specs_date: editedTraveler.specsDate,
          from_stock: editedTraveler.fromStock,
          to_stock: editedTraveler.toStock,
          ship_via: editedTraveler.shipVia,
          comments: editedTraveler.comments,
          traveler_type: 'ASSY',
          priority: 'NORMAL',
          work_center: 'ASSEMBLY',
          notes: '',
          process_steps: editedTraveler.steps.map(step => ({
            step_number: step.seq,
            operation: step.workCenter,
            work_center_code: step.workCenter.replace(/\s+/g, '_').toUpperCase(),
            instructions: step.instruction,
            estimated_time: 30,
            is_required: true,
            quantity: step.quantity || null,
            accepted: step.accepted || null,
            rejected: step.rejected || null,
            sign: step.sign || null,
            completed_date: step.completedDate || null,
            sub_steps: []
          })),
          manual_steps: []
        })
      });

      if (response.ok) {
        setTraveler(editedTraveler);
        setIsEditing(false);
        alert('✅ Traveler updated successfully!');
      } else {
        throw new Error('Failed to update traveler');
      }
    } catch (error) {
      console.error('Error updating traveler:', error);
      alert('❌ Error updating traveler. Please try again.');
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
    setEditedTraveler({ ...editedTraveler, steps: newSteps });
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
    setEditedTraveler({ ...editedTraveler, steps: newSteps });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600">Loading traveler...</div>
        </div>
      </Layout>
    );
  }

  if (!traveler || !editedTraveler) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-red-600">Traveler not found</div>
        </div>
      </Layout>
    );
  }

  const displayTraveler = isEditing ? editedTraveler : traveler;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
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
        <div className="bg-white shadow-lg border-2 border-black">
          {/* Header Section */}
          <div className="bg-gray-100 border-b-2 border-black p-3">
            <div className="grid grid-cols-3 gap-4 text-xs">
              {/* Left */}
              <div className="space-y-1">
                <div className="flex">
                  <span className="font-bold w-24">Cust. Code:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.customerCode}
                      onChange={(e) => updateField('customerCode', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs"
                    />
                  ) : (
                    <span className="text-xs">{displayTraveler.customerCode || '-'}</span>
                  )}
                </div>
                <div className="flex">
                  <span className="font-bold w-24">Cust. Name:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.customerName}
                      onChange={(e) => updateField('customerName', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs"
                    />
                  ) : (
                    <span className="text-xs">{displayTraveler.customerName || '-'}</span>
                  )}
                </div>
                <div className="flex">
                  <span className="font-bold w-24">Work Order:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.workOrder}
                      onChange={(e) => updateField('workOrder', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs"
                    />
                  ) : (
                    <span className="text-xs">{displayTraveler.workOrder || '-'}</span>
                  )}
                </div>
              </div>

              {/* Center - Barcode with Details */}
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="border-2 border-black p-1 bg-white inline-block mb-1">
                    <svg width="100" height="50" className="mx-auto">
                      <rect x="2" y="5" width="2" height="30" fill="black"/>
                      <rect x="6" y="5" width="1" height="30" fill="black"/>
                      <rect x="9" y="5" width="3" height="30" fill="black"/>
                      <rect x="14" y="5" width="1" height="30" fill="black"/>
                      <rect x="17" y="5" width="2" height="30" fill="black"/>
                      <rect x="21" y="5" width="1" height="30" fill="black"/>
                      <rect x="24" y="5" width="3" height="30" fill="black"/>
                      <rect x="29" y="5" width="2" height="30" fill="black"/>
                      <rect x="33" y="5" width="1" height="30" fill="black"/>
                      <rect x="36" y="5" width="2" height="30" fill="black"/>
                      <text x="50" y="42" fontSize="6" textAnchor="middle" fontWeight="bold">*{displayTraveler.jobNumber}*</text>
                    </svg>
                  </div>
                  <div className="text-xs font-bold">Job: {displayTraveler.jobNumber}</div>
                  <div className="text-xs">Qty: {displayTraveler.quantity}</div>
                  <div className="text-xs">Rev: {displayTraveler.revision}</div>
                </div>
              </div>

              {/* Right */}
              <div className="space-y-1">
                <div className="flex">
                  <span className="font-bold w-20">Part No:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.partNumber}
                      onChange={(e) => updateField('partNumber', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs"
                    />
                  ) : (
                    <span className="text-xs">{displayTraveler.partNumber}</span>
                  )}
                </div>
                <div className="flex">
                  <span className="font-bold w-20">Desc:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTraveler.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs"
                    />
                  ) : (
                    <span className="text-xs">{displayTraveler.description}</span>
                  )}
                </div>
                <div className="flex">
                  <span className="font-bold w-20">Due Date:</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedTraveler.dueDate}
                      onChange={(e) => updateField('dueDate', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs"
                    />
                  ) : (
                    <span className="text-xs">{displayTraveler.dueDate || '-'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Specifications Section */}
          <div className="border-b-2 border-black">
            <div className="bg-yellow-200 border-b border-black px-2 py-1 flex justify-between items-center">
              <h2 className="font-bold text-sm">SPECIFICATIONS</h2>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs">Date:</span>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedTraveler.specsDate}
                    onChange={(e) => updateField('specsDate', e.target.value)}
                    className="border border-black rounded px-1 py-0.5 text-xs"
                  />
                ) : (
                  <span className="text-xs">{displayTraveler.specsDate || '-'}</span>
                )}
              </div>
            </div>
            <div className="bg-yellow-50 p-2 min-h-[60px]">
              {isEditing ? (
                <textarea
                  value={editedTraveler.specs}
                  onChange={(e) => updateField('specs', e.target.value)}
                  className="w-full p-1 border border-gray-300 rounded min-h-[50px] text-xs"
                  placeholder="Enter specifications..."
                />
              ) : (
                <div className="whitespace-pre-wrap text-xs">{displayTraveler.specs || '-'}</div>
              )}
            </div>
          </div>

          {/* Routing Section */}
          <div className="border-b-2 border-black">
            <div className="bg-blue-200 border-b border-black px-2 py-1 flex justify-between items-center">
              <h2 className="font-bold text-sm">ROUTING</h2>
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
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-200 border-b border-black">
                  <th className="border-r border-black px-2 py-1 w-12 text-center font-bold">SEQ</th>
                  <th className="border-r border-black px-2 py-1 w-32 text-left font-bold">WORK CENTER</th>
                  <th className="border-r border-black px-2 py-1 text-left font-bold">INSTRUCTIONS</th>
                  <th className="border-r border-black px-2 py-1 w-16 text-center font-bold">QTY</th>
                  <th className="border-r border-black px-2 py-1 w-16 text-center font-bold">REJ</th>
                  <th className="border-r border-black px-2 py-1 w-16 text-center font-bold">ACC</th>
                  <th className="px-2 py-1 w-24 text-center font-bold">DATE</th>
                </tr>
              </thead>
              <tbody>
                {displayTraveler.steps.map((step, index) => (
                  <tr key={index} className="border-b border-gray-300">
                    {isEditing ? (
                      <>
                        <td className="border-r border-gray-300 px-1 py-1 text-center">
                          <input
                            type="number"
                            value={step.seq}
                            onChange={(e) => updateStep(index, 'seq', parseInt(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded px-1 py-0.5 text-center text-xs"
                          />
                        </td>
                        <td className="border-r border-gray-300 px-1 py-1">
                          <select
                            value={step.workCenter}
                            onChange={(e) => updateStep(index, 'workCenter', e.target.value)}
                            className="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
                          >
                            <option value="">Select...</option>
                            {WORK_CENTERS.map(wc => (
                              <option key={wc} value={wc}>{wc}</option>
                            ))}
                          </select>
                        </td>
                        <td className="border-r border-gray-300 px-1 py-1">
                          <textarea
                            value={step.instruction}
                            onChange={(e) => updateStep(index, 'instruction', e.target.value)}
                            className="w-full border border-gray-300 rounded px-1 py-0.5 min-h-[40px] text-xs"
                            placeholder="Enter instructions..."
                          />
                        </td>
                        <td className="border-r border-gray-300 px-1 py-1">
                          <input
                            type="text"
                            value={step.quantity}
                            onChange={(e) => updateStep(index, 'quantity', e.target.value)}
                            className="w-full border border-gray-300 rounded px-1 py-0.5 text-center text-xs"
                          />
                        </td>
                        <td className="border-r border-gray-300 px-1 py-1">
                          <input
                            type="text"
                            value={step.rejected}
                            onChange={(e) => updateStep(index, 'rejected', e.target.value)}
                            className="w-full border border-gray-300 rounded px-1 py-0.5 text-center text-xs"
                          />
                        </td>
                        <td className="border-r border-gray-300 px-1 py-1">
                          <input
                            type="text"
                            value={step.accepted}
                            onChange={(e) => updateStep(index, 'accepted', e.target.value)}
                            className="w-full border border-gray-300 rounded px-1 py-0.5 text-center text-xs"
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
                        <td className="border-r border-gray-300 px-1 py-0.5 text-center font-bold text-sm">{step.seq}</td>
                        <td className="border-r border-gray-300 px-1 py-0.5 font-semibold text-xs">{step.workCenter}</td>
                        <td className="border-r border-gray-300 px-1 py-0.5 text-xs">{step.instruction || '-'}</td>
                        <td className="border-r border-gray-300 px-1 py-0.5 text-center text-xs">{step.quantity || ''}</td>
                        <td className="border-r border-gray-300 px-1 py-0.5 text-center text-xs">{step.rejected || ''}</td>
                        <td className="border-r border-gray-300 px-1 py-0.5 text-center text-xs">{step.accepted || ''}</td>
                        <td className="px-1 py-0.5 text-center text-xs">{step.completedDate || ''}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Bottom Info */}
            <div className="bg-gray-50 px-2 py-2 grid grid-cols-2 gap-4 text-xs">
              <div className="flex">
                <span className="font-bold w-24">From Stock:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTraveler.fromStock}
                    onChange={(e) => updateField('fromStock', e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs"
                  />
                ) : (
                  <span className="border-b border-black flex-1 px-1">{displayTraveler.fromStock || ''}</span>
                )}
              </div>
              <div className="flex">
                <span className="font-bold w-24">Ship Via:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTraveler.shipVia}
                    onChange={(e) => updateField('shipVia', e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-xs"
                  />
                ) : (
                  <span className="border-b border-black flex-1 px-1">{displayTraveler.shipVia || ''}</span>
                )}
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="border-b-2 border-black">
            <div className="bg-orange-200 border-b border-black px-2 py-1">
              <h2 className="font-bold text-sm">COMMENTS & NOTES</h2>
            </div>
            <div className="bg-orange-50 p-2 min-h-[60px]">
              {isEditing ? (
                <textarea
                  value={editedTraveler.comments}
                  onChange={(e) => updateField('comments', e.target.value)}
                  className="w-full p-1 border border-gray-300 rounded min-h-[50px] text-xs"
                  placeholder="Enter comments..."
                />
              ) : (
                <div className="whitespace-pre-wrap text-xs">{displayTraveler.comments || '-'}</div>
              )}
            </div>
          </div>

          {/* Labor Hours Section */}
          <div>
            <div className="bg-purple-200 border-b border-black px-2 py-1">
              <h2 className="font-bold text-sm">LABOR HOURS TRACKING</h2>
            </div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-purple-100 border-b border-black">
                  <th className="border-r border-black px-2 py-1 text-left font-bold">OPERATOR NAME</th>
                  <th className="border-r border-black px-2 py-1 w-32 text-center font-bold">START TIME</th>
                  <th className="border-r border-black px-2 py-1 w-32 text-center font-bold">END TIME</th>
                  <th className="px-2 py-1 w-28 text-center font-bold">TOTAL HOURS</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
                  <tr key={row} className="border-b border-gray-300">
                    <td className="border-r border-gray-300 px-2 py-6 min-h-[70px]"></td>
                    <td className="border-r border-gray-300 px-2 py-6 min-h-[70px]"></td>
                    <td className="border-r border-gray-300 px-2 py-6 min-h-[70px]"></td>
                    <td className="px-2 py-6 min-h-[70px]"></td>
                  </tr>
                ))}
                <tr className="bg-purple-200">
                  <td colSpan={2} className="border-r border-black px-2 py-2 text-right font-bold">TOTAL HOURS:</td>
                  <td className="border-r border-black px-2 py-2"></td>
                  <td className="px-2 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
