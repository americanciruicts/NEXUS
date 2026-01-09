'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { PlusIcon, EyeIcon, PencilIcon, PrinterIcon, TrashIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
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

type TravelerItem = {
  id: string;
  dbId: number;
  jobNumber: string;
  workOrder: string;
  partNumber: string;
  description: string;
  revision: string;
  quantity: number;
  customerCode: string;
  customerName: string;
  status: string;
  currentStep: string;
  progress: number;
  createdAt: string;
  dueDate: string;
  specs: string;
  fromStock: string;
  toStock: string;
  shipVia: string;
  comments: string;
  isActive: boolean;
  includeLaborHours: boolean;
};

const initialTravelers: TravelerItem[] = [];

export default function TravelersPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [customerFilter, setCustomerFilter] = useState('All Customers');
  const [travelers, setTravelers] = useState<typeof initialTravelers>([]);

  // Load travelers from API on mount
  useEffect(() => {
    const fetchTravelers = async () => {
      try {
        const response = await fetch('http://acidashboard.aci.local:100/api/travelers/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Show ALL travelers (active and inactive)
          // Transform API data to match frontend format
          const formattedTravelers = data.map((t: Record<string, unknown>) => ({
            id: String(t.job_number),
            dbId: Number(t.id),
            jobNumber: String(t.job_number),
            workOrder: String(t.work_order_number || ''),
            partNumber: String(t.part_number),
            description: String(t.part_description),
            revision: String(t.revision),
            quantity: Number(t.quantity),
            customerCode: String(t.customer_code || ''),
            customerName: String(t.customer_name || ''),
            status: String(t.status),
            currentStep: t.process_steps && Array.isArray(t.process_steps) && (t.process_steps as Array<{ operation: string; is_completed: boolean }>).length > 0
              ? (t.process_steps as Array<{ operation: string; is_completed: boolean }>).find(s => !s.is_completed)?.operation || 'COMPLETED'
              : 'PENDING',
            progress: t.process_steps && Array.isArray(t.process_steps) && (t.process_steps as Array<{ is_completed: boolean }>).length > 0
              ? Math.round(((t.process_steps as Array<{ is_completed: boolean }>).filter(s => s.is_completed).length / (t.process_steps as Array<{ is_completed: boolean }>).length) * 100)
              : 0,
            createdAt: String(t.created_at || ''),
            dueDate: String(t.due_date || ''),
            specs: String(t.specs || ''),
            fromStock: String(t.from_stock || ''),
            toStock: String(t.to_stock || ''),
            shipVia: String(t.ship_via || ''),
            comments: String(t.comments || ''),
            isActive: Boolean(t.is_active !== false),
            includeLaborHours: Boolean(t.include_labor_hours)
          }));

          // Remove duplicates based on job number + work order + revision combination
          // Keep travelers if they have different work order OR different revision
          // This allows multiple travelers with same job number but different WO or rev
          const uniqueTravelers = formattedTravelers.reduce((acc: typeof formattedTravelers, current: typeof formattedTravelers[0]) => {
            const exists = acc.find((item: typeof formattedTravelers[0]) =>
              item.jobNumber === current.jobNumber &&
              item.workOrder === current.workOrder &&
              item.revision === current.revision
            );
            if (!exists) {
              acc.push(current);
            }
            return acc;
          }, [] as typeof formattedTravelers);

          // Always set travelers, even if empty
          setTravelers(uniqueTravelers);
        } else {
          console.error('Failed to fetch travelers');
        }
      } catch (error) {
        console.error('Error fetching travelers:', error);
      }
    };

    fetchTravelers();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'ON_HOLD':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    return 'bg-blue-500';
  };

  const handlePrintTraveler = (travelerId: string) => {
    alert(`🖨️ Printing Traveler #${travelerId}...\n\nThe traveler document is being sent to the printer.`);
    // In production, this would open a print dialog or send to printer
    window.open(`/travelers/${travelerId}`, '_blank');
  };

  const handleDeleteTraveler = async (travelerId: string, travelerDbId: number) => {
    console.log('Delete button clicked for:', { travelerId, travelerDbId });

    if (!confirm(`⚠️ Are you sure you want to delete Traveler #${travelerId}?\n\nThis action cannot be undone.`)) {
      console.log('Delete cancelled by user');
      return;
    }

    try {
      console.log(`Sending DELETE request to: http://acidashboard.aci.local:100/api/travelers/${travelerDbId}`);

      const response = await fetch(`http://acidashboard.aci.local:100/api/travelers/${travelerDbId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Delete response status:', response.status);

      if (response.ok) {
        const result = await response.json().catch(() => ({ message: 'Deleted' }));
        console.log('Delete successful:', result);

        // Remove from local state
        setTravelers(travelers.filter(t => t.dbId !== travelerDbId));
        alert(`✅ Traveler #${travelerId} has been deleted successfully!`);

        // Reload the page to refresh the list
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Delete failed:', errorData);
        throw new Error(errorData.detail || 'Failed to delete traveler');
      }
    } catch (error) {
      console.error('Error deleting traveler:', error);
      alert(`❌ Error deleting traveler\n\n${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  // Filter travelers based on search and filters
  const filteredTravelers = travelers.filter(traveler => {
    const matchesSearch = searchTerm === '' ||
      traveler.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      traveler.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      traveler.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All Statuses' ||
      traveler.status === statusFilter.toUpperCase().replace(' ', '_');

    const matchesCustomer = customerFilter === 'All Customers' ||
      traveler.customerName === customerFilter;

    return matchesSearch && matchesStatus && matchesCustomer;
  });

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
        <div className="w-full space-y-4 p-4 lg:p-6">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 shadow-lg rounded-lg p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Travelers</h1>
                <p className="text-sm text-blue-100">Manage manufacturing travelers and work orders</p>
              </div>
              {user?.role !== 'OPERATOR' && (
                <Link
                  href="/travelers/new"
                  className="inline-flex items-center px-4 py-2.5 bg-white text-purple-600 text-sm font-medium rounded-lg hover:bg-purple-50 transition-colors shadow-md"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  <span>New Traveler</span>
                </Link>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                >
                  <option>All Statuses</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>On Hold</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer</label>
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option>All Customers</option>
                  <option>ACME Corporation</option>
                  <option>TechCorp Inc</option>
                  <option>Electronics Plus</option>
                  <option>Industrial Solutions</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                <input
                  type="date"
                  className="w-full border-2 border-green-200 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Job #, Part #, Description..."
                  className="w-full border-2 border-orange-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Travelers List */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden border-2 border-purple-100">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b-2 border-purple-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                All Travelers ({filteredTravelers.length})
              </h2>
            </div>

            <div className="overflow-visible">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                      Job # / WO
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                      Part Info
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[35%]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTravelers.map((traveler) => (
                    <tr key={traveler.id} className="hover:bg-purple-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{traveler.jobNumber}</div>
                      <div className="text-xs text-gray-500">{traveler.workOrder}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 truncate">{traveler.partNumber}</div>
                      <div className="text-xs text-gray-500 truncate">{traveler.description}</div>
                      <div className="text-xs text-gray-500">Rev: {traveler.revision} | Qty: {traveler.quantity}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{traveler.customerName || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDateDisplay(traveler.dueDate) || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        traveler.isActive
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-50 text-gray-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                          traveler.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`}></span>
                        {traveler.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex items-center justify-end space-x-1.5">
                        <Link
                          href={`/travelers/${traveler.id}`}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="h-3.5 w-3.5 mr-1" />
                          View
                        </Link>
                        {user?.role !== 'OPERATOR' && (
                          <>
                            <Link
                              href={`/travelers/${traveler.id}/edit`}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Link>
                            <button
                              onClick={() => handlePrintTraveler(traveler.id)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                              title="Print Traveler"
                            >
                              <PrinterIcon className="h-3.5 w-3.5 mr-1" />
                              Print
                            </button>
                            <Link
                              href={`/travelers/clone/${traveler.id}`}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors"
                              title="Clone Traveler"
                            >
                              <DocumentDuplicateIcon className="h-3.5 w-3.5 mr-1" />
                              Clone
                            </Link>
                            <button
                              onClick={async () => {
                                try {
                                  const newActiveStatus = !traveler.isActive;
                                  console.log(`Toggling traveler ${traveler.dbId} from ${traveler.isActive} to ${newActiveStatus}`);

                                  const response = await fetch(`http://acidashboard.aci.local:100/api/travelers/${traveler.dbId}`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
                                    },
                                    body: JSON.stringify({ is_active: newActiveStatus })
                                  });

                                  if (response.ok) {
                                    const result = await response.json();
                                    console.log('Update response:', result);

                                    // Update local state
                                    setTravelers(travelers.map(t =>
                                      t.id === traveler.id ? { ...t, isActive: newActiveStatus } : t
                                    ));
                                    alert(`✅ Traveler ${traveler.jobNumber} is now ${newActiveStatus ? 'ACTIVE' : 'INACTIVE'}`);
                                  } else {
                                    const error = await response.json();
                                    console.error('Update failed:', error);
                                    alert(`❌ Failed to update: ${error.detail || 'Unknown error'}`);
                                  }
                                } catch (error) {
                                  console.error('Error toggling active status:', error);
                                  alert('❌ Failed to update traveler status');
                                }
                              }}
                              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                                traveler.isActive
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                  : 'text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-300'
                              }`}
                              title={traveler.isActive ? 'Mark as Inactive' : 'Mark as Active'}
                            >
                              <svg className="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d={traveler.isActive
                                    ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  }
                                />
                              </svg>
                              {traveler.isActive ? 'Active' : 'Inactive'}
                            </button>
                            <button
                              onClick={() => handleDeleteTraveler(traveler.id, traveler.dbId)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
                              title="Delete Traveler"
                            >
                              <TrashIcon className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
