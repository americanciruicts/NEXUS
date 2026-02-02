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
  poNumber: string;
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
  shipDate: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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
          poNumber: String(t.po_number || ''),
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
          shipDate: String(t.ship_date || ''),
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, viewFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTravelers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTravelers = filteredTravelers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const toggleSelectTraveler = (dbId: number) => {
    if (selectedTravelers.includes(dbId)) {
      setSelectedTravelers(selectedTravelers.filter(id => id !== dbId));
    } else {
      setSelectedTravelers([...selectedTravelers, dbId]);
    }
  };

  const selectAll = () => {
    const currentPageIds = paginatedTravelers.map(t => t.dbId);
    const allCurrentPageSelected = currentPageIds.every(id => selectedTravelers.includes(id));

    if (allCurrentPageSelected) {
      // Deselect all on current page
      setSelectedTravelers(selectedTravelers.filter(id => !currentPageIds.includes(id)));
    } else {
      // Select all on current page
      const newSelected = [...selectedTravelers];
      currentPageIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      setSelectedTravelers(newSelected);
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
        <div className="mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-lg p-4 md:p-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold mb-1">📋 Travelers Management</h1>
              <p className="text-sm md:text-base text-blue-100">Manage production travelers and track progress</p>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 md:px-4 py-2 md:py-3 border border-white/30 flex-1 md:flex-initial">
                <div className="text-xl md:text-2xl font-bold">{stats.active}</div>
                <div className="text-xs text-blue-100">Active</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 md:px-4 py-2 md:py-3 border border-white/30 flex-1 md:flex-initial">
                <div className="text-xl md:text-2xl font-bold">{stats.drafts}</div>
                <div className="text-xs text-blue-100">Drafts</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 md:px-4 py-2 md:py-3 border border-white/30 flex-1 md:flex-initial">
                <div className="text-xl md:text-2xl font-bold">{stats.archived}</div>
                <div className="text-xs text-blue-100">Archived</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="mb-6 bg-white rounded-xl shadow-lg border-2 border-gray-200 p-4">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="w-full">
              <input
                type="text"
                placeholder="Search by job number, part number, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm md:text-base"
              />
            </div>

            {/* View Filter Tabs */}
            <div className="flex items-center gap-1 md:gap-2 bg-gray-100 rounded-lg p-1 overflow-x-auto">
              {(['active', 'drafts', 'archived', 'all'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setViewFilter(view)}
                  className={`px-3 md:px-4 py-2 rounded-md font-semibold transition-all text-sm md:text-base whitespace-nowrap ${
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
              className="flex items-center justify-center space-x-2 px-4 md:px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold shadow-md transition-all text-sm md:text-base"
            >
              <PlusIcon className="h-5 w-5" />
              <span>New Traveler</span>
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 pt-4 border-t-2 border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 md:gap-3">
            <button
              onClick={selectAll}
              className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold shadow-md text-sm md:text-base"
            >
              <CheckIcon className="h-4 md:h-5 w-4 md:w-5" />
              <span>{selectedTravelers.length === filteredTravelers.length ? 'Deselect All' : 'Select All'}</span>
            </button>

            <button
              onClick={exportSelectedPDFs}
              disabled={selectedTravelers.length === 0}
              className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold shadow-md disabled:cursor-not-allowed text-sm md:text-base"
            >
              <DocumentArrowDownIcon className="h-4 md:h-5 w-4 md:w-5" />
              <span className="whitespace-nowrap">Export PDFs ({selectedTravelers.length})</span>
            </button>

            {viewFilter !== 'archived' && (
              <button
                onClick={archiveSelected}
                disabled={selectedTravelers.length === 0}
                className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg font-semibold shadow-md disabled:cursor-not-allowed text-sm md:text-base"
              >
                <ArchiveBoxIcon className="h-4 md:h-5 w-4 md:w-5" />
                <span>Archive ({selectedTravelers.length})</span>
              </button>
            )}

            {viewFilter === 'archived' && (
              <button
                onClick={restoreSelected}
                disabled={selectedTravelers.length === 0}
                className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold shadow-md disabled:cursor-not-allowed text-sm md:text-base"
              >
                <ArchiveBoxXMarkIcon className="h-4 md:h-5 w-4 md:w-5" />
                <span>Restore ({selectedTravelers.length})</span>
              </button>
            )}

            <button
              onClick={deleteSelected}
              disabled={selectedTravelers.length === 0}
              className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold shadow-md disabled:cursor-not-allowed text-sm md:text-base"
            >
              <TrashIcon className="h-4 md:h-5 w-4 md:w-5" />
              <span>Delete ({selectedTravelers.length})</span>
            </button>
          </div>
        </div>

        {/* Travelers Table */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          {filteredTravelers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No Travelers Found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
            {/* Desktop Table View */}
            <div className="w-full overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 sticky top-0 z-10" style={{ backgroundColor: '#4f46e5' }}>
                  <tr>
                    <th className="px-3 py-4 text-left text-sm md:text-base font-extrabold uppercase tracking-wider" style={{ color: 'white' }}>
                      <input
                        type="checkbox"
                        checked={paginatedTravelers.length > 0 && paginatedTravelers.every(t => selectedTravelers.includes(t.dbId))}
                        onChange={selectAll}
                        className="h-5 w-5 text-blue-600 rounded cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-4 text-left text-sm md:text-base font-extrabold uppercase tracking-wider" style={{ color: 'white' }}>
                      Job, WO & PO
                    </th>
                    <th className="px-4 py-4 text-left text-sm md:text-base font-extrabold uppercase tracking-wider" style={{ color: 'white' }}>
                      Part Details
                    </th>
                    <th className="px-4 py-4 text-left text-sm md:text-base font-extrabold uppercase tracking-wider" style={{ color: 'white' }}>
                      Customer Info
                    </th>
                    <th className="px-4 py-4 text-left text-sm md:text-base font-extrabold uppercase tracking-wider" style={{ color: 'white' }}>
                      Dates
                    </th>
                    <th className="px-4 py-4 text-left text-sm md:text-base font-extrabold uppercase tracking-wider" style={{ color: 'white' }}>
                      Shipping
                    </th>
                    <th className="px-4 py-4 text-center text-sm md:text-base font-extrabold uppercase tracking-wider" style={{ color: 'white' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedTravelers.map((traveler) => (
                    <tr
                      key={traveler.dbId}
                      className={`transition-colors ${
                        selectedTravelers.includes(traveler.dbId)
                          ? 'bg-blue-50 border-l-4 border-l-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedTravelers.includes(traveler.dbId)}
                          onChange={() => toggleSelectTraveler(traveler.dbId)}
                          className="h-5 w-5 text-blue-600 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="text-base font-bold text-gray-900">Job# <span className="underline">{traveler.jobNumber}</span></div>
                          <div className="text-base font-extrabold text-indigo-700">WO# <span className="underline">{traveler.workOrder || 'N/A'}</span></div>
                          <div className="text-base font-semibold text-purple-700">PO# <span className="underline">{traveler.poNumber || 'N/A'}</span></div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="text-base font-semibold text-gray-900">Part# <span className="underline">{traveler.partNumber}</span></div>
                          <div className="text-base text-gray-600 max-w-xs truncate" title={traveler.description}>{traveler.description || 'N/A'}</div>
                          <div className="flex gap-3 text-base">
                            <span className="text-gray-500">Traveler Rev: <span className="font-semibold text-gray-900 underline">{traveler.revision || 'N/A'}</span></span>
                            <span className="text-gray-500">Qty: <span className="font-bold text-gray-900 underline">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="text-base text-gray-600">Cust. Code: <span className="font-semibold text-gray-900 underline">{traveler.customerCode || 'N/A'}</span></div>
                          <div className="text-base text-gray-600 max-w-xs truncate" title={traveler.customerName}>Cust. Name: <span className="font-semibold text-gray-900">{traveler.customerName || 'N/A'}</span></div>
                          <div className="text-base text-gray-600">Cust. Rev: <span className="font-semibold text-gray-900">N/A</span></div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">Start Date: <span className="font-semibold text-gray-900">{traveler.createdAt ? formatDateDisplay(traveler.createdAt.split('T')[0]) : 'N/A'}</span></div>
                          <div className="text-sm text-gray-600">Due: <span className="font-semibold text-gray-900 underline">{traveler.dueDate ? formatDateDisplay(traveler.dueDate) : 'N/A'}</span></div>
                          <div className="text-sm text-gray-600">Ship: <span className="font-semibold text-gray-900">{traveler.shipDate ? formatDateDisplay(traveler.shipDate) : 'N/A'}</span></div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="text-base text-gray-600">Ship Via: <span className="font-semibold text-gray-900">{traveler.shipVia || 'N/A'}</span></div>
                          <div className="text-base text-gray-600">From Stock: <span className="font-semibold text-gray-900">{traveler.fromStock || 'N/A'}</span></div>
                          <div className="text-base text-gray-600">To Stock: <span className="font-semibold text-gray-900">{traveler.toStock || 'N/A'}</span></div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <Link
                            href={`/travelers/${traveler.dbId}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
                            title="View"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </Link>
                          <Link
                            href={`/travelers/${traveler.dbId}`}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center justify-center"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </Link>
                          <Link
                            href={`/travelers/clone/${traveler.dbId}`}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center justify-center"
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
                            className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
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
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center justify-center"
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
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => window.open(`/travelers/${traveler.dbId}?print=true`, '_blank')}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center"
                            title="Print"
                          >
                            <PrinterIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View - Hidden since we're showing full table on all devices */}
            <div className="hidden">
              <div className="p-3 space-y-3">
                {paginatedTravelers.map((traveler) => (
                  <div key={traveler.dbId} className={`border-2 rounded-lg shadow-sm transition-colors ${
                    selectedTravelers.includes(traveler.dbId)
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200'
                  }`}>
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedTravelers.includes(traveler.dbId)}
                          onChange={() => toggleSelectTraveler(traveler.dbId)}
                          className="h-5 w-5 text-blue-600 rounded cursor-pointer"
                        />
                        <div>
                          <div className="text-sm font-bold">Job# {traveler.jobNumber}</div>
                          <div className="text-xs text-blue-100">WO# {traveler.workOrder || 'N/A'}</div>
                          <div className="text-xs text-blue-100">PO# {traveler.poNumber || 'N/A'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3 space-y-2">
                      {/* Part Details */}
                      <div>
                        <div className="text-xs text-gray-500 font-semibold">Part Number</div>
                        <div className="text-sm font-bold text-gray-900">{traveler.partNumber}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-semibold">Description</div>
                        <div className="text-sm text-gray-700">{traveler.description || 'N/A'}</div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                        <div>
                          <div className="text-xs text-gray-500 font-semibold">Customer Code</div>
                          <div className="text-sm font-semibold text-gray-900">{traveler.customerCode || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 font-semibold">Start Date</div>
                          <div className="text-sm font-semibold text-gray-900">{traveler.createdAt ? formatDateDisplay(traveler.createdAt.split('T')[0]) : 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 font-semibold">Due Date</div>
                          <div className="text-sm font-semibold text-gray-900">{traveler.dueDate ? formatDateDisplay(traveler.dueDate) : 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 font-semibold">Ship Date</div>
                          <div className="text-sm font-semibold text-gray-900">{traveler.shipDate ? formatDateDisplay(traveler.shipDate) : 'N/A'}</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="grid grid-cols-3 gap-2">
                          <Link
                            href={`/travelers/${traveler.dbId}`}
                            className="flex items-center justify-center space-x-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-semibold border border-blue-200"
                          >
                            <EyeIcon className="h-4 w-4" />
                            <span>View</span>
                          </Link>
                          <Link
                            href={`/travelers/${traveler.dbId}`}
                            className="flex items-center justify-center space-x-1 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors text-sm font-semibold border border-green-200"
                          >
                            <PencilIcon className="h-4 w-4" />
                            <span>Edit</span>
                          </Link>
                          <button
                            onClick={() => window.open(`/travelers/${traveler.dbId}?print=true`, '_blank')}
                            className="flex items-center justify-center space-x-1 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-sm font-semibold border border-gray-200"
                          >
                            <PrinterIcon className="h-4 w-4" />
                            <span>Print</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

              {/* Pagination Controls */}
              {filteredTravelers.length > 0 && (
                <div className="px-4 py-4 border-t-2 border-gray-200 bg-gray-50">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Items per page selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 font-medium">Show:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-3 py-1 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm font-semibold"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-sm text-gray-700">
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredTravelers.length)} of {filteredTravelers.length} travelers
                      </span>
                    </div>

                    {/* Page navigation */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded-lg font-semibold text-sm bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        First
                      </button>
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded-lg font-semibold text-sm bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Prev
                      </button>

                      {getPageNumbers().map((page, index) => (
                        page === '...' ? (
                          <span key={`ellipsis-${index}`} className="px-3 py-1 text-gray-500">...</span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => goToPage(Number(page))}
                            className={`px-3 py-1 rounded-lg font-semibold text-sm transition-colors ${
                              currentPage === page
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                                : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      ))}

                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded-lg font-semibold text-sm bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded-lg font-semibold text-sm bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
