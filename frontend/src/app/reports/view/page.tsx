'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '@/config/api';

const REPORT_THEMES = {
  single_traveler: { primary: '#3B82F6', secondary: '#DBEAFE', name: 'Single Traveler Tracking Report' },
  all_travelers: { primary: '#22C55E', secondary: '#DCFCE7', name: 'All Travelers Tracking Report' },
  single_operator: { primary: '#A855F7', secondary: '#F3E8FF', name: 'Single Operator Labor Report' },
  all_operators: { primary: '#F97316', secondary: '#FFEDD5', name: 'All Operators Labor Report' },
  single_work_center: { primary: '#06B6D4', secondary: '#CFFAFE', name: 'Single Work Center Report' },
  all_work_centers: { primary: '#14B8A6', secondary: '#CCFBF1', name: 'All Work Centers Report' },
  single_category: { primary: '#E11D48', secondary: '#FFE4E6', name: 'Single Category Report' },
  all_categories: { primary: '#EC4899', secondary: '#FCE7F3', name: 'All Categories Report' }
};

function ReportViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as keyof typeof REPORT_THEMES;
  const jobNumber = searchParams.get('jobNumber');
  const operatorName = searchParams.get('operatorName');
  const workCenter = searchParams.get('workCenter');
  const workOrder = searchParams.get('workOrder');
  const categoryParam = searchParams.get('category');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const [travelerData, setTravelerData] = useState<any[]>([]);
  const [laborData, setLaborData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalHours, setTotalHours] = useState(0);

  const theme = REPORT_THEMES[type] || REPORT_THEMES.single_traveler;

  // Helper function to extract operator name from description
  const extractOperatorName = (description: string) => {
    if (!description) return '';
    const parts = description.split(' - ');
    return parts.length > 1 ? parts[1].trim() : '';
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Helper to filter entries by date range
  const filterByDateRange = (data: any[]) => {
    if (!startDate && !endDate) return data;
    return data.filter((entry: any) => {
      const entryDate = new Date(entry.start_time).toISOString().split('T')[0];
      if (startDate && entryDate < startDate) return false;
      if (endDate && entryDate > endDate) return false;
      return true;
    });
  };

  const fetchReportData = async () => {
    try {
      const token = localStorage.getItem('nexus_token');

      if (type === 'single_traveler' || type === 'all_travelers') {
        const response = await fetch(`${API_BASE_URL}/labor/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('API error');
        let data = await response.json();
        if (type === 'single_traveler' && jobNumber) {
          data = data.filter((entry: any) => entry.job_number === jobNumber);
        }
        // Apply date range filter
        data = filterByDateRange(data);
        const total = data.reduce((sum: number, entry: any) => sum + (entry.hours_worked || 0), 0);
        setTotalHours(total);
        setTravelerData(data);
      } else if (type === 'single_operator' || type === 'all_operators') {
        const response = await fetch(`${API_BASE_URL}/labor/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('API error');
        let data = await response.json();
        if (type === 'single_operator' && operatorName) {
          const searchTerm = operatorName.toLowerCase();
          data = data.filter((entry: any) => {
            const employeeName = entry.employee_name || '';
            return employeeName.toLowerCase().includes(searchTerm);
          });
        }
        // Apply date range filter
        data = filterByDateRange(data);
        const total = data.reduce((sum: number, entry: any) => sum + (entry.hours_worked || 0), 0);
        setTotalHours(total);
        setLaborData(data);
      } else if (type === 'single_work_center' || type === 'all_work_centers') {
        const response = await fetch(`${API_BASE_URL}/labor/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('API error');
        let data = await response.json();

        if (type === 'single_work_center' && workCenter) {
          const searchTerm = workCenter.toLowerCase();
          data = data.filter((entry: any) => {
            const wc = entry.work_center || '';
            return wc.toLowerCase().includes(searchTerm);
          });
        }

        if (jobNumber && jobNumber.trim()) {
          const jobSearchTerm = jobNumber.toLowerCase();
          data = data.filter((entry: any) => {
            const job = entry.job_number || '';
            return job.toLowerCase().includes(jobSearchTerm);
          });
        }

        if (workOrder && workOrder.trim()) {
          const woSearchTerm = workOrder.toLowerCase();
          data = data.filter((entry: any) => {
            const wo = entry.work_order || '';
            return wo.toLowerCase().includes(woSearchTerm);
          });
        }

        // Apply date range filter
        data = filterByDateRange(data);
        const total = data.reduce((sum: number, entry: any) => sum + (entry.hours_worked || 0), 0);
        setTotalHours(total);
        setLaborData(data);
      } else if (type === 'single_category' || type === 'all_categories') {
        const params = new URLSearchParams();
        if (type === 'single_category' && categoryParam) params.append('category', categoryParam);
        if (jobNumber && jobNumber.trim()) params.append('job_number', jobNumber);
        if (workOrder && workOrder.trim()) params.append('work_order', workOrder);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await fetch(`${API_BASE_URL}/labor/category-report?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        const total = data.reduce((sum: number, entry: any) => sum + (entry.hours_worked || 0), 0);
        setTotalHours(total);
        setCategoryData(data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      alert('Error loading report');
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-700 dark:text-slate-300 dark:bg-slate-900 min-h-screen">Loading...</div>;

  // Job number and operator name should only appear in tables, not in header
  const displayJobNumber = null;
  const displayOperator = null;

  // Determine which data to display based on report type
  const isLaborReport = type === 'single_operator' || type === 'all_operators';
  const displayData = isLaborReport ? laborData : travelerData;

  const displayPartNumber = travelerData[0]?.part_number || 'N/A';
  const displayQuantity = travelerData[0]?.quantity || 'N/A';

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen print:bg-white">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: letter portrait; margin: 0.25in; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
          }
          /* Force light mode colors in print */
          .print-version,
          .print-version * {
            color: #1f2937 !important;
            background-color: transparent !important;
          }
          .print-version {
            display: block !important;
            padding: 0 !important;
            background: white !important;
            min-height: auto !important;
          }
          .print-version > div {
            max-width: 100% !important;
            padding: 20px !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          /* Print table borders - clean thin lines */
          table {
            border: 1px solid #d1d5db !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th {
            border: 1px solid #d1d5db !important;
            color: white !important;
          }
          td {
            border: 1px solid #e5e7eb !important;
            color: #374151 !important;
          }
          thead tr {
            background: linear-gradient(135deg, #2563eb 0%, #4338ca 50%, #6b21a8 100%) !important;
          }
          tbody tr {
            border-bottom: 1px solid #e5e7eb !important;
          }
          /* Alternating row colors in print */
          tbody tr:nth-child(even) {
            background-color: #f5f3ff !important;
          }
          tbody tr:nth-child(odd) {
            background-color: white !important;
          }
          /* Footer row */
          tfoot tr {
            background-color: #eef2ff !important;
          }
          tfoot td {
            color: #4338ca !important;
            font-weight: bold !important;
          }
          /* Green hours text */
          .text-green-600, .text-green-400 {
            color: #16a34a !important;
          }
          /* Info box print styles */
          .info-box-print {
            border: 1px solid #4338ca !important;
            background: white !important;
          }
          /* Print layout - 3 columns x 2 rows grid */
          .info-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px 16px !important;
          }
          .info-grid > div {
            white-space: nowrap !important;
          }
          /* CRITICAL: Ensure mobile-hide columns are ALWAYS visible in print, even on mobile devices */
          .mobile-hide,
          th.mobile-hide,
          td.mobile-hide {
            display: table-cell !important;
            visibility: visible !important;
            opacity: 1 !important;
            max-width: none !important;
            width: auto !important;
          }
          /* Hide mobile-only elements in print */
          .mobile-show {
            display: none !important;
          }
          /* Ensure tables don't overflow in print */
          .print-version table {
            font-size: 8px !important;
          }
          .print-version th,
          .print-version td {
            padding: 4px 6px !important;
            font-size: 8px !important;
          }
        }
        /* Mobile-specific styles - ONLY for screen display, not print */
        @media screen and (max-width: 768px) {
          .report-header-content {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
          .report-buttons {
            flex-direction: column !important;
            width: 100% !important;
          }
          .report-buttons button {
            width: 100% !important;
            justify-content: center !important;
          }
          .report-inner-header {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .report-inner-header > div:last-child {
            text-align: left !important;
            margin-top: 8px !important;
          }
          /* Hide tables on mobile, show card view instead */
          .desktop-table {
            display: none !important;
          }
          .mobile-card-view {
            display: block !important;
          }
          /* Improve table container on mobile */
          .print-version {
            padding: 8px !important;
          }
          .print-version > div {
            padding: 12px !important;
          }
          /* Stack information grid vertically on mobile */
          .info-grid {
            flex-direction: column !important;
            gap: 4px !important;
          }
          /* Work center report responsive */
          .traveler-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }
          .traveler-header span {
            font-size: 11px !important;
          }
          .wc-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 4px !important;
          }
          .wc-header span {
            font-size: 10px !important;
          }
          /* Better mobile padding for cards and sections */
          .print-version > div > div:first-child {
            padding: 10px 12px !important;
            margin-bottom: 12px !important;
          }
          /* Mobile responsive info box */
          .print-version > div > div:nth-child(2) {
            padding: 10px !important;
            margin-bottom: 12px !important;
          }
          /* Mobile card styling - using Tailwind classes in JSX */
        }
        /* General mobile-show behavior */
        .mobile-show {
          display: none !important;
        }
        /* Hide mobile card view by default, show only on mobile */
        .mobile-card-view {
          display: none !important;
        }
        /* Always show desktop table by default */
        .desktop-table {
          display: block !important;
        }
      `}</style>

      {/* Header with Action Buttons - Digital Only */}
      <div className="no-print" style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 50%, #6b21a8 100%)',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '8rem', height: '8rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(50%, -50%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '6rem', height: '6rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(-50%, 50%)' }} />
        </div>
        <div className="report-header-content" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div>
            <h1 style={{
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              margin: '0 0 8px 0'
            }}>
              {theme.name}
            </h1>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '11px' }}>
              {displayJobNumber && <span style={{ marginRight: '16px' }}>📋 Job: <strong>{displayJobNumber}</strong></span>}
              {displayOperator && <span style={{ marginRight: '16px' }}>👤 Operator: <strong>{displayOperator}</strong></span>}
              <span>⏱️ Total Hours: <strong>{totalHours.toFixed(2)}</strong></span>
            </div>
          </div>

          <div className="report-buttons" style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => router.back()}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                border: '2px solid rgba(255,255,255,0.3)',
                cursor: 'pointer',
                fontWeight: 'bold',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => router.refresh()}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                border: '2px solid rgba(255,255,255,0.3)',
                cursor: 'pointer',
                fontWeight: 'bold',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => window.print()}
              style={{
                backgroundColor: 'white',
                color: '#4338ca',
                padding: '12px 20px',
                borderRadius: '8px',
                border: '2px solid white',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <PrinterIcon style={{ height: '20px', width: '20px' }} />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Digital View - Professional Layout (Also used for printing) */}
      <div className="print-version bg-gray-100 dark:bg-slate-900 print:!bg-white" style={{ padding: '12px', minHeight: 'calc(100vh - 80px)' }}>
        <div className="bg-white dark:bg-slate-800 print:!bg-white" style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>

          {/* Header Section */}
          <div style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 50%, #6b21a8 100%)',
            padding: '15px 20px',
            marginBottom: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decorative circles */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '8rem', height: '8rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(50%, -50%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '6rem', height: '6rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(-50%, 50%)' }} />
            </div>
            <div className="report-inner-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', marginBottom: '4px', color: 'white' }}>AMERICAN CIRCUITS</h1>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)' }}>Manufacturing Tracking System</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: 'white' }}>{theme.name}</div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.85)' }}>
                  Generated: {new Date().toLocaleString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Traveler/Labor Information Box */}
          <div className="bg-gradient-to-br from-indigo-100 to-white dark:from-indigo-900/30 dark:to-slate-800 print:!bg-white info-box-print" style={{
            border: '1px solid #4338ca',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div className="text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 print:!text-indigo-700 print:!border-indigo-700" style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '12px', borderBottom: '2px solid', paddingBottom: '8px' }}>
              {type === 'single_traveler' ? 'Traveler Information' :
               type === 'all_travelers' ? 'All Travelers Summary' :
               type === 'single_operator' ? 'Operator Information' :
               type === 'all_operators' ? 'All Operators Summary' :
               type === 'single_work_center' ? 'Work Center Report' :
               type === 'all_work_centers' ? 'All Work Centers Report' :
               type === 'single_category' ? 'Category Report' :
               type === 'all_categories' ? 'All Categories Report' : 'Information'}
            </div>
            <div className="info-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: '11px', alignItems: 'center' }}>
              {/* Universal fields for ALL report types */}
              <div><strong>Job Number:</strong> <span className="text-gray-600 dark:text-slate-300">{travelerData[0]?.job_number || laborData[0]?.job_number || categoryData[0]?.job_number || jobNumber || 'N/A'}</span></div>
              <div><strong>Work Order:</strong> <span className="text-gray-600 dark:text-slate-300">{travelerData[0]?.work_order || laborData[0]?.work_order || categoryData[0]?.work_order || workOrder || 'N/A'}</span></div>
              <div><strong>PO Number:</strong> <span className="text-gray-600 dark:text-slate-300">{travelerData[0]?.po_number || laborData[0]?.po_number || categoryData[0]?.po_number || 'N/A'}</span></div>
              <div><strong>Part Number:</strong> <span className="text-gray-600 dark:text-slate-300">{travelerData[0]?.part_number || laborData[0]?.part_number || categoryData[0]?.part_number || 'N/A'}</span></div>
              <div><strong>Quantity:</strong> <span className="text-gray-600 dark:text-slate-300">{travelerData[0]?.quantity || laborData[0]?.quantity || categoryData[0]?.quantity || 'N/A'}</span></div>
              {/* Additional fields for work center reports */}
              {(type === 'single_work_center' || type === 'all_work_centers') && workCenter && (
                <div><strong>Work Center Filter:</strong> <span className="text-gray-600 dark:text-slate-300">{workCenter}</span></div>
              )}
              {/* Additional fields for operator reports */}
              {(type === 'single_operator' || type === 'all_operators') && operatorName && (
                <div><strong>Operator Filter:</strong> <span className="text-gray-600 dark:text-slate-300">{operatorName}</span></div>
              )}
              {/* Additional fields for category reports */}
              {(type === 'single_category') && categoryParam && (
                <div><strong>Category:</strong> <span className="text-gray-600 dark:text-slate-300">{categoryParam}</span></div>
              )}
              <div><strong>Total Hours:</strong> <span className="text-green-600 dark:text-green-400 font-bold">{totalHours.toFixed(2)}</span></div>
            </div>
          </div>

          {/* Traveler Tracking Table - Digital */}
          {!isLaborReport && travelerData.length > 0 && (
            <>
              {/* Desktop Table View */}
              <div className="desktop-table" style={{ overflowX: 'auto', marginBottom: '0', width: '100%', maxWidth: '100%' }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 50%, #6b21a8 100%)', color: 'white' }}>
                      <th style={{ border: '1px solid #e5e7eb', padding: '6px 4px', fontSize: '9px', fontWeight: 'bold', textAlign: 'left', width: '12%', wordWrap: 'break-word' }}>WORK CENTER</th>
                      <th style={{ border: '1px solid #e5e7eb', padding: '6px 4px', fontSize: '9px', fontWeight: 'bold', textAlign: 'left', width: '12%', wordWrap: 'break-word' }}>OPERATOR</th>
                      <th style={{ border: '1px solid #e5e7eb', padding: '6px 4px', fontSize: '9px', fontWeight: 'bold', textAlign: 'left', width: '22%', wordWrap: 'break-word' }}>START TIME</th>
                      <th style={{ border: '1px solid #e5e7eb', padding: '6px 4px', fontSize: '9px', fontWeight: 'bold', textAlign: 'left', width: '22%', wordWrap: 'break-word' }}>END TIME</th>
                      <th style={{ border: '1px solid #e5e7eb', padding: '6px 4px', fontSize: '9px', fontWeight: 'bold', textAlign: 'right', width: '10%', wordWrap: 'break-word' }}>HOURS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {travelerData.map((entry, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-800 print:!bg-white' : 'bg-indigo-50 dark:bg-slate-700/50 print:!bg-indigo-50'}>
                        <td className="text-gray-600 dark:text-slate-300" style={{ border: '1px solid #e5e7eb', padding: '4px', fontSize: '9px', wordWrap: 'break-word', overflow: 'hidden' }}>{entry.work_center}</td>
                        <td className="text-gray-600 dark:text-slate-300" style={{ border: '1px solid #e5e7eb', padding: '4px', fontSize: '9px', wordWrap: 'break-word', overflow: 'hidden' }}>
                          {entry.employee_name || 'N/A'}
                        </td>
                        <td className="text-gray-600 dark:text-slate-300" style={{ border: '1px solid #e5e7eb', padding: '4px', fontSize: '9px', wordWrap: 'break-word', overflow: 'hidden' }}>
                          {new Date(entry.start_time).toLocaleString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </td>
                        <td className="text-gray-600 dark:text-slate-300" style={{ border: '1px solid #e5e7eb', padding: '4px', fontSize: '9px', wordWrap: 'break-word', overflow: 'hidden' }}>
                          {entry.end_time ? new Date(entry.end_time).toLocaleString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          }) : '-'}
                        </td>
                        <td className="text-green-600 dark:text-green-400" style={{ border: '1px solid #e5e7eb', padding: '4px', fontSize: '9px', textAlign: 'right', fontWeight: 'bold', wordWrap: 'break-word', overflow: 'hidden' }}>
                          {entry.hours_worked.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-indigo-50 dark:bg-slate-700/50 print:!bg-indigo-50">
                      <td colSpan={4} className="text-indigo-600 dark:text-indigo-400" style={{ border: '1px solid #4338ca', padding: '8px', fontSize: '11px', fontWeight: 'bold', textAlign: 'right' }}>
                        TOTAL HOURS:
                      </td>
                      <td className="text-green-600 dark:text-green-400" style={{ border: '1px solid #4338ca', padding: '8px', fontSize: '11px', fontWeight: 'bold', textAlign: 'right' }}>
                        {travelerData.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="mobile-card-view space-y-3 p-2">
                {travelerData.map((entry, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 border-2 border-gray-400 dark:border-slate-600 rounded-lg shadow-sm">
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-b-2 border-gray-400 dark:border-slate-600 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{entry.work_center}</span>
                        <span className="text-xs text-blue-100">{entry.employee_name || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3 space-y-3">
                      {/* Date */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Date</label>
                        <div className="text-sm bg-gray-50 dark:bg-slate-700 p-2 rounded text-center">
                          {new Date(entry.start_time).toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                      </div>

                      {/* Time Fields Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Start Time</label>
                          <div className="text-sm bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-center font-medium">
                            {new Date(entry.start_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">End Time</label>
                          <div className="text-sm bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-center font-medium">
                            {entry.end_time ? new Date(entry.end_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            }) : '-'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-1">Total Hours</label>
                          <div className="text-sm font-bold bg-green-50 dark:bg-green-900/30 p-2 rounded text-center text-green-700 dark:text-green-400">
                            {entry.hours_worked.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Total Hours Summary */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 rounded-lg shadow-sm">
                  <div className="text-white font-bold text-center text-base">
                    TOTAL HOURS: {travelerData.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Work Center Reports - Grouped by Traveler */}
          {(type === 'single_work_center' || type === 'all_work_centers') && laborData.length > 0 && (() => {
            // Group data by traveler (job_number + work_order)
            const travelerGroups: Record<string, any[]> = {};
            laborData.forEach(entry => {
              const key = `${entry.job_number || 'N/A'}_${entry.work_order || 'N/A'}`;
              if (!travelerGroups[key]) {
                travelerGroups[key] = [];
              }
              travelerGroups[key].push(entry);
            });

            return (
              <div style={{ marginBottom: '0' }}>
                {Object.entries(travelerGroups).map(([key, entries]) => {
                  const [jobNumber, workOrder] = key.split('_');

                  // Group by work center within this traveler
                  const workCenterGroups: Record<string, any[]> = {};
                  entries.forEach(entry => {
                    const wc = entry.work_center || 'Unknown';
                    if (!workCenterGroups[wc]) {
                      workCenterGroups[wc] = [];
                    }
                    workCenterGroups[wc].push(entry);
                  });

                  const travelerTotal = entries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

                  return (
                    <div key={key} style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
                      {/* Traveler Header */}
                      <div className="traveler-header" style={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 50%, #6b21a8 100%)',
                        padding: '12px 16px',
                        borderRadius: '8px 8px 0 0',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
                          <div style={{ position: 'absolute', top: 0, right: 0, width: '5rem', height: '5rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(50%, -50%)' }} />
                          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '4rem', height: '4rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(-50%, 50%)' }} />
                        </div>
                        <span>Job# {jobNumber} - Work Order# {workOrder}</span>
                        <span>Total: {travelerTotal.toFixed(2)} hrs</span>
                      </div>

                      {/* Work Centers for this Traveler */}
                      <div style={{ border: '1px solid #4338ca', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                        {Object.entries(workCenterGroups).map(([workCenter, wcEntries], wcIndex) => {
                          const wcTotal = wcEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

                          return (
                            <div key={workCenter} style={{
                              borderBottom: wcIndex < Object.keys(workCenterGroups).length - 1 ? '2px solid #e0e0e0' : 'none',
                              padding: '16px'
                            }}>
                              {/* Work Center Header */}
                              <div className="wc-header bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 print:!bg-indigo-100 print:!text-indigo-700" style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                marginBottom: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span>🏭 {workCenter}</span>
                                <span>Work Center Total: {wcTotal.toFixed(2)} hrs</span>
                              </div>

                              {/* Desktop Operators Table */}
                              <div className="desktop-table" style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
                                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr className="bg-gray-50 dark:bg-slate-700 print:!bg-gray-50" style={{ borderBottom: '1px solid #e5e7eb' }}>
                                      <th className="text-gray-600 dark:text-slate-300" style={{ padding: '6px 4px', fontSize: '9px', fontWeight: 'bold', textAlign: 'left', width: '20%', wordWrap: 'break-word' }}>OPERATOR</th>
                                      <th className="text-gray-600 dark:text-slate-300" style={{ padding: '6px 4px', fontSize: '9px', fontWeight: 'bold', textAlign: 'left', width: '30%', wordWrap: 'break-word' }}>START TIME</th>
                                      <th className="text-gray-600 dark:text-slate-300" style={{ padding: '6px 4px', fontSize: '9px', fontWeight: 'bold', textAlign: 'left', width: '30%', wordWrap: 'break-word' }}>END TIME</th>
                                      <th className="text-gray-600 dark:text-slate-300" style={{ padding: '6px 4px', fontSize: '9px', fontWeight: 'bold', textAlign: 'right', width: '20%', wordWrap: 'break-word' }}>HOURS</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {wcEntries.map((entry, i) => (
                                      <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td className="text-gray-600 dark:text-slate-300" style={{ padding: '4px', fontSize: '9px', wordWrap: 'break-word', overflow: 'hidden' }}>
                                          {extractOperatorName(entry.description) || entry.employee_name || 'N/A'}
                                        </td>
                                        <td className="text-gray-600 dark:text-slate-300" style={{ padding: '4px', fontSize: '9px', wordWrap: 'break-word', overflow: 'hidden' }}>
                                          {new Date(entry.start_time).toLocaleString('en-US', {
                                            month: '2-digit',
                                            day: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                          })}
                                        </td>
                                        <td className="text-gray-600 dark:text-slate-300" style={{ padding: '4px', fontSize: '9px', wordWrap: 'break-word', overflow: 'hidden' }}>
                                          {entry.end_time ? new Date(entry.end_time).toLocaleString('en-US', {
                                            month: '2-digit',
                                            day: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                          }) : '-'}
                                        </td>
                                        <td className="text-green-600 dark:text-green-400" style={{ padding: '4px', fontSize: '9px', textAlign: 'right', fontWeight: 'bold', wordWrap: 'break-word', overflow: 'hidden' }}>
                                          {entry.hours_worked.toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile Card View */}
                              <div className="mobile-card-view space-y-3 p-2">
                                {wcEntries.map((entry, i) => (
                                  <div key={i} className="bg-white dark:bg-slate-800 border-2 border-gray-400 dark:border-slate-600 rounded-lg shadow-sm">
                                    {/* Card Header */}
                                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 border-b-2 border-gray-400 dark:border-slate-600 px-3 py-2">
                                      <div className="font-bold text-white text-sm">
                                        {extractOperatorName(entry.description) || entry.employee_name || 'N/A'}
                                      </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-3 space-y-3">
                                      {/* Date */}
                                      <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Date</label>
                                        <div className="text-sm bg-gray-50 dark:bg-slate-700 p-2 rounded text-center">
                                          {new Date(entry.start_time).toLocaleDateString('en-US', {
                                            month: '2-digit',
                                            day: '2-digit',
                                            year: 'numeric'
                                          })}
                                        </div>
                                      </div>

                                      {/* Time Fields Grid */}
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Start Time</label>
                                          <div className="text-sm bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-center font-medium">
                                            {new Date(entry.start_time).toLocaleTimeString('en-US', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: true
                                            })}
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">End Time</label>
                                          <div className="text-sm bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-center font-medium">
                                            {entry.end_time ? new Date(entry.end_time).toLocaleTimeString('en-US', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: true
                                            }) : '-'}
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-1">Total Hours</label>
                                          <div className="text-sm font-bold bg-green-50 dark:bg-green-900/30 p-2 rounded text-center text-green-700 dark:text-green-400">
                                            {entry.hours_worked.toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Grand Total */}
                <div style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 50%, #6b21a8 100%)',
                  padding: '16px',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '20px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '5rem', height: '5rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(50%, -50%)' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '4rem', height: '4rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(-50%, 50%)' }} />
                  </div>
                  <span style={{ position: 'relative', zIndex: 1 }}>GRAND TOTAL (All Travelers)</span>
                  <span style={{ position: 'relative', zIndex: 1 }}>{totalHours.toFixed(2)} hrs</span>
                </div>
              </div>
            );
          })()}

          {/* Operator Reports - Grouped by Traveler */}
          {(type === 'single_operator' || type === 'all_operators') && laborData.length > 0 && (() => {
            // Group data by traveler (job_number + work_order)
            const travelerGroups: Record<string, any[]> = {};
            laborData.forEach(entry => {
              const key = `${entry.job_number || 'N/A'}_${entry.work_order || 'N/A'}`;
              if (!travelerGroups[key]) {
                travelerGroups[key] = [];
              }
              travelerGroups[key].push(entry);
            });

            return (
              <div style={{ marginBottom: '0' }}>
                {Object.entries(travelerGroups).map(([key, entries]) => {
                  const [jobNumber, workOrder] = key.split('_');

                  // Group by work center within this traveler
                  const workCenterGroups: Record<string, any[]> = {};
                  entries.forEach(entry => {
                    const wc = entry.work_center || 'Unknown';
                    if (!workCenterGroups[wc]) {
                      workCenterGroups[wc] = [];
                    }
                    workCenterGroups[wc].push(entry);
                  });

                  const travelerTotal = entries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

                  return (
                    <div key={key} style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
                      {/* Traveler Header */}
                      <div className="traveler-header" style={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 50%, #6b21a8 100%)',
                        padding: '12px 16px',
                        borderRadius: '8px 8px 0 0',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
                          <div style={{ position: 'absolute', top: 0, right: 0, width: '5rem', height: '5rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(50%, -50%)' }} />
                          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '4rem', height: '4rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(-50%, 50%)' }} />
                        </div>
                        <span>Job# {jobNumber} - Work Order# {workOrder}</span>
                        <span>Total: {travelerTotal.toFixed(2)} hrs</span>
                      </div>

                      {/* Work Centers for this Traveler */}
                      <div style={{ border: '1px solid #4338ca', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                        {Object.entries(workCenterGroups).map(([workCenter, wcEntries], wcIndex) => {
                          const wcTotal = wcEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

                          return (
                            <div key={workCenter} style={{
                              borderBottom: wcIndex < Object.keys(workCenterGroups).length - 1 ? '2px solid #e0e0e0' : 'none',
                              padding: '16px'
                            }}>
                              {/* Work Center Header */}
                              <div className="wc-header bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 print:!bg-indigo-100 print:!text-indigo-700" style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                marginBottom: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span>🏭 {workCenter}</span>
                                <span>Work Center Total: {wcTotal.toFixed(2)} hrs</span>
                              </div>

                              {/* Desktop Operators Table */}
                              <div className="desktop-table" style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
                                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr className="bg-gray-50 dark:bg-slate-700 print:!bg-gray-50" style={{ borderBottom: '1px solid #e5e7eb' }}>
                                      <th className="text-gray-600 dark:text-slate-300" style={{ padding: '6px 4px', fontSize: '9px', fontWeight: 'bold', textAlign: 'left', width: '20%', wordWrap: 'break-word' }}>OPERATOR</th>
                                      <th className="text-gray-600 dark:text-slate-300" style={{ padding: '6px 4px', fontSize: '9px', fontWeight: 'bold', textAlign: 'left', width: '30%', wordWrap: 'break-word' }}>START TIME</th>
                                      <th className="text-gray-600 dark:text-slate-300" style={{ padding: '6px 4px', fontSize: '9px', fontWeight: 'bold', textAlign: 'left', width: '30%', wordWrap: 'break-word' }}>END TIME</th>
                                      <th className="text-gray-600 dark:text-slate-300" style={{ padding: '6px 4px', fontSize: '9px', fontWeight: 'bold', textAlign: 'right', width: '20%', wordWrap: 'break-word' }}>HOURS</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {wcEntries.map((entry, i) => (
                                      <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td className="text-gray-600 dark:text-slate-300" style={{ padding: '4px', fontSize: '9px', wordWrap: 'break-word', overflow: 'hidden' }}>
                                          {extractOperatorName(entry.description) || entry.employee_name || 'N/A'}
                                        </td>
                                        <td className="text-gray-600 dark:text-slate-300" style={{ padding: '4px', fontSize: '9px', wordWrap: 'break-word', overflow: 'hidden' }}>
                                          {new Date(entry.start_time).toLocaleString('en-US', {
                                            month: '2-digit',
                                            day: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                          })}
                                        </td>
                                        <td className="text-gray-600 dark:text-slate-300" style={{ padding: '4px', fontSize: '9px', wordWrap: 'break-word', overflow: 'hidden' }}>
                                          {entry.end_time ? new Date(entry.end_time).toLocaleString('en-US', {
                                            month: '2-digit',
                                            day: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                          }) : '-'}
                                        </td>
                                        <td className="text-green-600 dark:text-green-400" style={{ padding: '4px', fontSize: '9px', textAlign: 'right', fontWeight: 'bold', wordWrap: 'break-word', overflow: 'hidden' }}>
                                          {entry.hours_worked.toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile Card View */}
                              <div className="mobile-card-view space-y-3 p-2">
                                {wcEntries.map((entry, i) => (
                                  <div key={i} className="bg-white dark:bg-slate-800 border-2 border-gray-400 dark:border-slate-600 rounded-lg shadow-sm">
                                    {/* Card Header */}
                                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 border-b-2 border-gray-400 dark:border-slate-600 px-3 py-2">
                                      <div className="font-bold text-white text-sm">
                                        {extractOperatorName(entry.description) || entry.employee_name || 'N/A'}
                                      </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-3 space-y-3">
                                      {/* Date */}
                                      <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Date</label>
                                        <div className="text-sm bg-gray-50 dark:bg-slate-700 p-2 rounded text-center">
                                          {new Date(entry.start_time).toLocaleDateString('en-US', {
                                            month: '2-digit',
                                            day: '2-digit',
                                            year: 'numeric'
                                          })}
                                        </div>
                                      </div>

                                      {/* Time Fields Grid */}
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Start Time</label>
                                          <div className="text-sm bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-center font-medium">
                                            {new Date(entry.start_time).toLocaleTimeString('en-US', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: true
                                            })}
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">End Time</label>
                                          <div className="text-sm bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-center font-medium">
                                            {entry.end_time ? new Date(entry.end_time).toLocaleTimeString('en-US', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: true
                                            }) : '-'}
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-1">Total Hours</label>
                                          <div className="text-sm font-bold bg-green-50 dark:bg-green-900/30 p-2 rounded text-center text-green-700 dark:text-green-400">
                                            {entry.hours_worked.toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Grand Total */}
                <div style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 50%, #6b21a8 100%)',
                  padding: '16px',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '20px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '5rem', height: '5rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(50%, -50%)' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '4rem', height: '4rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(-50%, 50%)' }} />
                  </div>
                  <span style={{ position: 'relative', zIndex: 1 }}>GRAND TOTAL (All Travelers)</span>
                  <span style={{ position: 'relative', zIndex: 1 }}>{totalHours.toFixed(2)} hrs</span>
                </div>
              </div>
            );
          })()}

          {/* Category Reports - Flat table per category */}
          {(type === 'single_category' || type === 'all_categories') && categoryData.length > 0 && (() => {
            // Group data by category
            const categoryGroups: Record<string, any[]> = {};
            categoryData.forEach(entry => {
              const cat = entry.category || 'Uncategorized';
              if (!categoryGroups[cat]) {
                categoryGroups[cat] = [];
              }
              categoryGroups[cat].push(entry);
            });

            const CATEGORY_COLORS: Record<string, { bg: string; text: string; light: string }> = {
              'SMT hrs. Actual': { bg: '#2563eb', text: '#ffffff', light: '#dbeafe' },
              'HAND hrs. Actual': { bg: '#ea580c', text: '#ffffff', light: '#ffedd5' },
              'TH hrs. Actual': { bg: '#7c3aed', text: '#ffffff', light: '#ede9fe' },
              'AOI & Final Inspection, QC hrs. Actual': { bg: '#16a34a', text: '#ffffff', light: '#dcfce7' },
              'E-TEST hrs. Actual': { bg: '#ca8a04', text: '#ffffff', light: '#fef9c3' },
              'Labelling, Packaging, Shipping hrs. Actual': { bg: '#0891b2', text: '#ffffff', light: '#cffafe' },
              'Uncategorized': { bg: '#6b7280', text: '#ffffff', light: '#f3f4f6' },
            };

            return (
              <div style={{ marginBottom: '0' }}>
                {Object.entries(categoryGroups).map(([cat, catEntries]) => {
                  const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Uncategorized'];
                  const catTotal = catEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

                  return (
                    <div key={cat} style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
                      {/* Category Header */}
                      <div style={{
                        background: colors.bg,
                        padding: '14px 20px',
                        borderRadius: '8px 8px 0 0',
                        color: colors.text,
                        fontWeight: 'bold',
                        fontSize: '15px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
                          <div style={{ position: 'absolute', top: 0, right: 0, width: '5rem', height: '5rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(50%, -50%)' }} />
                          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '4rem', height: '4rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(-50%, 50%)' }} />
                        </div>
                        <span style={{ position: 'relative', zIndex: 1 }}>{cat}</span>
                        <span style={{ position: 'relative', zIndex: 1 }}>{catTotal.toFixed(2)} hrs</span>
                      </div>

                      {/* Flat table of all entries in this category */}
                      <div style={{ border: `2px solid ${colors.bg}`, borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                        {/* Desktop Table */}
                        <div className="desktop-table" style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
                          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ backgroundColor: colors.light, borderBottom: `2px solid ${colors.bg}` }}>
                                <th style={{ padding: '8px 6px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left', color: colors.bg, width: '20%' }}>WORK CENTER</th>
                                <th style={{ padding: '8px 6px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left', color: colors.bg, width: '18%' }}>OPERATOR</th>
                                <th style={{ padding: '8px 6px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left', color: colors.bg, width: '24%' }}>START TIME</th>
                                <th style={{ padding: '8px 6px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left', color: colors.bg, width: '24%' }}>END TIME</th>
                                <th style={{ padding: '8px 6px', fontSize: '10px', fontWeight: 'bold', textAlign: 'right', color: colors.bg, width: '14%' }}>HOURS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {catEntries.map((entry, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-800 print:!bg-white' : 'bg-gray-50 dark:bg-slate-700/50 print:!bg-gray-50'} style={{ borderBottom: '1px solid #dee2e6' }}>
                                  <td className="text-gray-700 dark:text-slate-200" style={{ padding: '6px', fontSize: '10px', fontWeight: '600' }}>
                                    {entry.work_center || 'N/A'}
                                  </td>
                                  <td className="text-gray-600 dark:text-slate-300" style={{ padding: '6px', fontSize: '10px' }}>
                                    {extractOperatorName(entry.description) || entry.employee_name || 'N/A'}
                                  </td>
                                  <td className="text-gray-600 dark:text-slate-300" style={{ padding: '6px', fontSize: '10px' }}>
                                    {entry.start_time ? new Date(entry.start_time).toLocaleString('en-US', {
                                      month: '2-digit', day: '2-digit', year: 'numeric',
                                      hour: '2-digit', minute: '2-digit', hour12: true
                                    }) : '-'}
                                  </td>
                                  <td className="text-gray-600 dark:text-slate-300" style={{ padding: '6px', fontSize: '10px' }}>
                                    {entry.end_time ? new Date(entry.end_time).toLocaleString('en-US', {
                                      month: '2-digit', day: '2-digit', year: 'numeric',
                                      hour: '2-digit', minute: '2-digit', hour12: true
                                    }) : '-'}
                                  </td>
                                  <td className="text-green-600 dark:text-green-400" style={{ padding: '6px', fontSize: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                                    {entry.hours_worked.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                              {/* Category Total Footer */}
                              <tr style={{ backgroundColor: colors.light, borderTop: `2px solid ${colors.bg}` }}>
                                <td colSpan={4} style={{ padding: '8px 6px', fontSize: '11px', fontWeight: 'bold', color: colors.bg }}>
                                  {cat} Total
                                </td>
                                <td style={{ padding: '8px 6px', fontSize: '11px', textAlign: 'right', fontWeight: 'bold', color: colors.bg }}>
                                  {catTotal.toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="mobile-card-view space-y-3 p-2">
                          {catEntries.map((entry, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 border-2 border-gray-400 dark:border-slate-600 rounded-lg shadow-sm">
                              <div style={{ background: colors.bg }} className="border-b-2 border-gray-400 dark:border-slate-600 px-3 py-2">
                                <div className="font-bold text-white text-sm">
                                  {entry.work_center || 'N/A'}
                                </div>
                                <div className="text-white text-xs opacity-80">
                                  {extractOperatorName(entry.description) || entry.employee_name || 'N/A'}
                                </div>
                              </div>
                              <div className="p-3 space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Start Time</label>
                                    <div className="text-sm bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-center font-medium">
                                      {entry.start_time ? new Date(entry.start_time).toLocaleString('en-US', {
                                        month: '2-digit', day: '2-digit', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit', hour12: true
                                      }) : '-'}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">End Time</label>
                                    <div className="text-sm bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-center font-medium">
                                      {entry.end_time ? new Date(entry.end_time).toLocaleString('en-US', {
                                        month: '2-digit', day: '2-digit', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit', hour12: true
                                      }) : '-'}
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-1">Hours</label>
                                  <div className="text-sm font-bold bg-green-50 dark:bg-green-900/30 p-2 rounded text-center text-green-700 dark:text-green-400">
                                    {entry.hours_worked.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Grand Total */}
                <div style={{
                  background: 'linear-gradient(135deg, #e11d48 0%, #be185d 50%, #9d174d 100%)',
                  padding: '16px',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '20px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '5rem', height: '5rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(50%, -50%)' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '4rem', height: '4rem', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(-50%, 50%)' }} />
                  </div>
                  <span style={{ position: 'relative', zIndex: 1 }}>GRAND TOTAL ({type === 'single_category' ? categoryParam : 'All Categories'})</span>
                  <span style={{ position: 'relative', zIndex: 1 }}>{totalHours.toFixed(2)} hrs</span>
                </div>
              </div>
            );
          })()}

          {/* No data message for category reports */}
          {(type === 'single_category' || type === 'all_categories') && categoryData.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', fontSize: '14px' }}>
              No labor entries found for the selected criteria.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function ReportViewPage() {
  return (
    <Layout fullWidth>
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>}>
        <ReportViewContent />
      </Suspense>
    </Layout>
  );
}
