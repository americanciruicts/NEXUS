'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import {
  PrinterIcon,
  ArrowPathIcon,
  TableCellsIcon,
  UserIcon,
  DocumentTextIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface LaborEntry {
  start_time: string;
  end_time?: string | null;
  hours_worked: number;
  is_completed: boolean;
  work_center?: string;
  description?: string;
  employee?: {
    username: string;
  };
  traveler?: {
    job_number: string;
    part_number: string;
    part_description?: string;
  };
}

export default function ReportsPage() {
  const router = useRouter();
  const [reportType, setReportType] = useState<'single_traveler' | 'all_travelers' | 'single_operator' | 'all_operators' | 'single_work_center' | 'all_work_centers' | ''>('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<LaborEntry[] | null>(null);
  const [reportTitle, setReportTitle] = useState('');

  // Input fields
  const [jobNumber, setJobNumber] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [workCenter, setWorkCenter] = useState('');
  const [workOrder, setWorkOrder] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const generateReport = async () => {
    if (!reportType) {
      alert('Please select a report type first');
      return;
    }

    setLoading(true);
    setReportData(null);

    try {
      if (reportType === 'single_traveler') {
        if (!jobNumber.trim()) {
          alert('Please enter a job number');
          setLoading(false);
          return;
        }

        // Navigate to report page with job number
        router.push(`/reports/view?type=single_traveler&jobNumber=${encodeURIComponent(jobNumber)}&startDate=${startDate}&endDate=${endDate}`);
        setLoading(false);
        return;
      } else if (reportType === 'all_travelers') {
        // Navigate to report page
        router.push(`/reports/view?type=all_travelers&startDate=${startDate}&endDate=${endDate}`);
        setLoading(false);
        return;
      } else if (reportType === 'single_operator') {
        if (!operatorName.trim()) {
          alert('Please enter an operator name');
          setLoading(false);
          return;
        }

        // Navigate to report page
        router.push(`/reports/view?type=single_operator&operatorName=${encodeURIComponent(operatorName)}&startDate=${startDate}&endDate=${endDate}`);
        setLoading(false);
        return;
      } else if (reportType === 'all_operators') {
        // Navigate to report page
        router.push(`/reports/view?type=all_operators&startDate=${startDate}&endDate=${endDate}`);
        setLoading(false);
        return;
      } else if (reportType === 'single_work_center') {
        if (!workCenter.trim()) {
          alert('Please enter a work center name');
          setLoading(false);
          return;
        }
        // Navigate to report page
        router.push(`/reports/view?type=single_work_center&workCenter=${encodeURIComponent(workCenter)}&jobNumber=${encodeURIComponent(jobNumber)}&workOrder=${encodeURIComponent(workOrder)}&startDate=${startDate}&endDate=${endDate}`);
        setLoading(false);
        return;
      } else if (reportType === 'all_work_centers') {
        // Navigate to report page
        router.push(`/reports/view?type=all_work_centers&jobNumber=${encodeURIComponent(jobNumber)}&workOrder=${encodeURIComponent(workOrder)}&startDate=${startDate}&endDate=${endDate}`);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    setReportData(null);
    setJobNumber('');
    setOperatorName('');
    setStartDate('');
    setEndDate('');
  };

  const totalHours = reportData?.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0) || 0;

  return (
    <Layout fullWidth>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        {/* Header */}
        <div className="mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-lg p-6 shadow-lg no-print">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">📊 Reports & Analytics</h1>
              <p className="text-blue-100">Generate and print labor tracking reports</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                className="flex items-center space-x-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-semibold border border-white/30 transition-all"
              >
                <ArrowPathIcon className="h-5 w-5" />
                <span>Refresh</span>
              </button>
              {reportData && (
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-2 px-6 py-3 bg-white hover:bg-gray-100 text-indigo-600 rounded-lg font-bold shadow-lg transition-all"
                >
                  <PrinterIcon className="h-5 w-5" />
                  <span>Print Report</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report Form */}
        <div className="bg-white shadow-xl rounded-xl border-2 border-gray-200 p-8 mb-6 no-print">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Generate Report</h2>

          {/* Report Type Selection - 3x3 Layout */}
          <div className="flex flex-col items-center gap-3 mb-6">
            {/* Row 1: 3 Cards */}
            <div className="grid grid-cols-3 gap-3 w-full">
              <button
                onClick={() => setReportType('single_traveler')}
                className={`p-4 rounded-lg transition-all bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 ${
                  reportType === 'single_traveler'
                    ? 'ring-4 ring-blue-300 shadow-xl scale-105'
                    : 'shadow-lg'
                }`}
              >
                <DocumentTextIcon className="h-10 w-10 mx-auto mb-2 text-white" />
                <div className="text-center font-bold text-base text-white mb-1">Single Traveler</div>
                <div className="text-xs text-blue-100 text-center">By job number</div>
              </button>

              <button
                onClick={() => setReportType('all_travelers')}
                className={`p-4 rounded-lg transition-all bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 ${
                  reportType === 'all_travelers'
                    ? 'ring-4 ring-green-300 shadow-xl scale-105'
                    : 'shadow-lg'
                }`}
              >
                <TableCellsIcon className="h-10 w-10 mx-auto mb-2 text-white" />
                <div className="text-center font-bold text-base text-white mb-1">All Travelers</div>
                <div className="text-xs text-green-100 text-center">All travelers</div>
              </button>

              <button
                onClick={() => setReportType('single_operator')}
                className={`p-4 rounded-lg transition-all bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 ${
                  reportType === 'single_operator'
                    ? 'ring-4 ring-purple-300 shadow-xl scale-105'
                    : 'shadow-lg'
                }`}
              >
                <UserIcon className="h-10 w-10 mx-auto mb-2 text-white" />
                <div className="text-center font-bold text-base text-white mb-1">Single Operator</div>
                <div className="text-xs text-purple-100 text-center">By operator name</div>
              </button>
            </div>

            {/* Row 2: 3 Cards */}
            <div className="grid grid-cols-3 gap-3 w-full">
              <button
                onClick={() => setReportType('all_operators')}
                className={`p-4 rounded-lg transition-all bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 ${
                  reportType === 'all_operators'
                    ? 'ring-4 ring-orange-300 shadow-xl scale-105'
                    : 'shadow-lg'
                }`}
              >
                <UserIcon className="h-10 w-10 mx-auto mb-2 text-white" />
                <div className="text-center font-bold text-base text-white mb-1">All Operators</div>
                <div className="text-xs text-orange-100 text-center">All operators</div>
              </button>

              <button
                onClick={() => setReportType('single_work_center')}
                className={`p-4 rounded-lg transition-all bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 ${
                  reportType === 'single_work_center'
                    ? 'ring-4 ring-cyan-300 shadow-xl scale-105'
                    : 'shadow-lg'
                }`}
              >
                <BuildingOfficeIcon className="h-10 w-10 mx-auto mb-2 text-white" />
                <div className="text-center font-bold text-base text-white mb-1">Single Work Center</div>
                <div className="text-xs text-cyan-100 text-center">By work center</div>
              </button>

              <button
                onClick={() => setReportType('all_work_centers')}
                className={`p-4 rounded-lg transition-all bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 ${
                  reportType === 'all_work_centers'
                    ? 'ring-4 ring-teal-300 shadow-xl scale-105'
                    : 'shadow-lg'
                }`}
              >
                <BuildingOfficeIcon className="h-10 w-10 mx-auto mb-2 text-white" />
                <div className="text-center font-bold text-base text-white mb-1">All Work Centers</div>
                <div className="text-xs text-teal-100 text-center">All work centers</div>
              </button>
            </div>
          </div>

          {/* Input Fields */}
          <div className="space-y-4">
            {reportType === 'single_traveler' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Job Number</label>
                <input
                  type="text"
                  value={jobNumber}
                  onChange={(e) => setJobNumber(e.target.value)}
                  placeholder="e.g., 8744 PART"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-semibold"
                />
              </div>
            )}

            {reportType === 'single_operator' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Operator Name</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="e.g., John Doe"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 font-semibold"
                />
              </div>
            )}

            {reportType === 'single_work_center' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Work Center Name</label>
                <input
                  type="text"
                  value={workCenter}
                  onChange={(e) => setWorkCenter(e.target.value)}
                  placeholder="e.g., Assembly, Testing"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 font-semibold"
                />
              </div>
            )}

            {/* Job Number and Work Order for Work Center Reports */}
            {(reportType === 'single_work_center' || reportType === 'all_work_centers') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Job Number (Optional)</label>
                  <input
                    type="text"
                    value={jobNumber}
                    onChange={(e) => setJobNumber(e.target.value)}
                    placeholder="e.g., J12345"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Work Order (Optional)</label>
                  <input
                    type="text"
                    value={workOrder}
                    onChange={(e) => setWorkOrder(e.target.value)}
                    placeholder="e.g., WO7890"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  />
                </div>
              </div>
            )}

            {/* Date Range */}
            {(reportType === 'all_travelers' || reportType === 'single_operator' || reportType === 'single_work_center' || reportType === 'all_work_centers') && (
              <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Start Date (Optional)</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">End Date (Optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              </div>
            )}

            {/* Generate Button - Only show when card is selected */}
            {reportType && (
              <button
                onClick={generateReport}
                disabled={loading}
                className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-bold text-lg shadow-lg transition-all disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            )}
          </div>
        </div>

        {/* Report Table */}
        {reportData && (
          <div className="bg-white shadow-xl rounded-xl border-2 border-gray-200 p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{reportTitle}</h2>
              <div className="flex items-center space-x-6 text-sm">
                <div>
                  <span className="font-semibold text-gray-600">Total Entries:</span>
                  <span className="ml-2 text-gray-900 font-bold">{reportData.length}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Total Hours:</span>
                  <span className="ml-2 text-gray-900 font-bold">{totalHours.toFixed(2)}</span>
                </div>
                {(startDate || endDate) && (
                  <div>
                    <span className="font-semibold text-gray-600">Period:</span>
                    <span className="ml-2 text-gray-900">{startDate || 'All'} to {endDate || 'Present'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-2 border-gray-300">
                <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <tr>
                    <th className="border-r-2 border-white/30 px-4 py-3 text-left font-bold">Date</th>
                    <th className="border-r-2 border-white/30 px-4 py-3 text-left font-bold">Job #</th>
                    <th className="border-r-2 border-white/30 px-4 py-3 text-left font-bold">Part #</th>
                    <th className="border-r-2 border-white/30 px-4 py-3 text-left font-bold">Description</th>
                    <th className="border-r-2 border-white/30 px-4 py-3 text-left font-bold">Operator</th>
                    <th className="border-r-2 border-white/30 px-4 py-3 text-left font-bold">Work Center</th>
                    <th className="border-r-2 border-white/30 px-4 py-3 text-left font-bold">Start Time</th>
                    <th className="border-r-2 border-white/30 px-4 py-3 text-left font-bold">End Time</th>
                    <th className="px-4 py-3 text-left font-bold">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-500 border-2 border-gray-200">
                        No data found for the selected criteria
                      </td>
                    </tr>
                  ) : (
                    reportData.map((entry, index) => (
                      <tr key={index} className="border-b-2 border-gray-200 hover:bg-blue-50">
                        <td className="border-r-2 border-gray-200 px-4 py-3">
                          {new Date(entry.start_time).toLocaleDateString()}
                        </td>
                        <td className="border-r-2 border-gray-200 px-4 py-3 font-semibold">
                          {entry.traveler?.job_number || 'N/A'}
                        </td>
                        <td className="border-r-2 border-gray-200 px-4 py-3">
                          {entry.traveler?.part_number || 'N/A'}
                        </td>
                        <td className="border-r-2 border-gray-200 px-4 py-3">
                          {entry.description || entry.traveler?.part_description || 'N/A'}
                        </td>
                        <td className="border-r-2 border-gray-200 px-4 py-3 font-semibold">
                          {entry.employee?.username || 'System'}
                        </td>
                        <td className="border-r-2 border-gray-200 px-4 py-3">
                          {entry.work_center || 'N/A'}
                        </td>
                        <td className="border-r-2 border-gray-200 px-4 py-3">
                          {new Date(entry.start_time).toLocaleTimeString()}
                        </td>
                        <td className="border-r-2 border-gray-200 px-4 py-3">
                          {entry.end_time ? new Date(entry.end_time).toLocaleTimeString() : 'In Progress'}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {entry.hours_worked.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
