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
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
  DocumentArrowDownIcon,
  CheckIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config/api';

// Toast notification component
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

function Toast({ message, type, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsVisible(false), 4000);
    const removeTimer = setTimeout(() => onClose(), 4500);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500/95' : type === 'error' ? 'bg-red-500/95' : 'bg-blue-500/95';
  const borderColor = type === 'success' ? 'border-green-400' : type === 'error' ? 'border-red-400' : 'border-blue-400';

  return (
    <div
      className="fixed top-4 right-4 z-50 transition-all duration-500"
      style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateX(0)' : 'translateX(100px)' }}
    >
      <div className={`flex items-center space-x-3 px-6 py-4 rounded-lg shadow-2xl backdrop-blur-md border ${bgColor} ${borderColor} text-white`}>
        {type === 'success' ? <CheckCircleIcon className="h-6 w-6" /> : type === 'error' ? <XCircleIcon className="h-6 w-6" /> : <ExclamationTriangleIcon className="h-6 w-6" />}
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}

// Custom Confirm Modal
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ isOpen, title, message, confirmText = 'Confirm', onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex justify-end space-x-3">
          <button onClick={onCancel} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all">Cancel</button>
          <button onClick={onConfirm} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all shadow-md">{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

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
  revision: string;  // Traveler Revision
  customerRevision: string;  // Customer Revision
  quantity: number;
  customerCode: string;
  customerName: string;
  travelerType: string;  // PCB_ASSEMBLY, PCB, CABLES, PURCHASING
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

// Traveler type color configuration (no red or pink)
const getTravelerTypeBadge = (type: string) => {
  const typeConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
    'PCB_ASSEMBLY': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', label: 'PCB Assembly' },
    'ASSY': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', label: 'PCB Assembly' },
    'PCB': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', label: 'PCB' },
    'CABLE': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', label: 'Cables' },
    'CABLES': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', label: 'Cables' },
    'PURCHASING': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', label: 'Purchasing' }
  };

  const config = typeConfig[type] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', label: type };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
};

export default function TravelersPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [viewFilter, setViewFilter] = useState<'active' | 'archived' | 'drafts' | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [travelers, setTravelers] = useState<TravelerItem[]>([]);
  const [selectedTravelers, setSelectedTravelers] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Toast and Confirm Modal state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; confirmText: string; onConfirm: () => void }>({
    isOpen: false, title: '', message: '', confirmText: 'Confirm', onConfirm: () => {}
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info') => setToast({ message, type });
  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Confirm') => {
    setConfirmModal({ isOpen: true, title, message, confirmText, onConfirm });
  };
  const closeConfirm = () => setConfirmModal({ ...confirmModal, isOpen: false });

  useEffect(() => {
    fetchTravelers();
  }, []);

  const fetchTravelers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/travelers/`, {
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
          revision: String(t.revision || ''),
          customerRevision: String(t.customer_revision || ''),
          quantity: Number(t.quantity),
          customerCode: String(t.customer_code || ''),
          customerName: String(t.customer_name || ''),
          travelerType: String(t.traveler_type || 'PCB_ASSEMBLY'),
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

    const matchesType = typeFilter === 'all' || t.travelerType === typeFilter ||
      (typeFilter === 'PCB_ASSEMBLY' && (t.travelerType === 'PCB_ASSEMBLY' || t.travelerType === 'ASSY')) ||
      (typeFilter === 'CABLE' && (t.travelerType === 'CABLE' || t.travelerType === 'CABLES'));

    const matchesView =
      (viewFilter === 'active' && t.isActive && t.status !== 'ARCHIVED' && t.status !== 'DRAFT') ||
      (viewFilter === 'archived' && t.status === 'ARCHIVED') ||
      (viewFilter === 'drafts' && t.status === 'DRAFT') ||
      (viewFilter === 'all' && t.status !== 'ARCHIVED');

    return matchesSearch && matchesStatus && matchesType && matchesView;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, viewFilter]);

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

  const doArchiveSelected = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      await Promise.all(
        selectedTravelers.map(id =>
          fetch(`${API_BASE_URL}/travelers/${id}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ARCHIVED' })
          })
        )
      );
      showToast(`Archived ${selectedTravelers.length} traveler(s)!`, 'success');
      setSelectedTravelers([]);
      fetchTravelers();
    } catch (error) {
      console.error('Error archiving travelers:', error);
      showToast('Failed to archive travelers', 'error');
    }
    closeConfirm();
  };

  const archiveSelected = () => {
    if (selectedTravelers.length === 0) {
      showToast('Please select travelers to archive', 'error');
      return;
    }
    showConfirm('Archive Travelers', `Are you sure you want to archive ${selectedTravelers.length} traveler(s)?`, doArchiveSelected, 'Archive');
  };

  const doRestoreSelected = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      await Promise.all(
        selectedTravelers.map(id =>
          fetch(`${API_BASE_URL}/travelers/${id}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'CREATED' })
          })
        )
      );
      showToast(`Restored ${selectedTravelers.length} traveler(s)!`, 'success');
      setSelectedTravelers([]);
      fetchTravelers();
    } catch (error) {
      console.error('Error restoring travelers:', error);
      showToast('Failed to restore travelers', 'error');
    }
    closeConfirm();
  };

  const restoreSelected = () => {
    if (selectedTravelers.length === 0) {
      showToast('Please select travelers to restore', 'error');
      return;
    }
    showConfirm('Restore Travelers', `Are you sure you want to restore ${selectedTravelers.length} traveler(s)?`, doRestoreSelected, 'Restore');
  };

  const doDeleteSelected = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      await Promise.all(
        selectedTravelers.map(id =>
          fetch(`${API_BASE_URL}/travelers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          })
        )
      );

      showToast(`Deleted ${selectedTravelers.length} traveler(s)!`, 'success');
      setSelectedTravelers([]);
      fetchTravelers();
    } catch (error) {
      console.error('Error deleting travelers:', error);
      showToast('Failed to delete travelers', 'error');
    }
    closeConfirm();
  };

  const deleteSelected = () => {
    if (selectedTravelers.length === 0) {
      showToast('Please select travelers to delete', 'error');
      return;
    }
    showConfirm('Delete Travelers', `WARNING: This will permanently delete ${selectedTravelers.length} traveler(s)!\n\nThis action cannot be undone.`, doDeleteSelected, 'Delete');
  };

  const exportSelectedPDFs = async () => {
    if (selectedTravelers.length === 0) {
      showToast('Please select travelers to export', 'error');
      return;
    }

    showToast(`Exporting ${selectedTravelers.length} traveler(s) as PDFs...`, 'info');

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
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        {/* Header with Stats */}
        <div className="mb-6 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white rounded-2xl p-5 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                <svg className="w-7 h-7 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Travelers Management</h1>
                <p className="text-sm text-blue-200/80 mt-0.5">Manage production travelers and track progress</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 md:px-4 py-2 md:py-3 border border-white/20 flex-1 md:flex-initial text-center">
                <div className="text-xl md:text-2xl font-extrabold">{stats.active}</div>
                <div className="text-[11px] text-blue-200/70 uppercase tracking-wider font-semibold">Active</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 md:px-4 py-2 md:py-3 border border-white/20 flex-1 md:flex-initial text-center">
                <div className="text-xl md:text-2xl font-extrabold">{stats.drafts}</div>
                <div className="text-[11px] text-blue-200/70 uppercase tracking-wider font-semibold">Drafts</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 md:px-4 py-2 md:py-3 border border-white/20 flex-1 md:flex-initial text-center">
                <div className="text-xl md:text-2xl font-extrabold">{stats.archived}</div>
                <div className="text-[11px] text-blue-200/70 uppercase tracking-wider font-semibold">Archived</div>
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

            {/* Type Filter Tabs */}
            <div className="flex items-center gap-1 md:gap-2 bg-gray-100 rounded-lg p-1 overflow-x-auto">
              {([
                { value: 'all', label: 'All Types', color: 'from-gray-600 to-gray-700' },
                { value: 'PCB_ASSEMBLY', label: 'PCB Assembly', color: 'from-blue-600 to-blue-700' },
                { value: 'PCB', label: 'PCB', color: 'from-green-600 to-green-700' },
                { value: 'CABLE', label: 'Cables', color: 'from-purple-600 to-purple-700' },
                { value: 'PURCHASING', label: 'Purchasing', color: 'from-orange-600 to-orange-700' }
              ]).map((type) => (
                <button
                  key={type.value}
                  onClick={() => setTypeFilter(type.value)}
                  className={`px-3 md:px-4 py-2 rounded-md font-semibold transition-all text-sm md:text-base whitespace-nowrap ${
                    typeFilter === type.value
                      ? `bg-gradient-to-r ${type.color} text-white shadow-md`
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
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
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Table Header + Pagination */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 px-3 py-2 rounded-t-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-14 h-14 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold text-white">Travelers List</h2>
                <span className="text-xs font-semibold text-white bg-white/20 px-2 py-0.5 rounded-full">
                  {filteredTravelers.length}
                </span>
              </div>
            </div>
          </div>
          {filteredTravelers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No Travelers Found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>

            {/* Desktop Table View */}
            <div className="hidden lg:block w-full overflow-x-auto relative">
              <div className="absolute top-0 left-0 right-0 h-12 lg:h-14 overflow-hidden pointer-events-none z-20">
                <div className="absolute top-0 right-8 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2" />
                <div className="absolute top-2 left-12 w-12 h-12 bg-white/10 rounded-full" />
                <div className="absolute top-0 right-1/3 w-8 h-8 bg-white/5 rounded-full translate-y-1" />
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800">
                    <th className="px-2 lg:px-3 py-3 lg:py-4 text-left text-xs lg:text-sm xl:text-base font-extrabold uppercase tracking-wider text-white">
                      <input
                        type="checkbox"
                        checked={paginatedTravelers.length > 0 && paginatedTravelers.every(t => selectedTravelers.includes(t.dbId))}
                        onChange={selectAll}
                        className="h-4 lg:h-5 w-4 lg:w-5 text-blue-600 rounded cursor-pointer"
                      />
                    </th>
                    <th className="px-2 lg:px-4 py-3 lg:py-4 text-left text-xs lg:text-sm xl:text-base font-extrabold uppercase tracking-wider text-white">
                      Job, WO & PO
                    </th>
                    <th className="px-2 lg:px-4 py-3 lg:py-4 text-left text-xs lg:text-sm xl:text-base font-extrabold uppercase tracking-wider text-white">
                      Part Details
                    </th>
                    <th className="px-2 lg:px-4 py-3 lg:py-4 text-left text-xs lg:text-sm xl:text-base font-extrabold uppercase tracking-wider text-white">
                      Customer Info
                    </th>
                    <th className="px-2 lg:px-4 py-3 lg:py-4 text-left text-xs lg:text-sm xl:text-base font-extrabold uppercase tracking-wider text-white">
                      Dates
                    </th>
                    <th className="px-2 lg:px-4 py-3 lg:py-4 text-left text-xs lg:text-sm xl:text-base font-extrabold uppercase tracking-wider text-white">
                      Shipping
                    </th>
                    <th className="px-2 lg:px-4 py-3 lg:py-4 text-center text-xs lg:text-sm xl:text-base font-extrabold uppercase tracking-wider text-white">
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
                      <td className="px-2 lg:px-3 py-3 lg:py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedTravelers.includes(traveler.dbId)}
                          onChange={() => toggleSelectTraveler(traveler.dbId)}
                          className="h-4 lg:h-5 w-4 lg:w-5 text-blue-600 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-2 lg:px-4 py-3 lg:py-4">
                        <div className="space-y-0.5 lg:space-y-1">
                          <div className="mb-1 flex items-center gap-1 flex-wrap">
                            {getTravelerTypeBadge(traveler.travelerType)}
                            {traveler.status === 'DRAFT' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border border-amber-400 bg-amber-100 text-amber-800 animate-pulse">
                                DRAFT
                              </span>
                            )}
                          </div>
                          <div className="text-sm lg:text-base font-bold text-gray-900">Job# <span className="underline">{traveler.jobNumber}</span></div>
                          <div className="text-sm lg:text-base font-extrabold text-indigo-700">WO# <span className="underline">{traveler.workOrder || 'N/A'}</span></div>
                          <div className="text-sm lg:text-base font-semibold text-purple-700">PO# <span className="underline">{traveler.poNumber || 'N/A'}</span></div>
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 py-3 lg:py-4">
                        <div className="space-y-0.5 lg:space-y-1">
                          <div className="text-sm lg:text-base font-semibold text-gray-900">Part# <span className="underline">{traveler.partNumber}</span></div>
                          <div className="text-sm lg:text-base text-gray-600 max-w-xs truncate" title={traveler.description}>Desc: {traveler.description || 'N/A'}</div>
                          <div className="flex flex-wrap gap-2 lg:gap-3 text-sm lg:text-base">
                            <span className="text-gray-500">Trav Rev: <span className="font-semibold text-gray-900 underline">{traveler.revision || 'N/A'}</span></span>
                            <span className="text-gray-500">Cust Rev: <span className="font-semibold text-blue-700 underline">{traveler.customerRevision || 'N/A'}</span></span>
                            <span className="text-gray-500">Qty: <span className="font-bold text-gray-900 underline">{traveler.quantity}</span></span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 py-3 lg:py-4">
                        <div className="space-y-0.5 lg:space-y-1">
                          <div className="text-sm lg:text-base text-gray-600">Code: <span className="font-semibold text-gray-900 underline">{traveler.customerCode || 'N/A'}</span></div>
                          <div className="text-sm lg:text-base text-gray-600 max-w-xs truncate" title={traveler.customerName}>Name: <span className="font-semibold text-gray-900">{traveler.customerName || 'N/A'}</span></div>
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 py-3 lg:py-4">
                        <div className="space-y-0.5 lg:space-y-1">
                          <div className="text-xs lg:text-sm text-gray-600">Start: <span className="font-semibold text-gray-900">{traveler.createdAt ? formatDateDisplay(traveler.createdAt.split('T')[0]) : 'N/A'}</span></div>
                          <div className="text-xs lg:text-sm text-gray-600">Due: <span className="font-semibold text-gray-900 underline">{traveler.dueDate ? formatDateDisplay(traveler.dueDate) : 'N/A'}</span></div>
                          <div className="text-xs lg:text-sm text-gray-600">Ship: <span className="font-semibold text-gray-900">{traveler.shipDate ? formatDateDisplay(traveler.shipDate) : 'N/A'}</span></div>
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 py-3 lg:py-4">
                        <div className="space-y-0.5 lg:space-y-1">
                          <div className="text-sm lg:text-base text-gray-600">Via: <span className="font-semibold text-gray-900">{traveler.shipVia || 'N/A'}</span></div>
                          <div className="text-sm lg:text-base text-gray-600">From: <span className="font-semibold text-gray-900">{traveler.fromStock || 'N/A'}</span></div>
                          <div className="text-sm lg:text-base text-gray-600">To: <span className="font-semibold text-gray-900">{traveler.toStock || 'N/A'}</span></div>
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 py-3 lg:py-4">
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-1 lg:gap-2">
                          <Link
                            href={`/travelers/${traveler.dbId}`}
                            className="p-1.5 lg:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
                            title="View"
                          >
                            <EyeIcon className="h-4 lg:h-5 w-4 lg:w-5" />
                          </Link>
                          <Link
                            href={`/travelers/${traveler.dbId}/edit`}
                            className="p-1.5 lg:p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center justify-center"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 lg:h-5 w-4 lg:w-5" />
                          </Link>
                          <button
                            onClick={() => {
                              const newActiveStatus = !traveler.isActive;
                              const action = newActiveStatus ? 'activate' : 'deactivate';
                              showConfirm(
                                `${action.charAt(0).toUpperCase() + action.slice(1)} Traveler`,
                                `${action.charAt(0).toUpperCase() + action.slice(1)} traveler ${traveler.jobNumber}?`,
                                async () => {
                                  try {
                                    const token = localStorage.getItem('nexus_token');
                                    const response = await fetch(`${API_BASE_URL}/travelers/${traveler.dbId}`, {
                                      method: 'PATCH',
                                      headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                      },
                                      body: JSON.stringify({ is_active: newActiveStatus })
                                    });
                                    if (response.ok) {
                                      showToast(`Traveler ${traveler.jobNumber} ${action}d!`, 'success');
                                      fetchTravelers();
                                    } else {
                                      showToast(`Failed to ${action} traveler`, 'error');
                                    }
                                  } catch (error) {
                                    console.error('Error:', error);
                                    showToast(`Failed to ${action} traveler`, 'error');
                                  }
                                  closeConfirm();
                                },
                                action.charAt(0).toUpperCase() + action.slice(1)
                              );
                            }}
                            className={`p-1.5 lg:p-2 rounded-lg transition-colors flex items-center justify-center ${
                              traveler.isActive
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                            title={traveler.isActive ? 'Mark as Inactive' : 'Mark as Active'}
                          >
                            {traveler.isActive ? (
                              <CheckCircleIcon className="h-4 lg:h-5 w-4 lg:w-5" />
                            ) : (
                              <XCircleIcon className="h-4 lg:h-5 w-4 lg:w-5" />
                            )}
                          </button>
                          {traveler.status !== 'ARCHIVED' && (
                            <button
                              onClick={() => {
                                showConfirm(
                                  'Archive Traveler',
                                  `Archive traveler ${traveler.jobNumber}?`,
                                  async () => {
                                    try {
                                      const token = localStorage.getItem('nexus_token');
                                      const response = await fetch(`${API_BASE_URL}/travelers/${traveler.dbId}`, {
                                        method: 'PATCH',
                                        headers: {
                                          'Authorization': `Bearer ${token}`,
                                          'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ status: 'ARCHIVED' })
                                      });
                                      if (response.ok) {
                                        showToast(`Traveler ${traveler.jobNumber} archived!`, 'success');
                                        fetchTravelers();
                                      } else {
                                        showToast('Failed to archive traveler', 'error');
                                      }
                                    } catch (error) {
                                      console.error('Error:', error);
                                      showToast('Failed to archive traveler', 'error');
                                    }
                                    closeConfirm();
                                  },
                                  'Archive'
                                );
                              }}
                              className="p-1.5 lg:p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center justify-center"
                              title="Archive"
                            >
                              <ArchiveBoxIcon className="h-4 lg:h-5 w-4 lg:w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              showConfirm(
                                'Delete Traveler',
                                `Are you sure you want to DELETE traveler ${traveler.jobNumber}?\n\nThis cannot be undone!`,
                                async () => {
                                  try {
                                    const token = localStorage.getItem('nexus_token');
                                    const response = await fetch(`${API_BASE_URL}/travelers/${traveler.dbId}`, {
                                      method: 'DELETE',
                                      headers: {
                                        'Authorization': `Bearer ${token}`
                                      }
                                    });
                                    if (response.ok) {
                                      showToast(`Traveler ${traveler.jobNumber} deleted!`, 'success');
                                      fetchTravelers();
                                    } else {
                                      showToast('Failed to delete traveler', 'error');
                                    }
                                  } catch (error) {
                                    console.error('Error:', error);
                                    showToast('Failed to delete traveler', 'error');
                                  }
                                  closeConfirm();
                                },
                                'Delete'
                              );
                            }}
                            className="p-1.5 lg:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 lg:h-5 w-4 lg:w-5" />
                          </button>
                          <button
                            onClick={() => window.open(`/travelers/${traveler.dbId}?print=true`, '_blank')}
                            className="p-1.5 lg:p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center"
                            title="Print"
                          >
                            <PrinterIcon className="h-4 lg:h-5 w-4 lg:w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block lg:hidden w-full">
              <div className="p-3 space-y-4">
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
                      <div className="flex items-center gap-1">
                        {getTravelerTypeBadge(traveler.travelerType)}
                        {traveler.status === 'DRAFT' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border border-amber-400 bg-amber-100 text-amber-800 animate-pulse">
                            DRAFT
                          </span>
                        )}
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
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-xs text-gray-500 font-semibold">Traveler Rev</div>
                          <div className="text-sm text-gray-900">{traveler.revision || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 font-semibold">Customer Rev</div>
                          <div className="text-sm text-blue-700">{traveler.customerRevision || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 font-semibold">Quantity</div>
                          <div className="text-sm text-gray-900">{traveler.quantity}</div>
                        </div>
                      </div>

                      {/* Customer & Dates Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                        <div>
                          <div className="text-xs text-gray-500 font-semibold">Customer Code</div>
                          <div className="text-sm font-semibold text-gray-900">{traveler.customerCode || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 font-semibold">Customer Name</div>
                          <div className="text-sm font-semibold text-gray-900 truncate" title={traveler.customerName}>{traveler.customerName || 'N/A'}</div>
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

                      {/* Shipping Info */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="text-xs text-gray-500 font-semibold mb-1">Shipping</div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div>Ship Via: <span className="font-semibold">{traveler.shipVia || 'N/A'}</span></div>
                          <div>From: <span className="font-semibold">{traveler.fromStock || 'N/A'}</span></div>
                          <div className="col-span-2">To: <span className="font-semibold">{traveler.toStock || 'N/A'}</span></div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="grid grid-cols-4 gap-2">
                          <Link
                            href={`/travelers/${traveler.dbId}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex flex-col items-center justify-center"
                            title="View"
                          >
                            <EyeIcon className="h-5 w-5" />
                            <span className="text-xs mt-1">View</span>
                          </Link>
                          <Link
                            href={`/travelers/${traveler.dbId}/edit`}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex flex-col items-center justify-center"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                            <span className="text-xs mt-1">Edit</span>
                          </Link>
                          <button
                            onClick={() => window.open(`/travelers/${traveler.dbId}?print=true`, '_blank')}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex flex-col items-center justify-center"
                            title="Print"
                          >
                            <PrinterIcon className="h-5 w-5" />
                            <span className="text-xs mt-1">Print</span>
                          </button>
                          <button
                            onClick={() => {
                              const newActiveStatus = !traveler.isActive;
                              const action = newActiveStatus ? 'activate' : 'deactivate';
                              showConfirm(
                                `${action.charAt(0).toUpperCase() + action.slice(1)} Traveler`,
                                `${action.charAt(0).toUpperCase() + action.slice(1)} traveler ${traveler.jobNumber}?`,
                                async () => {
                                  try {
                                    const token = localStorage.getItem('nexus_token');
                                    const response = await fetch(`${API_BASE_URL}/travelers/${traveler.dbId}`, {
                                      method: 'PATCH',
                                      headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                      },
                                      body: JSON.stringify({ is_active: newActiveStatus })
                                    });
                                    if (response.ok) {
                                      showToast(`Traveler ${traveler.jobNumber} ${action}d!`, 'success');
                                      fetchTravelers();
                                    } else {
                                      showToast(`Failed to ${action} traveler`, 'error');
                                    }
                                  } catch (error) {
                                    console.error('Error:', error);
                                    showToast(`Failed to ${action} traveler`, 'error');
                                  }
                                  closeConfirm();
                                },
                                action.charAt(0).toUpperCase() + action.slice(1)
                              );
                            }}
                            className={`p-2 rounded-lg transition-colors flex flex-col items-center justify-center ${
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
                            <span className="text-xs mt-1">{traveler.isActive ? 'Active' : 'Inactive'}</span>
                          </button>
                          {traveler.status !== 'ARCHIVED' && (
                            <button
                              onClick={() => {
                                showConfirm(
                                  'Archive Traveler',
                                  `Archive traveler ${traveler.jobNumber}?`,
                                  async () => {
                                    try {
                                      const token = localStorage.getItem('nexus_token');
                                      const response = await fetch(`${API_BASE_URL}/travelers/${traveler.dbId}`, {
                                        method: 'PATCH',
                                        headers: {
                                          'Authorization': `Bearer ${token}`,
                                          'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ status: 'ARCHIVED' })
                                      });
                                      if (response.ok) {
                                        showToast(`Traveler ${traveler.jobNumber} archived!`, 'success');
                                        fetchTravelers();
                                      } else {
                                        showToast('Failed to archive traveler', 'error');
                                      }
                                    } catch (error) {
                                      console.error('Error:', error);
                                      showToast('Failed to archive traveler', 'error');
                                    }
                                    closeConfirm();
                                  },
                                  'Archive'
                                );
                              }}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex flex-col items-center justify-center"
                              title="Archive"
                            >
                              <ArchiveBoxIcon className="h-5 w-5" />
                              <span className="text-xs mt-1">Archive</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              showConfirm(
                                'Delete Traveler',
                                `Are you sure you want to DELETE traveler ${traveler.jobNumber}?\n\nThis cannot be undone!`,
                                async () => {
                                  try {
                                    const token = localStorage.getItem('nexus_token');
                                    const response = await fetch(`${API_BASE_URL}/travelers/${traveler.dbId}`, {
                                      method: 'DELETE',
                                      headers: {
                                        'Authorization': `Bearer ${token}`
                                      }
                                    });
                                    if (response.ok) {
                                      showToast(`Traveler ${traveler.jobNumber} deleted!`, 'success');
                                      fetchTravelers();
                                    } else {
                                      showToast('Failed to delete traveler', 'error');
                                    }
                                  } catch (error) {
                                    console.error('Error:', error);
                                    showToast('Failed to delete traveler', 'error');
                                  }
                                  closeConfirm();
                                },
                                'Delete'
                              );
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex flex-col items-center justify-center"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                            <span className="text-xs mt-1">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

              {/* Bottom Pagination Controls */}
              {filteredTravelers.length > 0 && (
                <div className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 px-3 py-2 relative overflow-hidden rounded-b-xl">
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
                      <span className="text-xs text-white/80">{startIndex + 1}-{Math.min(endIndex, filteredTravelers.length)} of {filteredTravelers.length}</span>
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
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
