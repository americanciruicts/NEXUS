'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config/api';
import {
  WrenchScrewdriverIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  PCB_ASSEMBLY_WORK_CENTERS,
  PCB_WORK_CENTERS,
  CABLES_WORK_CENTERS,
  PURCHASING_WORK_CENTERS,
} from '@/data/workCenters';

interface WorkCenterDB {
  id: number;
  name: string;
  code: string;
  description: string;
  traveler_type: string | null;
  is_active: boolean;
}

const TABS = [
  { key: 'PCB_ASSEMBLY', label: 'PCB Assembly' },
  { key: 'PCB', label: 'PCB' },
  { key: 'CABLE', label: 'Cables' },
  { key: 'PURCHASING', label: 'Purchasing' },
];

// Static data map for initial sync
const STATIC_DATA: Record<string, { name: string; description: string }[]> = {
  PCB_ASSEMBLY: PCB_ASSEMBLY_WORK_CENTERS,
  PCB: PCB_WORK_CENTERS,
  CABLE: CABLES_WORK_CENTERS,
  PURCHASING: PURCHASING_WORK_CENTERS,
};

export default function WorkCenterManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('PCB_ASSEMBLY');
  const [searchTerm, setSearchTerm] = useState('');
  const [workCenters, setWorkCenters] = useState<WorkCenterDB[]>([]);
  const [allWorkCenters, setAllWorkCenters] = useState<WorkCenterDB[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedWC, setSelectedWC] = useState<WorkCenterDB | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const isAdmin = user?.role === 'ADMIN';

  const fetchWorkCenters = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`${API_BASE_URL}/work-centers-mgmt/?include_inactive=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAllWorkCenters(data);

        // If DB is empty, sync from static data
        if (data.length === 0) {
          await syncStaticData();
          return;
        }
      }
    } catch (error) {
      console.error('Error fetching work centers:', error);
      // Fallback to static data display
      loadStaticFallback();
    } finally {
      setLoading(false);
    }
  };

  const loadStaticFallback = () => {
    const staticItems: WorkCenterDB[] = [];
    let idCounter = 1;
    Object.entries(STATIC_DATA).forEach(([type, items]) => {
      items.forEach((item) => {
        staticItems.push({
          id: idCounter++,
          name: item.name,
          code: `${type}_${item.name.replace(/\s+/g, '_').replace(/\//g, '_').replace(/&/g, 'AND').toUpperCase()}`,
          description: item.description,
          traveler_type: type,
          is_active: true,
        });
      });
    });
    setAllWorkCenters(staticItems);
  };

  const syncStaticData = async () => {
    const token = localStorage.getItem('nexus_token');
    let synced = 0;

    for (const [type, items] of Object.entries(STATIC_DATA)) {
      for (const item of items) {
        try {
          const response = await fetch(`${API_BASE_URL}/work-centers-mgmt/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: item.name,
              code: `${type}_${item.name.replace(/\s+/g, '_').replace(/\//g, '_').replace(/&/g, 'AND').toUpperCase()}`,
              description: item.description,
              traveler_type: type,
              is_active: true
            })
          });
          if (response.ok) synced++;
        } catch {
          // Skip duplicates
        }
      }
    }

    if (synced > 0) {
      toast.success(`Synced ${synced} work centers from default data`);
    }

    // Re-fetch after sync
    const response = await fetch(`${API_BASE_URL}/work-centers-mgmt/?include_inactive=true`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` }
    });
    if (response.ok) {
      const data = await response.json();
      setAllWorkCenters(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkCenters();
  }, []);

  // Filter work centers by active tab and search
  useEffect(() => {
    let filtered = allWorkCenters.filter(wc => wc.traveler_type === activeTab);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(wc =>
        wc.name.toLowerCase().includes(q) ||
        wc.description?.toLowerCase().includes(q) ||
        wc.code.toLowerCase().includes(q)
      );
    }
    setWorkCenters(filtered);
    setCurrentPage(1);
  }, [allWorkCenters, activeTab, searchTerm]);

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('Work center name is required');
      return;
    }
    try {
      const token = localStorage.getItem('nexus_token');
      const code = `${activeTab}_${(formData.code || formData.name).replace(/\s+/g, '_').replace(/\//g, '_').replace(/&/g, 'AND').toUpperCase()}`;
      const response = await fetch(`${API_BASE_URL}/work-centers-mgmt/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          code: code,
          description: formData.description,
          traveler_type: activeTab,
          is_active: true
        })
      });

      if (response.ok) {
        const newWC = await response.json();
        setAllWorkCenters(prev => [...prev, newWC]);
        setIsAddModalOpen(false);
        setFormData({ name: '', code: '', description: '' });
        toast.success(`Work center "${formData.name}" added successfully`);
      } else {
        const err = await response.json();
        toast.error(err.detail || 'Failed to add work center');
      }
    } catch {
      toast.error('Error adding work center');
    }
  };

  const handleEdit = async () => {
    if (!selectedWC || !formData.name.trim()) return;
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`${API_BASE_URL}/work-centers-mgmt/${selectedWC.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setAllWorkCenters(prev => prev.map(wc => wc.id === updated.id ? updated : wc));
        setIsEditModalOpen(false);
        setSelectedWC(null);
        toast.success(`Work center "${formData.name}" updated`);
      } else {
        const err = await response.json();
        toast.error(err.detail || 'Failed to update work center');
      }
    } catch {
      toast.error('Error updating work center');
    }
  };

  const handleDelete = async () => {
    if (!selectedWC) return;
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`${API_BASE_URL}/work-centers-mgmt/${selectedWC.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setAllWorkCenters(prev => prev.filter(wc => wc.id !== selectedWC.id));
        setIsDeleteModalOpen(false);
        setSelectedWC(null);
        toast.success(`Work center deleted`);
      } else {
        const err = await response.json();
        toast.error(err.detail || 'Failed to delete work center');
      }
    } catch {
      toast.error('Error deleting work center');
    }
  };

  const openEditModal = (wc: WorkCenterDB) => {
    setSelectedWC(wc);
    setFormData({ name: wc.name, code: wc.code, description: wc.description || '' });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (wc: WorkCenterDB) => {
    setSelectedWC(wc);
    setIsDeleteModalOpen(true);
  };

  const tabCounts = TABS.map(tab => ({
    ...tab,
    count: allWorkCenters.filter(wc => wc.traveler_type === tab.key).length
  }));

  if (!isAdmin) {
    router.push('/dashboard');
    return null;
  }

  if (loading) {
    return (
      <Layout fullWidth>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
          <div className="text-xl text-gray-600">Loading work centers...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="w-full space-y-4 p-4 lg:p-6">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 shadow-2xl rounded-2xl p-5 md:p-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                  <WrenchScrewdriverIcon className="w-7 h-7 text-yellow-300" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Work Center Management
                  </h1>
                  <p className="text-sm text-blue-200/80 mt-0.5">
                    Manage work centers for each traveler type ({workCenters.length} work centers)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search work centers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 rounded-xl border-0 w-full sm:w-64 focus:ring-2 focus:ring-white/50 shadow-md text-sm"
                  />
                </div>
                <button
                  onClick={() => { setFormData({ name: '', code: '', description: '' }); setIsAddModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100 text-indigo-700 rounded-xl font-bold shadow-lg transition-all text-sm"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">Add Work Center</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {tabCounts.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSearchTerm(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key ? 'bg-white/20' : 'bg-gray-100'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Work Centers Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 px-3 py-2 rounded-t-xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-14 h-14 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
              </div>
              <div className="relative z-10 flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-white">
                  {TABS.find(t => t.key === activeTab)?.label} Work Centers
                </h2>
                <span className="text-xs font-semibold text-white bg-white/20 px-2 py-0.5 rounded-full">
                  {workCenters.length}
                </span>
              </div>
            </div>

            {(() => {
              const totalPages = Math.ceil(workCenters.length / pageSize);
              const startIdx = (currentPage - 1) * pageSize;
              const paginatedWCs = workCenters.slice(startIdx, startIdx + pageSize);

              return (
                <>
                  {/* Mobile Card View */}
                  <div className="block md:hidden">
                    <div className="divide-y divide-gray-200">
                      {paginatedWCs.map((wc, index) => (
                        <div key={wc.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                              {startIdx + index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900">{wc.name}</div>
                              <div className="text-sm text-gray-500 mt-0.5">{wc.description}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditModal(wc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button onClick={() => openDeleteModal(wc)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800">
                          <th className="px-6 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wider w-16">#</th>
                          <th className="px-6 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wider">Work Center</th>
                          <th className="px-6 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wider">Description</th>
                          <th className="px-6 py-4 text-right text-xs font-extrabold text-white uppercase tracking-wider w-32">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedWCs.map((wc, index) => (
                          <tr key={wc.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                                {startIdx + index + 1}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-semibold text-gray-900">{wc.name}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600">{wc.description}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(wc)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openDeleteModal(wc)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {workCenters.length === 0 && (
                    <div className="text-center py-12">
                      <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No work centers found</h3>
                      <p className="mt-1 text-sm text-gray-500">Add a new work center or try a different search term.</p>
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        Showing {startIdx + 1}-{Math.min(startIdx + pageSize, workCenters.length)} of {workCenters.length}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${
                              currentPage === page
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bottom Bar */}
                  <div className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 px-3 py-2 relative overflow-hidden rounded-b-xl">
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="absolute bottom-0 left-0 w-12 h-12 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                    </div>
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="text-xs text-white/80">
                        Showing {workCenters.length} work centers (Page {currentPage} of {totalPages || 1})
                      </span>
                      <span className="text-xs text-white/80 font-medium">
                        {TABS.find(t => t.key === activeTab)?.label}
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Add Work Center Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Work Center</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., WAVE SOLDER"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg px-4 py-3">
                <label className="block text-sm font-bold text-gray-700 mb-1">Traveler Type</label>
                <span className="text-lg font-extrabold text-indigo-700">{TABS.find(t => t.key === activeTab)?.label}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold">
                Cancel
              </button>
              <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
                Add Work Center
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Work Center Modal */}
      {isEditModalOpen && selectedWC && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Work Center</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold">
                Cancel
              </button>
              <button onClick={handleEdit} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedWC && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Work Center</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{selectedWC.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold">
                Cancel
              </button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
