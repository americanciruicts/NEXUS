'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  PrinterIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
  DocumentArrowDownIcon,
  CheckIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';

const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
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

export default function TravelersPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [viewFilter, setViewFilter] = useState<'active' | 'archived' | 'drafts' | 'all'>('all');
  const [travelers, setTravelers] = useState<TravelerItem[]>([]);
  const [selectedTravelers, setSelectedTravelers] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTravelers();
  }, []);

  const fetchTravelers = async () => {
    try {
      const response = await fetch('http://acidashboard.aci.local:100/api/travelers/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
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
          currentStep: 'PENDING',
          progress: 0,
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
        setTravelers(formattedTravelers);
      }
    } catch (error) {
      console.error('Error fetching travelers:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; bg: string; text: string }> = {
      'DRAFT': { color: 'border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50', bg: 'bg-amber-100', text: 'text-amber-800' },
      'CREATED': { color: 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50', bg: 'bg-blue-100', text: 'text-blue-800' },
      'IN_PROGRESS': { color: 'border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50', bg: 'bg-purple-100', text: 'text-purple-800' },
      'COMPLETED': { color: 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50', bg: 'bg-green-100', text: 'text-green-800' },
      'ON_HOLD': { color: 'border-orange-300 bg-gradient-to-r from-orange-50 to-red-50', bg: 'bg-orange-100', text: 'text-orange-800' },
      'CANCELLED': { color: 'border-red-300 bg-gradient-to-r from-red-50 to-rose-50', bg: 'bg-red-100', text: 'text-red-800' },
      'ARCHIVED': { color: 'border-gray-300 bg-gradient-to-r from-gray-50 to-slate-50', bg: 'bg-gray-100', text: 'text-gray-800' }
    };

    const config = statusConfig[status] || statusConfig['CREATED'];
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2 ${config.color} ${config.text} shadow-sm`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const filteredTravelers = travelers.filter(t => {
    const matchesSearch = t.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All Statuses' || t.status === statusFilter;

    const matchesView =
      (viewFilter === 'active' && t.isActive && t.status !== 'ARCHIVED' && t.status !== 'DRAFT') ||
      (viewFilter === 'archived' && t.status === 'ARCHIVED') ||
      (viewFilter === 'drafts' && t.status === 'DRAFT') ||
      (viewFilter === 'all');

    return matchesSearch && matchesStatus && matchesView;
  });

  const toggleSelectTraveler = (dbId: number) => {
    if (selectedTravelers.includes(dbId)) {
      setSelectedTravelers(selectedTravelers.filter(id => id !== dbId));
    } else {
      setSelectedTravelers([...selectedTravelers, dbId]);
    }
  };

  const selectAll = () => {
    if (selectedTravelers.length === filteredTravelers.length) {
      setSelectedTravelers([]);
    } else {
      setSelectedTravelers(filteredTravelers.map(t => t.dbId));
    }
  };

  const archiveSelected = async () => {
    if (selectedTravelers.length === 0) {
      alert('❌ Please select travelers to archive');
      return;
    }

    if (!confirm(`Are you sure you want to archive ${selectedTravelers.length} traveler(s)?`)) return;

    try {
      const token = localStorage.getItem('nexus_token');
      await Promise.all(
        selectedTravelers.map(id =>
          fetch(`http://acidashboard.aci.local:100/api/travelers/${id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'ARCHIVED' })
          })
        )
      );

      alert(`✅ Archived ${selectedTravelers.length} traveler(s)!`);
      setSelectedTravelers([]);
      fetchTravelers();
    } catch (error) {
      console.error('Error archiving travelers:', error);
      alert('❌ Failed to archive travelers');
    }
  };

  const restoreSelected = async () => {
    if (selectedTravelers.length === 0) {
      alert('❌ Please select travelers to restore');
      return;
    }

    if (!confirm(`Are you sure you want to restore ${selectedTravelers.length} traveler(s)?`)) return;

    try {
      const token = localStorage.getItem('nexus_token');
      await Promise.all(
        selectedTravelers.map(id =>
          fetch(`http://acidashboard.aci.local:100/api/travelers/${id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'CREATED', is_active: true })
          })
        )
      );

      alert(`✅ Restored ${selectedTravelers.length} traveler(s)!`);
      setSelectedTravelers([]);
      fetchTravelers();
    } catch (error) {
      console.error('Error restoring travelers:', error);
      alert('❌ Failed to restore travelers');
    }
  };

  const deleteSelected = async () => {
    if (selectedTravelers.length === 0) {
      alert('❌ Please select travelers to delete');
      return;
    }

    if (!confirm(`⚠️ WARNING: This will permanently delete ${selectedTravelers.length} traveler(s)!\n\nThis action cannot be undone. Are you sure?`)) return;

    try {
      const token = localStorage.getItem('nexus_token');
      await Promise.all(
        selectedTravelers.map(id =>
          fetch(`http://acidashboard.aci.local:100/api/travelers/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        )
      );

      alert(`✅ Deleted ${selectedTravelers.length} traveler(s)!`);
      setSelectedTravelers([]);
      fetchTravelers();
    } catch (error) {
      console.error('Error deleting travelers:', error);
      alert('❌ Failed to delete travelers');
    }
  };

  const exportSelectedPDFs = async () => {
    if (selectedTravelers.length === 0) {
      alert('❌ Please select travelers to export');
      return;
    }

    alert(`📄 Exporting ${selectedTravelers.length} traveler(s) as PDFs...\n\nEach traveler will open in a new window for printing.\nPlease use your browser's print dialog to save as PDF.`);

    // Open each traveler in a new window for printing
    selectedTravelers.forEach((dbId, index) => {
      setTimeout(() => {
        window.open(`/travelers/${dbId}?print=true`, `_blank`);
      }, index * 500); // Stagger to avoid browser blocking
    });
  };

  const stats = {
    total: travelers.length,
    active: travelers.filter(t => t.isActive && t.status !== 'ARCHIVED' && t.status !== 'DRAFT').length,
    drafts: travelers.filter(t => t.status === 'DRAFT').length,
    archived: travelers.filter(t => t.status === 'ARCHIVED').length
  };

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        {/* Header with Stats */}
        <div className="mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">📋 Travelers Management</h1>
              <p className="text-blue-100">Manage production travelers and track progress</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/30">
                <div className="text-2xl font-bold">{stats.active}</div>
                <div className="text-xs text-blue-100">Active</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/30">
                <div className="text-2xl font-bold">{stats.drafts}</div>
                <div className="text-xs text-blue-100">Drafts</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/30">
                <div className="text-2xl font-bold">{stats.archived}</div>
                <div className="text-xs text-blue-100">Archived</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="mb-6 bg-white rounded-xl shadow-lg border-2 border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <input
                type="text"
                placeholder="Search by job number, part number, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* View Filter Tabs */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              {(['active', 'drafts', 'archived', 'all'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setViewFilter(view)}
                  className={`px-4 py-2 rounded-md font-semibold transition-all ${
                    viewFilter === view
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>

            {/* Create Button */}
            <Link
              href="/travelers/new"
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold shadow-md transition-all"
            >
              <PlusIcon className="h-5 w-5" />
              <span>New Traveler</span>
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 pt-4 border-t-2 border-gray-200 flex flex-wrap items-center gap-3">
            <button
              onClick={selectAll}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold shadow-md"
            >
              <CheckIcon className="h-5 w-5" />
              <span>{selectedTravelers.length === filteredTravelers.length ? 'Deselect All' : 'Select All'}</span>
            </button>

            <button
              onClick={exportSelectedPDFs}
              disabled={selectedTravelers.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold shadow-md disabled:cursor-not-allowed"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              <span>Export PDFs ({selectedTravelers.length})</span>
            </button>

            {viewFilter !== 'archived' && (
              <button
                onClick={archiveSelected}
                disabled={selectedTravelers.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg font-semibold shadow-md disabled:cursor-not-allowed"
              >
                <ArchiveBoxIcon className="h-5 w-5" />
                <span>Archive ({selectedTravelers.length})</span>
              </button>
            )}

            {viewFilter === 'archived' && (
              <button
                onClick={restoreSelected}
                disabled={selectedTravelers.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold shadow-md disabled:cursor-not-allowed"
              >
                <ArchiveBoxXMarkIcon className="h-5 w-5" />
                <span>Restore ({selectedTravelers.length})</span>
              </button>
            )}

            <button
              onClick={deleteSelected}
              disabled={selectedTravelers.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold shadow-md disabled:cursor-not-allowed"
            >
              <TrashIcon className="h-5 w-5" />
              <span>Delete ({selectedTravelers.length})</span>
            </button>
          </div>
        </div>

        {/* Travelers Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredTravelers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-gray-200">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No Travelers Found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredTravelers.map((traveler) => (
              <div
                key={traveler.dbId}
                className={`bg-white rounded-xl shadow-lg border-2 ${
                  selectedTravelers.includes(traveler.dbId)
                    ? 'border-blue-500 ring-4 ring-blue-200'
                    : 'border-gray-200'
                } p-6 transition-all hover:shadow-xl`}
              >
                <div className="flex items-start space-x-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedTravelers.includes(traveler.dbId)}
                    onChange={() => toggleSelectTraveler(traveler.dbId)}
                    className="mt-2 h-6 w-6 text-blue-600 rounded-lg cursor-pointer"
                  />

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-2xl font-bold text-gray-900">{traveler.jobNumber}</h3>
                          {getStatusBadge(traveler.status)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 font-semibold">Part Number</p>
                            <p className="text-gray-900 font-bold">{traveler.partNumber}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-semibold">Description</p>
                            <p className="text-gray-900">{traveler.description}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-semibold">Quantity</p>
                            <p className="text-gray-900 font-bold">{traveler.quantity}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-semibold">Revision</p>
                            <p className="text-gray-900 font-bold">{traveler.revision}</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/travelers/${traveler.dbId}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <Link
                          href={`/travelers/${traveler.dbId}`}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                        <Link
                          href={`/travelers/clone/${traveler.dbId}`}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Clone"
                        >
                          <DocumentDuplicateIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={async () => {
                            const newActiveStatus = !traveler.isActive;
                            const action = newActiveStatus ? 'activate' : 'deactivate';
                            if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} traveler ${traveler.jobNumber}?`)) return;
                            try {
                              const token = localStorage.getItem('nexus_token');
                              const response = await fetch(`http://acidashboard.aci.local:100/api/travelers/${traveler.dbId}`, {
                                method: 'PATCH',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ is_active: newActiveStatus })
                              });
                              if (response.ok) {
                                alert(`✅ Traveler ${traveler.jobNumber} ${action}d!`);
                                fetchTravelers();
                              } else {
                                alert(`❌ Failed to ${action} traveler`);
                              }
                            } catch (error) {
                              console.error('Error:', error);
                              alert(`❌ Failed to ${action} traveler`);
                            }
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            traveler.isActive
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={traveler.isActive ? 'Mark as Inactive' : 'Mark as Active'}
                        >
                          {traveler.isActive ? (
                            <CheckCircleIcon className="h-5 w-5" />
                          ) : (
                            <XCircleIcon className="h-5 w-5" />
                          )}
                        </button>
                        {traveler.status !== 'ARCHIVED' && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Archive traveler ${traveler.jobNumber}?`)) return;
                              try {
                                const token = localStorage.getItem('nexus_token');
                                const response = await fetch(`http://acidashboard.aci.local:100/api/travelers/${traveler.dbId}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({ status: 'ARCHIVED' })
                                });
                                if (response.ok) {
                                  alert(`✅ Traveler ${traveler.jobNumber} archived!`);
                                  fetchTravelers();
                                } else {
                                  alert('❌ Failed to archive traveler');
                                }
                              } catch (error) {
                                console.error('Error:', error);
                                alert('❌ Failed to archive traveler');
                              }
                            }}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Archive"
                          >
                            <ArchiveBoxIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (!confirm(`Are you sure you want to DELETE traveler ${traveler.jobNumber}? This cannot be undone!`)) return;
                            try {
                              const token = localStorage.getItem('nexus_token');
                              const response = await fetch(`http://acidashboard.aci.local:100/api/travelers/${traveler.dbId}`, {
                                method: 'DELETE',
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });
                              if (response.ok) {
                                alert(`✅ Traveler ${traveler.jobNumber} deleted!`);
                                fetchTravelers();
                              } else {
                                alert('❌ Failed to delete traveler');
                              }
                            } catch (error) {
                              console.error('Error:', error);
                              alert('❌ Failed to delete traveler');
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => window.open(`/travelers/${traveler.dbId}?print=true`, '_blank')}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Print"
                        >
                          <PrinterIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
