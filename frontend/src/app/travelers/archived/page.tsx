'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import {
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
  TrashIcon,
  EyeIcon,
  CheckIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';

type ArchivedTraveler = {
  id: number;
  job_number: string;
  work_order_number: string;
  part_number: string;
  part_description: string;
  revision: string;
  quantity: number;
  customer_code: string;
  customer_name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export default function ArchivedTravelersPage() {
  const { user } = useAuth();
  const [travelers, setTravelers] = useState<ArchivedTraveler[]>([]);
  const [selectedTravelers, setSelectedTravelers] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchivedTravelers();
  }, []);

  const fetchArchivedTravelers = async () => {
    try {
      const response = await fetch('http://acidashboard.aci.local:100/api/travelers/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nexus_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter only archived travelers
        const archivedData = data.filter((t: ArchivedTraveler) => t.status === 'ARCHIVED');
        setTravelers(archivedData);
      }
    } catch (error) {
      console.error('Error fetching archived travelers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTravelers = travelers.filter(t =>
    t.job_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.part_description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: number) => {
    if (selectedTravelers.includes(id)) {
      setSelectedTravelers(selectedTravelers.filter(tid => tid !== id));
    } else {
      setSelectedTravelers([...selectedTravelers, id]);
    }
  };

  const selectAll = () => {
    if (selectedTravelers.length === filteredTravelers.length) {
      setSelectedTravelers([]);
    } else {
      setSelectedTravelers(filteredTravelers.map(t => t.id));
    }
  };

  const restoreSelected = async () => {
    if (selectedTravelers.length === 0) {
      alert('❌ Please select travelers to restore');
      return;
    }

    if (!confirm(`Restore ${selectedTravelers.length} traveler(s) to active status?`)) return;

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
      fetchArchivedTravelers();
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

    if (!confirm(`⚠️ PERMANENT DELETE\n\nThis will permanently delete ${selectedTravelers.length} traveler(s)!\n\nThis action CANNOT be undone. Are you absolutely sure?`)) return;

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

      alert(`✅ Permanently deleted ${selectedTravelers.length} traveler(s)!`);
      setSelectedTravelers([]);
      fetchArchivedTravelers();
    } catch (error) {
      console.error('Error deleting travelers:', error);
      alert('❌ Failed to delete travelers');
    }
  };

  if (loading) {
    return (
      <Layout fullWidth>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 p-6 flex items-center justify-center">
          <div className="text-xl text-gray-600">Loading archived travelers...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 p-6">
        {/* Header */}
        <div className="mb-6 bg-gradient-to-r from-gray-700 via-gray-800 to-slate-900 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2 flex items-center">
                <ArchiveBoxIcon className="h-8 w-8 mr-3" />
                Archived Travelers
              </h1>
              <p className="text-gray-300">View and manage archived production travelers</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4 border border-white/30">
              <div className="text-3xl font-bold">{travelers.length}</div>
              <div className="text-xs text-gray-300">Total Archived</div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 bg-white rounded-xl shadow-lg border-2 border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Back Button */}
            <Link
              href="/travelers"
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold shadow-md"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Back to Travelers</span>
            </Link>

            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <input
                type="text"
                placeholder="Search archived travelers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={selectAll}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold shadow-md"
              >
                <CheckIcon className="h-5 w-5" />
                <span>{selectedTravelers.length === filteredTravelers.length ? 'Deselect All' : 'Select All'}</span>
              </button>

              <button
                onClick={restoreSelected}
                disabled={selectedTravelers.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold shadow-md disabled:cursor-not-allowed"
              >
                <ArchiveBoxXMarkIcon className="h-5 w-5" />
                <span>Restore ({selectedTravelers.length})</span>
              </button>

              <button
                onClick={deleteSelected}
                disabled={selectedTravelers.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold shadow-md disabled:cursor-not-allowed"
              >
                <TrashIcon className="h-5 w-5" />
                <span>Permanently Delete ({selectedTravelers.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Archived Travelers List */}
        {filteredTravelers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-gray-200">
            <ArchiveBoxIcon className="h-24 w-24 mx-auto mb-4 text-gray-300" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Archived Travelers</h3>
            <p className="text-gray-600">Archived travelers will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTravelers.map((traveler) => (
              <div
                key={traveler.id}
                className={`bg-white rounded-xl shadow-lg border-2 ${
                  selectedTravelers.includes(traveler.id)
                    ? 'border-gray-500 ring-4 ring-gray-200'
                    : 'border-gray-200'
                } p-6 transition-all hover:shadow-xl`}
              >
                <div className="flex items-start space-x-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedTravelers.includes(traveler.id)}
                    onChange={() => toggleSelect(traveler.id)}
                    className="mt-2 h-6 w-6 text-gray-600 rounded-lg cursor-pointer"
                  />

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-2xl font-bold text-gray-900">{traveler.job_number}</h3>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2 border-gray-300 bg-gradient-to-r from-gray-50 to-slate-50 text-gray-800 shadow-sm">
                            ARCHIVED
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 font-semibold">Part Number</p>
                            <p className="text-gray-900 font-bold">{traveler.part_number}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-semibold">Description</p>
                            <p className="text-gray-900">{traveler.part_description}</p>
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
                        <div className="mt-3 text-xs text-gray-500">
                          <p>Archived: {new Date(traveler.updated_at).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* View Button */}
                      <Link
                        href={`/travelers/${traveler.id}`}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
