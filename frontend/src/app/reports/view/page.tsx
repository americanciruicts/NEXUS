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
  traveler_labor: { primary: '#EF4444', secondary: '#FEE2E2', name: 'Combined Traveler & Labor Report' }
};

function ReportViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as keyof typeof REPORT_THEMES;
  const jobNumber = searchParams.get('jobNumber');
  const operatorName = searchParams.get('operatorName');
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
      } else if (type === 'traveler_labor') {
        const [travelerRes, laborRes] = await Promise.all([
          fetch('http://acidashboard.aci.local:100/api/tracking/', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://acidashboard.aci.local:100/api/labor/', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        const travelerDataFetched = await travelerRes.json();
        const laborDataFetched = await laborRes.json();
        if (jobNumber) {
          const filteredTravelerData = travelerDataFetched.filter((entry: any) => entry.job_number === jobNumber);
          const filteredLaborData = laborDataFetched.filter((entry: any) => entry.job_number === jobNumber);
          setTravelerData(filteredTravelerData);
          setLaborData(filteredLaborData);
        } else {
          setTravelerData(travelerDataFetched);
          setLaborData(laborDataFetched);
        }
        const travelerTotal = (jobNumber ? travelerDataFetched.filter((e: any) => e.job_number === jobNumber) : travelerDataFetched).reduce((sum: number, entry: any) => sum + (entry.hours_worked || 0), 0);
        const laborTotal = (jobNumber ? laborDataFetched.filter((e: any) => e.job_number === jobNumber) : laborDataFetched).reduce((sum: number, entry: any) => sum + (entry.hours_worked || 0), 0);
        setTotalHours(travelerTotal + laborTotal);
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
  const isCombinedReport = type === 'traveler_labor';
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
      `}</style>

      {/* Header with Action Buttons - Digital Only */}
      <div className="no-print" style={{
        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`,
        padding: '20px 30px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div>
            <h1 style={{
              color: 'white',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 8px 0'
            }}>
              {theme.name}
            </h1>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}>
              {displayJobNumber && <span style={{ marginRight: '20px' }}>📋 Job: <strong>{displayJobNumber}</strong></span>}
              {displayOperator && <span style={{ marginRight: '20px' }}>👤 Operator: <strong>{displayOperator}</strong></span>}
              <span>⏱️ Total Hours: <strong>{totalHours.toFixed(2)}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
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
      <div className="print-version" style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 80px)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>

          {/* Header Section */}
          <div style={{
            background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`,
            padding: '15px 20px',
            marginBottom: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
               type === 'all_operators' ? 'All Operators Summary' : 'Information'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '11px' }}>
              <div><strong>Job Number:</strong> <span style={{ color: '#495057' }}>{travelerData[0]?.job_number || laborData[0]?.job_number || jobNumber || 'N/A'}</span></div>
              <div><strong>Part Number:</strong> <span style={{ color: '#495057' }}>{displayPartNumber}</span></div>
              <div><strong>Quantity:</strong> <span style={{ color: '#495057' }}>{displayQuantity}</span></div>
              <div><strong>Total Hours:</strong> <span style={{ color: '#28a745', fontWeight: 'bold' }}>{totalHours.toFixed(2)}</span></div>
            </div>
          </div>

          {/* Traveler Tracking Table - Digital */}
          {(isCombinedReport || !isLaborReport) && travelerData.length > 0 && (
            <>
              {isCombinedReport && <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '20px', marginBottom: '10px', color: theme.primary }}>Traveler Tracking</h3>}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${theme.primary}`, borderRadius: '6px', overflow: 'hidden', marginBottom: isCombinedReport ? '30px' : '0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <thead>
                  <tr style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`, color: 'white' }}>
                    <th style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>WORK CENTER</th>
                    <th style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>OPERATOR</th>
                    <th style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>START TIME</th>
                    <th style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>END TIME</th>
                    <th style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'right' }}>HOURS</th>
                  </tr>
                </thead>
                <tbody>
                  {travelerData.map((entry, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : theme.secondary }}>
                      <td style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>{entry.work_center}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
                        {entry.operator_name || 'N/A'}
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
                        {new Date(entry.start_time).toLocaleString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
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
                {!isCombinedReport && (
                  <tfoot>
                    <tr style={{ background: `linear-gradient(135deg, ${theme.secondary} 0%, #ffffff 100%)` }}>
                      <td colSpan={4} style={{ border: `1px solid ${theme.primary}`, padding: '8px', fontSize: '11px', fontWeight: 'bold', textAlign: 'right', color: theme.primary }}>
                        TOTAL HOURS:
                      </td>
                      <td style={{ border: `1px solid ${theme.primary}`, padding: '8px', fontSize: '11px', fontWeight: 'bold', textAlign: 'right', color: '#28a745' }}>
                        {travelerData.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </>
          )}

          {/* Labor Tracking Table - Digital */}
          {(isCombinedReport || isLaborReport) && laborData.length > 0 && (
            <>
              {isCombinedReport && <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '20px', marginBottom: '10px', color: theme.primary }}>Labor Tracking</h3>}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${theme.primary}`, borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <thead>
                  <tr style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`, color: 'white' }}>
                    <th style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>WORK CENTER</th>
                    <th style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>OPERATOR</th>
                    <th style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>START TIME</th>
                    <th style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'left' }}>END TIME</th>
                    <th style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px', fontSize: '10px', fontWeight: 'bold', textAlign: 'right' }}>HOURS</th>
                  </tr>
                </thead>
                <tbody>
                  {laborData.map((entry, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : theme.secondary }}>
                      <td style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>{entry.work_center}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
                        {extractOperatorName(entry.description) || entry.employee_name || 'N/A'}
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
                        {new Date(entry.start_time).toLocaleString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '6px 8px', fontSize: '10px', color: '#495057' }}>
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
                {!isCombinedReport && (
                  <tfoot>
                    <tr style={{ background: `linear-gradient(135deg, ${theme.secondary} 0%, #ffffff 100%)` }}>
                      <td colSpan={4} style={{ border: `1px solid ${theme.primary}`, padding: '8px', fontSize: '11px', fontWeight: 'bold', textAlign: 'right', color: theme.primary }}>
                        TOTAL HOURS:
                      </td>
                      <td style={{ border: `1px solid ${theme.primary}`, padding: '8px', fontSize: '11px', fontWeight: 'bold', textAlign: 'right', color: '#28a745' }}>
                        {laborData.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </>
          )}

          {/* Combined Total for Combined Report - Digital */}
          {isCombinedReport && (
            <div style={{ marginTop: '20px', padding: '15px', background: `linear-gradient(135deg, ${theme.primary}20 0%, ${theme.secondary} 100%)`, borderRadius: '8px', border: `2px solid ${theme.primary}`, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: theme.primary }}>TOTAL HOURS (Traveler + Labor):</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#28a745' }}>{totalHours.toFixed(2)}</span>
              </div>
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
