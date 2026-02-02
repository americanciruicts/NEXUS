'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { PrinterIcon } from '@heroicons/react/24/outline';

const REPORT_THEMES = {
  single_traveler: { primary: '#3B82F6', secondary: '#DBEAFE', name: 'Single Traveler Tracking Report' },
  all_travelers: { primary: '#22C55E', secondary: '#DCFCE7', name: 'All Travelers Tracking Report' },
  single_operator: { primary: '#A855F7', secondary: '#F3E8FF', name: 'Single Operator Labor Report' },
  all_operators: { primary: '#F97316', secondary: '#FFEDD5', name: 'All Operators Labor Report' },
  single_work_center: { primary: '#06B6D4', secondary: '#CFFAFE', name: 'Single Work Center Report' },
  all_work_centers: { primary: '#14B8A6', secondary: '#CCFBF1', name: 'All Work Centers Report' }
};

function ReportViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as keyof typeof REPORT_THEMES;
  const jobNumber = searchParams.get('jobNumber');
  const operatorName = searchParams.get('operatorName');
  const workCenter = searchParams.get('workCenter');
  const workOrder = searchParams.get('workOrder');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const [travelerData, setTravelerData] = useState<any[]>([]);
  const [laborData, setLaborData] = useState<any[]>([]);
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

  const fetchReportData = async () => {
    try {
      const token = localStorage.getItem('nexus_token');

      if (type === 'single_traveler' || type === 'all_travelers') {
        const response = await fetch('http://acidashboard.aci.local:100/api/tracking/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('API error');
        let data = await response.json();
        if (type === 'single_traveler' && jobNumber) {
          data = data.filter((entry: any) => entry.job_number === jobNumber);
        }
        const total = data.reduce((sum: number, entry: any) => sum + (entry.hours_worked || 0), 0);
        setTotalHours(total);
        setTravelerData(data);
      } else if (type === 'single_operator' || type === 'all_operators') {
        const response = await fetch('http://acidashboard.aci.local:100/api/labor/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('API error');
        let data = await response.json();
        if (type === 'single_operator' && operatorName) {
          // Case-insensitive partial match for operator name using employee_name
          const searchTerm = operatorName.toLowerCase();
          data = data.filter((entry: any) => {
            const employeeName = entry.employee_name || '';
            return employeeName.toLowerCase().includes(searchTerm);
          });
        }
        const total = data.reduce((sum: number, entry: any) => sum + (entry.hours_worked || 0), 0);
        setTotalHours(total);
        setLaborData(data);
      } else if (type === 'single_work_center' || type === 'all_work_centers') {
        const response = await fetch('http://acidashboard.aci.local:100/api/labor/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('API error');
        let data = await response.json();

        // Filter by work center for single_work_center reports
        if (type === 'single_work_center' && workCenter) {
          const searchTerm = workCenter.toLowerCase();
          data = data.filter((entry: any) => {
            const wc = entry.work_center || '';
            return wc.toLowerCase().includes(searchTerm);
          });
        }

        // Filter by job number if provided
        if (jobNumber && jobNumber.trim()) {
          const jobSearchTerm = jobNumber.toLowerCase();
          data = data.filter((entry: any) => {
            const job = entry.job_number || '';
            return job.toLowerCase().includes(jobSearchTerm);
          });
        }

        // Filter by work order if provided
        if (workOrder && workOrder.trim()) {
          const woSearchTerm = workOrder.toLowerCase();
          data = data.filter((entry: any) => {
            const wo = entry.work_order || '';
            return wo.toLowerCase().includes(woSearchTerm);
          });
        }

        const total = data.reduce((sum: number, entry: any) => sum + (entry.hours_worked || 0), 0);
        setTotalHours(total);
        setLaborData(data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      alert('Error loading report');
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

  // Job number and operator name should only appear in tables, not in header
  const displayJobNumber = null;
  const displayOperator = null;

  // Determine which data to display based on report type
  const isLaborReport = type === 'single_operator' || type === 'all_operators';
  const displayData = isLaborReport ? laborData : travelerData;

  const displayPartNumber = travelerData[0]?.part_number || 'N/A';
  const displayQuantity = travelerData[0]?.quantity || 'N/A';

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh' }}>
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
          }
        }
        /* Mobile-specific styles */
        .mobile-show {
          display: none !important;
        }
        @media (max-width: 768px) {
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
          /* Hide less important columns on mobile */
          .mobile-hide {
            display: none !important;
          }
          /* Show mobile-specific content */
          .mobile-show {
            display: table-cell !important;
          }
          /* Make tables scroll-free on mobile by hiding columns */
          table {
            min-width: 100% !important;
          }
          /* Stack information grid vertically on mobile */
          .info-grid {
            grid-template-columns: 1fr !important;
          }
          /* Work center report responsive */
          .traveler-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }
          .wc-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 4px !important;
          }
        }
      `}</style>

      {/* Header with Action Buttons - Digital Only */}
      <div className="no-print" style={{
        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`,
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
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
                color: theme.primary,
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
      <div className="print-version" style={{ padding: '12px', backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 80px)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>

          {/* Header Section */}
          <div style={{
            background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`,
            padding: '15px 20px',
            marginBottom: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div className="report-inner-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
          <div style={{
            border: `2px solid ${theme.primary}`,
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            background: `linear-gradient(135deg, ${theme.secondary} 0%, #ffffff 100%)`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '12px', color: theme.primary, borderBottom: `2px solid ${theme.primary}`, paddingBottom: '8px' }}>
              {type === 'single_traveler' ? 'Traveler Information' :
               type === 'all_travelers' ? 'All Travelers Summary' :
               type === 'single_operator' ? 'Operator Information' :
               type === 'all_operators' ? 'All Operators Summary' :
               type === 'single_work_center' ? 'Work Center Report' :
               type === 'all_work_centers' ? 'All Work Centers Report' : 'Information'}
            </div>
            <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '11px' }}>
              {(type === 'single_work_center' || type === 'all_work_centers') ? (
                <>
                  {workCenter && <div><strong>Work Center:</strong> <span style={{ color: '#495057' }}>{workCenter}</span></div>}
                  {jobNumber && <div><strong>Job Number Filter:</strong> <span style={{ color: '#495057' }}>{jobNumber}</span></div>}
                  {workOrder && <div><strong>Work Order Filter:</strong> <span style={{ color: '#495057' }}>{workOrder}</span></div>}
                  <div><strong>Total Entries:</strong> <span style={{ color: '#495057' }}>{laborData.length}</span></div>
                  <div><strong>Total Hours:</strong> <span style={{ color: '#28a745', fontWeight: 'bold' }}>{totalHours.toFixed(2)}</span></div>
                </>
              ) : (
                <>
                  <div><strong>Job Number:</strong> <span style={{ color: '#495057' }}>{travelerData[0]?.job_number || laborData[0]?.job_number || jobNumber || 'N/A'}</span></div>
                  <div><strong>Part Number:</strong> <span style={{ color: '#495057' }}>{displayPartNumber}</span></div>
                  <div><strong>Quantity:</strong> <span style={{ color: '#495057' }}>{displayQuantity}</span></div>
                  <div><strong>Total Hours:</strong> <span style={{ color: '#28a745', fontWeight: 'bold' }}>{totalHours.toFixed(2)}</span></div>
                </>
              )}
            </div>
          </div>

          {/* Traveler Tracking Table - Digital */}
          {!isLaborReport && travelerData.length > 0 && (
            <div style={{ overflowX: 'auto', marginBottom: '0' }}>
              <table style={{ width: '100%', minWidth: '320px', borderCollapse: 'collapse', border: `2px solid ${theme.primary}`, borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <thead>
                  <tr style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`, color: 'white' }}>
                    <th style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>WORK CENTER</th>
                    <th className="mobile-hide" style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>OPERATOR</th>
                    <th className="mobile-hide" style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>START TIME</th>
                    <th className="mobile-hide" style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>END TIME</th>
                    <th style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'right' }}>HOURS</th>
                  </tr>
                </thead>
                <tbody>
                  {travelerData.map((entry, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : theme.secondary }}>
                      <td style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>{entry.work_center}</td>
                      <td className="mobile-hide" style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
                        {entry.operator_name || 'N/A'}
                      </td>
                      <td className="mobile-hide" style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
                        {new Date(entry.start_time).toLocaleString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </td>
                      <td className="mobile-hide" style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
                        {entry.end_time ? new Date(entry.end_time).toLocaleString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        }) : '-'}
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 'bold', color: '#28a745' }}>
                        {entry.hours_worked.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: `linear-gradient(135deg, ${theme.secondary} 0%, #ffffff 100%)` }}>
                    <td colSpan={1} className="mobile-show" style={{ border: `1px solid ${theme.primary}`, padding: '8px', fontSize: '11px', fontWeight: 'bold', textAlign: 'right', color: theme.primary }}>
                      TOTAL:
                    </td>
                    <td colSpan={4} className="mobile-hide" style={{ border: `1px solid ${theme.primary}`, padding: '8px', fontSize: '11px', fontWeight: 'bold', textAlign: 'right', color: theme.primary }}>
                      TOTAL HOURS:
                    </td>
                    <td style={{ border: `1px solid ${theme.primary}`, padding: '8px', fontSize: '11px', fontWeight: 'bold', textAlign: 'right', color: '#28a745' }}>
                      {travelerData.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
                        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`,
                        padding: '12px 16px',
                        borderRadius: '8px 8px 0 0',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>Job# {jobNumber} - Work Order# {workOrder}</span>
                        <span>Total: {travelerTotal.toFixed(2)} hrs</span>
                      </div>

                      {/* Work Centers for this Traveler */}
                      <div style={{ border: `2px solid ${theme.primary}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                        {Object.entries(workCenterGroups).map(([workCenter, wcEntries], wcIndex) => {
                          const wcTotal = wcEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

                          return (
                            <div key={workCenter} style={{
                              borderBottom: wcIndex < Object.keys(workCenterGroups).length - 1 ? '2px solid #e0e0e0' : 'none',
                              padding: '16px'
                            }}>
                              {/* Work Center Header */}
                              <div className="wc-header" style={{
                                background: theme.secondary,
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                color: theme.primary,
                                marginBottom: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span>🏭 {workCenter}</span>
                                <span>Work Center Total: {wcTotal.toFixed(2)} hrs</span>
                              </div>

                              {/* Operators Table */}
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                    <th style={{ padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left', color: '#495057' }}>OPERATOR</th>
                                    <th className="mobile-hide" style={{ padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left', color: '#495057' }}>START TIME</th>
                                    <th className="mobile-hide" style={{ padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left', color: '#495057' }}>END TIME</th>
                                    <th style={{ padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'right', color: '#495057' }}>HOURS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {wcEntries.map((entry, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #e9ecef' }}>
                                      <td style={{ padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
                                        {extractOperatorName(entry.description) || entry.employee_name || 'N/A'}
                                      </td>
                                      <td className="mobile-hide" style={{ padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
                                        {new Date(entry.start_time).toLocaleString('en-US', {
                                          month: '2-digit',
                                          day: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </td>
                                      <td className="mobile-hide" style={{ padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
                                        {entry.end_time ? new Date(entry.end_time).toLocaleString('en-US', {
                                          month: '2-digit',
                                          day: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true
                                        }) : '-'}
                                      </td>
                                      <td style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 'bold', color: '#28a745' }}>
                                        {entry.hours_worked.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Grand Total */}
                <div style={{
                  background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`,
                  padding: '16px',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '20px'
                }}>
                  <span>GRAND TOTAL (All Travelers)</span>
                  <span>{totalHours.toFixed(2)} hrs</span>
                </div>
              </div>
            );
          })()}

          {/* Labor Tracking Table - Digital (for operator reports only) */}
          {(type === 'single_operator' || type === 'all_operators') && laborData.length > 0 && (
            <div style={{ overflowX: 'auto', marginBottom: '0' }}>
              <table style={{ width: '100%', minWidth: '320px', borderCollapse: 'collapse', border: `2px solid ${theme.primary}`, borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <thead>
                  <tr style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`, color: 'white' }}>
                    <th style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>WORK CENTER</th>
                    <th className="mobile-hide" style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>OPERATOR</th>
                    <th className="mobile-hide" style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>START TIME</th>
                    <th className="mobile-hide" style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>END TIME</th>
                    <th style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'right' }}>HOURS</th>
                  </tr>
                </thead>
                <tbody>
                  {laborData.map((entry, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : theme.secondary }}>
                      <td style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>{entry.work_center}</td>
                      <td className="mobile-hide" style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
                        {extractOperatorName(entry.description) || entry.employee_name || 'N/A'}
                      </td>
                      <td className="mobile-hide" style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
                        {new Date(entry.start_time).toLocaleString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </td>
                      <td className="mobile-hide" style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
                        {entry.end_time ? new Date(entry.end_time).toLocaleString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        }) : '-'}
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 'bold', color: '#28a745' }}>
                        {entry.hours_worked.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: `linear-gradient(135deg, ${theme.secondary} 0%, #ffffff 100%)` }}>
                    <td colSpan={1} className="mobile-show" style={{ border: `1px solid ${theme.primary}`, padding: '8px', fontSize: '11px', fontWeight: 'bold', textAlign: 'right', color: theme.primary }}>
                      TOTAL:
                    </td>
                    <td colSpan={4} className="mobile-hide" style={{ border: `1px solid ${theme.primary}`, padding: '8px', fontSize: '11px', fontWeight: 'bold', textAlign: 'right', color: theme.primary }}>
                      TOTAL HOURS:
                    </td>
                    <td style={{ border: `1px solid ${theme.primary}`, padding: '8px', fontSize: '11px', fontWeight: 'bold', textAlign: 'right', color: '#28a745' }}>
                      {laborData.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
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
