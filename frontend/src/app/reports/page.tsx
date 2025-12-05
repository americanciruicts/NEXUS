'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { DocumentArrowDownIcon, ClockIcon, TableCellsIcon, UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface TrackingEntry {
  job_number: string;
  work_center: string;
  start_time: string;
  end_time: string;
  duration: string;
}

interface LaborEntry {
  job_number?: string;
  traveler?: {
    job_number: string;
  };
  description: string;
  start_time: string;
  end_time: string | null;
  is_completed: boolean;
}

interface EmployeeSummary {
  employee_id: number;
  employee_name: string;
  total_hours: number;
  weekly_breakdown: Array<{
    week_start: string;
    week_end: string;
    hours: number;
  }>;
  monthly_breakdown: Array<{
    month: string;
    month_name: string;
    hours: number;
  }>;
  daily_breakdown: Array<{
    date: string;
    hours: number;
  }>;
}

interface LaborHoursSummary {
  period_days: number;
  employees: EmployeeSummary[];
  total_employees: number;
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [laborSummary, setLaborSummary] = useState<LaborHoursSummary | null>(null);
  const [summaryPeriod, setSummaryPeriod] = useState(30);
  const [expandedEmployee, setExpandedEmployee] = useState<number | null>(null);

  const downloadTravelerTracking = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexus_token');

      // Fetch traveler tracking data from backend (completed labor entries)
      const response = await fetch('http://acidashboard.aci.local:100/api/labor/my-entries?days=365', {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch traveler tracking data');
      }

      let data = await response.json();

      // Only include completed entries
      data = data.filter((entry: LaborEntry) => entry.is_completed);

      // Fetch traveler info for each entry
      const entriesWithDetails = await Promise.all(
        data.map(async (entry: LaborEntry) => {
          try {
            const travelerResponse = await fetch(`http://acidashboard.aci.local:100/api/travelers/${(entry as never)['traveler_id']}`, {
              headers: {
                'Authorization': `Bearer ${token || 'mock-token'}`
              }
            });

            let job_number = `Traveler #${(entry as never)['traveler_id']}`;
            if (travelerResponse.ok) {
              const traveler = await travelerResponse.json();
              job_number = traveler.job_number;
            }

            // Extract work center and operator from description
            const parts = entry.description?.split(' - ') || [];
            const work_center = parts[0] || 'N/A';

            return {
              job_number,
              work_center,
              start_time: entry.start_time,
              end_time: entry.end_time || '',
              hours_worked: (entry as never)['hours_worked'] || 0
            };
          } catch (err) {
            console.error('Error fetching traveler info:', err);
            return null;
          }
        })
      );

      const validData = entriesWithDetails.filter((entry): entry is { job_number: string; work_center: string; start_time: string; end_time: string; hours_worked: number } => entry !== null);

      // Filter by date if provided
      let filteredData = validData;
      if (startDate || endDate) {
        filteredData = validData.filter((entry) => {
          const entryDate = new Date(entry.start_time);
          const matchStart = !startDate || entryDate >= new Date(startDate);
          const matchEnd = !endDate || entryDate <= new Date(endDate);
          return matchStart && matchEnd;
        });
      }

      if (filteredData.length === 0) {
        alert('No traveler tracking data found for the selected date range');
        return;
      }

      // Create CSV content
      const headers = ['Job Number', 'Work Center', 'Start Time', 'End Time', 'Total Hours'];
      const rows = filteredData.map((entry) => [
        entry.job_number,
        entry.work_center,
        new Date(entry.start_time).toLocaleString(),
        entry.end_time ? new Date(entry.end_time).toLocaleString() : '',
        entry.hours_worked.toFixed(2)
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traveler_tracking_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert(`✅ Downloaded ${filteredData.length} traveler tracking records`);
    } catch (error) {
      console.error('Error downloading:', error);
      alert('❌ Error downloading report');
    } finally {
      setLoading(false);
    }
  };

  // Fetch labor hours summary on component mount
  useEffect(() => {
    fetchLaborSummary();
  }, [summaryPeriod]);

  const fetchLaborSummary = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`http://acidashboard.aci.local:100/api/labor/hours-summary?days=${summaryPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLaborSummary(data);
      }
    } catch (error) {
      console.error('Error fetching labor summary:', error);
    }
  };

  const downloadLaborSummaryCSV = () => {
    if (!laborSummary || laborSummary.employees.length === 0) {
      alert('❌ No data available to download');
      return;
    }

    // Create CSV with weekly and monthly summaries
    const headers = ['Employee Name', 'Total Hours', 'Week Range', 'Weekly Hours', 'Month', 'Monthly Hours'];
    const rows: string[][] = [];

    laborSummary.employees.forEach((employee) => {
      const maxRows = Math.max(
        employee.weekly_breakdown.length,
        employee.monthly_breakdown.length
      );

      for (let i = 0; i < maxRows; i++) {
        const weekly = employee.weekly_breakdown[i];
        const monthly = employee.monthly_breakdown[i];

        rows.push([
          i === 0 ? employee.employee_name : '',
          i === 0 ? employee.total_hours.toString() : '',
          weekly ? `${weekly.week_start} to ${weekly.week_end}` : '',
          weekly ? weekly.hours.toString() : '',
          monthly ? monthly.month_name : '',
          monthly ? monthly.hours.toString() : ''
        ]);
      }

      // Add empty row between employees
      rows.push(['', '', '', '', '', '']);
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labor_hours_summary_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    alert(`✅ Downloaded labor hours summary for ${laborSummary.total_employees} employees`);
  };

  const downloadLaborTracking = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexus_token');

      // Fetch labor data from backend
      const response = await fetch('http://acidashboard.aci.local:100/api/labor/', {
        headers: {
          'Authorization': `Bearer ${token || 'mock-token'}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch labor data');
      }

      let data: LaborEntry[] = await response.json();

      // Filter by date if provided
      if (startDate || endDate) {
        data = data.filter((entry: LaborEntry) => {
          const entryDate = new Date(entry.start_time);
          const matchStart = !startDate || entryDate >= new Date(startDate);
          const matchEnd = !endDate || entryDate <= new Date(endDate);
          return matchStart && matchEnd;
        });
      }

      // Create CSV content
      const headers = ['Job Number', 'Description', 'Start Time', 'End Time', 'Duration (mins)', 'Status'];
      const rows = data.map((entry: LaborEntry) => {
        const startMs = new Date(entry.start_time).getTime();
        const endMs = entry.end_time ? new Date(entry.end_time).getTime() : Date.now();
        const durationMins = Math.round((endMs - startMs) / 60000);

        return [
          entry.job_number || 'N/A',
          entry.description || '',
          new Date(entry.start_time).toLocaleString(),
          entry.end_time ? new Date(entry.end_time).toLocaleString() : 'In Progress',
          durationMins,
          entry.is_completed ? 'Completed' : 'In Progress'
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((row: (string | number)[]) => row.join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `labor_tracking_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert(`✅ Downloaded ${data.length} labor tracking records`);
    } catch (error) {
      console.error('Error downloading:', error);
      alert('❌ Error downloading report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="w-full space-y-4 p-4 lg:p-6">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 shadow-lg rounded-lg p-6">
            <h1 className="text-2xl font-bold text-white mb-1">Reports & Downloads</h1>
            <p className="text-sm text-blue-100">Download tracking data with start and end times</p>
          </div>

          {/* Date Filters */}
          <div className="bg-white shadow-lg rounded-lg border-2 border-indigo-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Date Range Filter
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Leave blank to download all records
            </p>
          </div>

          {/* Download Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Traveler Tracking Report */}
            <div className="bg-white shadow-lg rounded-lg border-2 border-emerald-200 hover:border-emerald-400 transition-all p-6 hover:shadow-xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center shadow-md">
                  <TableCellsIcon className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Traveler Tracking</h3>
                  <p className="text-sm text-emerald-600 font-medium">Work center movements</p>
                </div>
              </div>
              <div className="space-y-2 mb-5 text-sm text-gray-700 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                <p className="flex items-center"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>Job Number</p>
                <p className="flex items-center"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>Work Center</p>
                <p className="flex items-center"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>Start Time & End Time</p>
                <p className="flex items-center"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>Duration</p>
              </div>
              <button
                onClick={downloadTravelerTracking}
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center"
              >
                <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                Download CSV
              </button>
            </div>

            {/* Labor Tracking Report */}
            <div className="bg-white shadow-lg rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-all p-6 hover:shadow-xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center shadow-md">
                  <ClockIcon className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Labor Tracking</h3>
                  <p className="text-sm text-blue-600 font-medium">Time & labor data</p>
                </div>
              </div>
              <div className="space-y-2 mb-5 text-sm text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="flex items-center"><span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>Job Number</p>
                <p className="flex items-center"><span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>Description</p>
                <p className="flex items-center"><span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>Start Time & End Time</p>
                <p className="flex items-center"><span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>Duration & Status</p>
              </div>
              <button
                onClick={downloadLaborTracking}
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center"
              >
                <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                Download CSV
              </button>
            </div>
          </div>

          {/* Labor Hours Summary Section */}
          <div className="bg-white shadow-lg rounded-lg border-2 border-purple-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center shadow-md">
                  <UserGroupIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Labor Hours Summary</h2>
                  <p className="text-sm text-purple-600">Employee hours breakdown by week and month</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={summaryPeriod}
                  onChange={(e) => setSummaryPeriod(Number(e.target.value))}
                  className="px-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={60}>Last 60 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
                <button
                  onClick={downloadLaborSummaryCSV}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center"
                >
                  <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                  Download CSV
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            {laborSummary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Total Employees</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{laborSummary.total_employees}</p>
                    </div>
                    <UserGroupIcon className="w-10 h-10 text-purple-400" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Hours</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {laborSummary.employees.reduce((sum, emp) => sum + emp.total_hours, 0).toFixed(2)}
                      </p>
                    </div>
                    <ClockIcon className="w-10 h-10 text-blue-400" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Average Hours/Employee</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {laborSummary.total_employees > 0
                          ? (laborSummary.employees.reduce((sum, emp) => sum + emp.total_hours, 0) / laborSummary.total_employees).toFixed(2)
                          : '0.00'}
                      </p>
                    </div>
                    <ChartBarIcon className="w-10 h-10 text-green-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Employee Table */}
            <div className="overflow-x-auto">
              {!laborSummary ? (
                <div className="text-center py-8 text-gray-500">
                  Loading labor hours summary...
                </div>
              ) : laborSummary.employees.length === 0 ? (
                <div className="text-center py-12">
                  <UserGroupIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Labor Data Available</h3>
                  <p className="text-gray-500">No completed labor entries found for the selected period.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Employee Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Total Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Weekly Average</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {laborSummary.employees.map((employee) => (
                      <>
                        <tr key={employee.employee_id} className="hover:bg-purple-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                                {employee.employee_name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{employee.employee_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-purple-600">{employee.total_hours.toFixed(2)} hrs</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {employee.weekly_breakdown.length > 0
                                ? (employee.total_hours / employee.weekly_breakdown.length).toFixed(2)
                                : '0.00'} hrs/week
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => setExpandedEmployee(expandedEmployee === employee.employee_id ? null : employee.employee_id)}
                              className="text-purple-600 hover:text-purple-900 font-semibold"
                            >
                              {expandedEmployee === employee.employee_id ? 'Hide Details' : 'Show Details'}
                            </button>
                          </td>
                        </tr>
                        {expandedEmployee === employee.employee_id && (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Weekly Breakdown */}
                                <div>
                                  <h4 className="text-sm font-bold text-purple-700 mb-3 flex items-center">
                                    <ClockIcon className="w-4 h-4 mr-2" />
                                    Weekly Breakdown
                                  </h4>
                                  <div className="space-y-2">
                                    {employee.weekly_breakdown.map((week, idx) => (
                                      <div key={idx} className="flex justify-between items-center bg-white rounded-lg p-3 border border-purple-200">
                                        <span className="text-sm text-gray-700">
                                          {new Date(week.week_start).toLocaleDateString()} - {new Date(week.week_end).toLocaleDateString()}
                                        </span>
                                        <span className="text-sm font-bold text-purple-600">{week.hours.toFixed(2)} hrs</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Monthly Breakdown */}
                                <div>
                                  <h4 className="text-sm font-bold text-purple-700 mb-3 flex items-center">
                                    <ChartBarIcon className="w-4 h-4 mr-2" />
                                    Monthly Breakdown
                                  </h4>
                                  <div className="space-y-2">
                                    {employee.monthly_breakdown.map((month, idx) => (
                                      <div key={idx} className="flex justify-between items-center bg-white rounded-lg p-3 border border-purple-200">
                                        <span className="text-sm text-gray-700">{month.month_name}</span>
                                        <span className="text-sm font-bold text-purple-600">{month.hours.toFixed(2)} hrs</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-indigo-900">Download Information</h3>
                <div className="mt-2 text-sm text-indigo-800 space-y-1">
                  <p className="flex items-center"><span className="mr-2">📊</span>Reports are downloaded as CSV files that can be opened in Excel or Google Sheets.</p>
                  <p className="flex items-center"><span className="mr-2">🕐</span>All times are shown in your local timezone.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
