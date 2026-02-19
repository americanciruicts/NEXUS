'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { WrenchScrewdriverIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import {
  PCB_ASSEMBLY_WORK_CENTERS,
  PCB_WORK_CENTERS,
  CABLES_WORK_CENTERS,
  PURCHASING_WORK_CENTERS,
  WorkCenterItem,
} from '@/data/workCenters';

const TABS = [
  { key: 'PCB_ASSEMBLY', label: 'PCB Assembly', data: PCB_ASSEMBLY_WORK_CENTERS },
  { key: 'PCB', label: 'PCB', data: PCB_WORK_CENTERS },
  { key: 'CABLES', label: 'Cables', data: CABLES_WORK_CENTERS },
  { key: 'PURCHASING', label: 'Purchasing', data: PURCHASING_WORK_CENTERS },
] as const;

export default function WorkCenterManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('PCB_ASSEMBLY');
  const [searchTerm, setSearchTerm] = useState('');

  if (user?.role !== 'ADMIN') {
    router.push('/dashboard');
    return null;
  }

  const currentTab = TABS.find((t) => t.key === activeTab) || TABS[0];
  const filteredWorkCenters = currentTab.data.filter(
    (wc) =>
      wc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wc.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                    View work centers for each traveler type ({filteredWorkCenters.length} work centers)
                  </p>
                </div>
              </div>
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
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => (
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
                  {tab.data.length}
                </span>
              </button>
            ))}
          </div>

          {/* Work Centers Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 px-3 py-2 rounded-t-xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-14 h-14 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
              </div>
              <div className="relative z-10 flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-white">{currentTab.label} Work Centers</h2>
                <span className="text-xs font-semibold text-white bg-white/20 px-2 py-0.5 rounded-full">
                  {filteredWorkCenters.length}
                </span>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden">
              <div className="divide-y divide-gray-200">
                {filteredWorkCenters.map((wc, index) => (
                  <div key={wc.name} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{wc.name}</div>
                        <div className="text-sm text-gray-500 mt-0.5">{wc.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto relative">
              <div className="absolute top-0 left-0 right-0 h-14 overflow-hidden pointer-events-none z-20">
                <div className="absolute top-0 right-8 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2" />
                <div className="absolute top-2 left-12 w-12 h-12 bg-white/10 rounded-full" />
                <div className="absolute top-0 right-1/3 w-8 h-8 bg-white/5 rounded-full translate-y-1" />
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800">
                    <th className="px-6 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wider w-16">
                      #
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wider">
                      Work Center
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWorkCenters.map((wc, index) => (
                    <tr key={wc.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">{wc.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{wc.description}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredWorkCenters.length === 0 && (
              <div className="text-center py-12">
                <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No work centers found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try a different search term or switch tabs.
                </p>
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
                  Showing {filteredWorkCenters.length} of {currentTab.data.length} work centers
                </span>
                <span className="text-xs text-white/80 font-medium">
                  {currentTab.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
