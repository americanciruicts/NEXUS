'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { toast } from 'sonner';
import {
  PrinterIcon,
  ArrowPathIcon,
  TableCellsIcon,
  UserIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  ChartBarIcon
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
      toast.error('Please select a report type first');
      return;
    }

    setLoading(true);
    setReportData(null);

    try {
      if (reportType === 'single_traveler') {
        if (!jobNumber.trim()) {
          toast.error('Please enter a job number');
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
          toast.error('Please enter an operator name');
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
          toast.error('Please enter a work center name');
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
      toast.error('Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    setReportData(null);
    setReportType('');
    setJobNumber('');
    setOperatorName('');
    setWorkCenter('');
    setWorkOrder('');
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
        @media (max-width: 768px) {
          .mobile-hide-report {
            display: none !important;
          }
          .header-buttons {
            flex-direction: column !important;
            width: 100% !important;
          }
          .header-buttons button {
            width: 100% !important;
          }
          /* Increase touch target size on mobile */
          .report-card-btn {
            min-height: 120px !important;
            padding: 1.5rem !important;
          }
          /* Better spacing for date inputs on mobile */
          .date-input-wrapper {
            margin-bottom: 0.75rem !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        {/* Header */}
        <div className="mb-6 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white rounded-2xl p-5 md:p-8 shadow-2xl relative overflow-hidden no-print">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                <ChartBarIcon className="w-7 h-7 text-blue-200" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Reports & Analytics</h1>
                <p className="text-sm text-blue-200/80 mt-0.5">Generate and print labor tracking reports</p>
              </div>
            </div>
            <div className="header-buttons flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center justify-center space-x-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-white/15 hover:bg-white/25 rounded-xl font-semibold border border-white/20 transition-all text-sm"
              >
                <ArrowPathIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Reset</span>
              </button>
              {reportData && (
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center space-x-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-white hover:bg-gray-100 text-indigo-700 rounded-xl font-bold shadow-lg transition-all text-sm"
                >
                  <PrinterIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Print Report</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report Form */}
        <div className="bg-white shadow-xl rounded-xl border-2 border-gray-200 p-8 mb-6 no-print">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Generate Report</h2>

          {/* Report Type Selection - 2x3 Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {/* Single Traveler */}
            <button
              onClick={() => setReportType('single_traveler')}
              className={`group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 ${
                reportType === 'single_traveler' ? 'ring-4 ring-blue-300 scale-[1.03]' : ''
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700"></div>
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="bg-white/15 backdrop-blur-sm p-3 sm:p-3.5 rounded-xl border border-white/20 mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5">Single Traveler</h3>
                <p className="text-[11px] sm:text-xs text-white/70">By job number</p>
                <div className="mt-2.5 flex items-center gap-1 text-white/50 group-hover:text-white transition-colors duration-300">
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Select</span>
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* All Travelers */}
            <button
              onClick={() => setReportType('all_travelers')}
              className={`group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 ${
                reportType === 'all_travelers' ? 'ring-4 ring-green-300 scale-[1.03]' : ''
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700"></div>
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="bg-white/15 backdrop-blur-sm p-3 sm:p-3.5 rounded-xl border border-white/20 mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5">All Travelers</h3>
                <p className="text-[11px] sm:text-xs text-white/70">Complete traveler report</p>
                <div className="mt-2.5 flex items-center gap-1 text-white/50 group-hover:text-white transition-colors duration-300">
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Select</span>
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Single Operator */}
            <button
              onClick={() => setReportType('single_operator')}
              className={`group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 ${
                reportType === 'single_operator' ? 'ring-4 ring-purple-300 scale-[1.03]' : ''
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-violet-700"></div>
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="bg-white/15 backdrop-blur-sm p-3 sm:p-3.5 rounded-xl border border-white/20 mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5">Single Operator</h3>
                <p className="text-[11px] sm:text-xs text-white/70">By operator name</p>
                <div className="mt-2.5 flex items-center gap-1 text-white/50 group-hover:text-white transition-colors duration-300">
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Select</span>
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* All Operators */}
            <button
              onClick={() => setReportType('all_operators')}
              className={`group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 ${
                reportType === 'all_operators' ? 'ring-4 ring-orange-300 scale-[1.03]' : ''
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-700"></div>
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="bg-white/15 backdrop-blur-sm p-3 sm:p-3.5 rounded-xl border border-white/20 mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5">All Operators</h3>
                <p className="text-[11px] sm:text-xs text-white/70">Complete operator report</p>
                <div className="mt-2.5 flex items-center gap-1 text-white/50 group-hover:text-white transition-colors duration-300">
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Select</span>
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Single Work Center */}
            <button
              onClick={() => setReportType('single_work_center')}
              className={`group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 ${
                reportType === 'single_work_center' ? 'ring-4 ring-cyan-300 scale-[1.03]' : ''
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-cyan-700"></div>
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="bg-white/15 backdrop-blur-sm p-3 sm:p-3.5 rounded-xl border border-white/20 mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5">Single Work Center</h3>
                <p className="text-[11px] sm:text-xs text-white/70">By work center name</p>
                <div className="mt-2.5 flex items-center gap-1 text-white/50 group-hover:text-white transition-colors duration-300">
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Select</span>
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* All Work Centers */}
            <button
              onClick={() => setReportType('all_work_centers')}
              className={`group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 ${
                reportType === 'all_work_centers' ? 'ring-4 ring-teal-300 scale-[1.03]' : ''
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-teal-700"></div>
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="bg-white/15 backdrop-blur-sm p-3 sm:p-3.5 rounded-xl border border-white/20 mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5">All Work Centers</h3>
                <p className="text-[11px] sm:text-xs text-white/70">Complete work center report</p>
                <div className="mt-2.5 flex items-center gap-1 text-white/50 group-hover:text-white transition-colors duration-300">
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Select</span>
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <th className="mobile-hide-report border-r-2 border-white/30 px-4 py-3 text-left font-bold">Date</th>
                    <th className="border-r-2 border-white/30 px-4 py-3 text-left font-bold">Job #</th>
                    <th className="mobile-hide-report border-r-2 border-white/30 px-4 py-3 text-left font-bold">Part #</th>
                    <th className="mobile-hide-report border-r-2 border-white/30 px-4 py-3 text-left font-bold">Description</th>
                    <th className="mobile-hide-report border-r-2 border-white/30 px-4 py-3 text-left font-bold">Operator</th>
                    <th className="border-r-2 border-white/30 px-4 py-3 text-left font-bold">Work Center</th>
                    <th className="mobile-hide-report border-r-2 border-white/30 px-4 py-3 text-left font-bold">Start Time</th>
                    <th className="mobile-hide-report border-r-2 border-white/30 px-4 py-3 text-left font-bold">End Time</th>
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
                        <td className="mobile-hide-report border-r-2 border-gray-200 px-4 py-3">
                          {new Date(entry.start_time).toLocaleDateString()}
                        </td>
                        <td className="border-r-2 border-gray-200 px-4 py-3 font-semibold">
                          {entry.traveler?.job_number || 'N/A'}
                        </td>
                        <td className="mobile-hide-report border-r-2 border-gray-200 px-4 py-3">
                          {entry.traveler?.part_number || 'N/A'}
                        </td>
                        <td className="mobile-hide-report border-r-2 border-gray-200 px-4 py-3">
                          {entry.description || entry.traveler?.part_description || 'N/A'}
                        </td>
                        <td className="mobile-hide-report border-r-2 border-gray-200 px-4 py-3 font-semibold">
                          {entry.employee?.username || 'System'}
                        </td>
                        <td className="border-r-2 border-gray-200 px-4 py-3">
                          {entry.work_center || 'N/A'}
                        </td>
                        <td className="mobile-hide-report border-r-2 border-gray-200 px-4 py-3">
                          {new Date(entry.start_time).toLocaleTimeString()}
                        </td>
                        <td className="mobile-hide-report border-r-2 border-gray-200 px-4 py-3">
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
