'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BriefcaseIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  PlayIcon,
  StopIcon,
  DocumentTextIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config/api';
import Layout from '@/components/layout/Layout';
import type { KoshJob, BomLine, JobBomResponse, JobTraveler, JobProgress } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'In Prep': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'In Mfg': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

const TRAVELER_STATUS_COLORS: Record<string, string> = {
  'CREATED': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'DRAFT': 'bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-300',
  'IN_PROGRESS': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'COMPLETED': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'ON_HOLD': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'CANCELLED': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

type Tab = 'bom' | 'travelers' | 'stock' | 'timeline' | 'labor';

interface KittingStatus {
  total_components: number;
  kitted: number;
  in_stockroom: number;
  short: number;
  percent: number;
  components: Array<{ line_no: string; aci_pn: string; description: string; required: number; on_mfg_floor: number; in_stockroom: number; short_qty: number; status: string }>;
}

interface TimelineEvent {
  type: string;
  timestamp: string;
  title: string;
  detail: string;
  icon: string;
  traveler_id?: number;
}

interface EnrichedData {
  traveler_count: number;
  completed_travelers: number;
  progress_percent: number;
  total_labor_hours: number;
  kitting_status: string;
  kitting_percent: number;
  health: string;
  shortage_count: number;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const jobNumber = decodeURIComponent(params.jobNumber as string);

  const [job, setJob] = useState<KoshJob | null>(null);
  const [bom, setBom] = useState<JobBomResponse | null>(null);
  const [travelers, setTravelers] = useState<JobTraveler[]>([]);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [stockData, setStockData] = useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('bom');
  const [loading, setLoading] = useState(true);
  const [bomLoading, setBomLoading] = useState(false);
  const [travelersLoading, setTravelersLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [kitting, setKitting] = useState<KittingStatus | null>(null);
  const [kittingLoading, setKittingLoading] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [enriched, setEnriched] = useState<EnrichedData | null>(null);
  const [creatingRerun, setCreatingRerun] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login');
    else if (user?.role !== 'ADMIN') router.push('/dashboard');
  }, [isAuthenticated, user, router]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('nexus_token') : null;
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch job detail + progress on mount
  const fetchJob = useCallback(async () => {
    setLoading(true);
    try {
      const [jobRes, progressRes] = await Promise.all([
        fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobNumber)}`, { headers }),
        fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobNumber)}/progress`, { headers }),
      ]);
      if (jobRes.ok) setJob(await jobRes.json());
      if (progressRes.ok) setProgress(await progressRes.json());
    } catch (err) {
      console.error('Error fetching job:', err);
    } finally {
      setLoading(false);
    }
  }, [jobNumber]);

  useEffect(() => {
    if (user?.role === 'ADMIN') fetchJob();
  }, [fetchJob, user]);

  // Fetch BOM (initial load only shows spinner)
  const fetchBom = useCallback(async (silent = false) => {
    if (!silent && bom) return;
    if (!silent) setBomLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobNumber)}/bom`, { headers });
      if (res.ok) setBom(await res.json());
    } catch (err) {
      console.error('Error fetching BOM:', err);
    } finally {
      if (!silent) setBomLoading(false);
    }
  }, [jobNumber]);

  // Fetch travelers
  const fetchTravelers = useCallback(async (silent = false) => {
    if (!silent && travelers.length > 0) return;
    if (!silent) setTravelersLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobNumber)}/travelers`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTravelers(data.travelers);
      }
    } catch (err) {
      console.error('Error fetching travelers:', err);
    } finally {
      if (!silent) setTravelersLoading(false);
    }
  }, [jobNumber]);

  // Fetch warehouse inventory
  const fetchStock = useCallback(async (silent = false) => {
    if (!silent && stockData) return;
    if (!silent) setStockLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobNumber)}/stock`, { headers });
      if (res.ok) setStockData(await res.json());
    } catch (err) {
      console.error('Error fetching stock:', err);
    } finally {
      if (!silent) setStockLoading(false);
    }
  }, [jobNumber]);

  // Fetch kitting status
  const fetchKitting = useCallback(async () => {
    setKittingLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobNumber)}/kitting-status`, { headers });
      if (res.ok) setKitting(await res.json());
    } catch (err) {
      console.error('Error fetching kitting:', err);
    } finally {
      setKittingLoading(false);
    }
  }, [jobNumber]);

  // Fetch timeline
  const fetchTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobNumber)}/timeline`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTimeline(data.events || []);
      }
    } catch (err) {
      console.error('Error fetching timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  }, [jobNumber]);

  // Fetch enriched data (for health, labor, kitting summary)
  const fetchEnriched = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobNumber)}/enriched`, { headers });
      if (res.ok) {
        const data = await res.json();
        setEnriched(data);
      }
    } catch (err) {
      console.error('Error fetching enriched:', err);
    }
  }, [jobNumber]);

  // Create another run
  const handleCreateRerun = async () => {
    setCreatingRerun(true);
    try {
      const token = localStorage.getItem('nexus_token');
      const res = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobNumber)}/auto-create-traveler`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        router.push(`/travelers/${data.id}`);
      } else {
        const err = await res.json().catch(() => ({ detail: 'Failed' }));
        toast.error(err.detail || 'Failed to create traveler');
      }
    } catch {
      toast.error('Failed to create traveler');
    } finally {
      setCreatingRerun(false);
    }
  };

  // Load tab data on tab switch (initial)
  useEffect(() => {
    if (activeTab === 'bom') fetchBom();
    else if (activeTab === 'travelers') fetchTravelers();
    else if (activeTab === 'stock') fetchStock();
    else if (activeTab === 'timeline') fetchTimeline();
  }, [activeTab, fetchBom, fetchTravelers, fetchStock, fetchTimeline]);

  // Fetch kitting + enriched on mount
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchKitting();
      fetchEnriched();
    }
  }, [fetchKitting, fetchEnriched, user]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    const pollInterval = setInterval(() => {
      fetchJob();
      if (activeTab === 'bom') fetchBom(true);
      else if (activeTab === 'travelers') fetchTravelers(true);
      else if (activeTab === 'stock') fetchStock(true);
    }, 120000);
    return () => clearInterval(pollInterval);
  }, [user, activeTab, fetchJob, fetchBom, fetchTravelers, fetchStock]);

  const refreshAll = async () => {
    setBom(null);
    setTravelers([]);
    setProgress(null);
    setStockData(null);
    setKitting(null);
    setEnriched(null);
    await fetchJob();
    fetchKitting();
    fetchEnriched();
  };

  if (!isAuthenticated || user?.role !== 'ADMIN') return null;

  if (loading) {
    return (
      <Layout fullWidth>
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin h-10 w-10 border-4 border-teal-500 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout fullWidth>
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <BriefcaseIcon className="h-16 w-16 mx-auto text-gray-300 dark:text-slate-600 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Job Not Found</h2>
            <p className="text-gray-500 dark:text-slate-400 mt-2">Job {jobNumber} does not exist in KOSH</p>
            <Link href="/jobs" className="mt-4 inline-block text-teal-600 hover:underline">Back to Jobs</Link>
          </div>
        </div>
      </Layout>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: string }[] = [
    { key: 'bom', label: 'BOM / Components', icon: CubeIcon, badge: bom ? `${bom.total_lines}` : undefined },
    { key: 'travelers', label: 'Travelers', icon: ClipboardDocumentListIcon, badge: travelers.length > 0 ? `${travelers.length}` : undefined },
    { key: 'stock', label: 'Warehouse Inventory', icon: ArchiveBoxIcon, badge: stockData ? `${(stockData as { stock: unknown[] }).stock.length}` : undefined },
    { key: 'labor', label: 'Labor Summary', icon: ClockIcon, badge: enriched?.total_labor_hours ? `${enriched.total_labor_hours}h` : undefined },
    { key: 'timeline', label: 'Timeline', icon: DocumentTextIcon, badge: timeline.length > 0 ? `${timeline.length}` : undefined },
  ];

  return (
    <Layout fullWidth>
      <div className="px-2">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 rounded-2xl p-5 mb-5 relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/4 w-28 h-28 bg-white rounded-full translate-y-1/2" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Link href="/jobs" className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                  <ArrowLeftIcon className="h-5 w-5 text-white" />
                </Link>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-extrabold text-white tracking-tight">Job# {job.job_number}</h1>
                    <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30">
                      {job.status}
                    </span>
                  </div>
                  <p className="text-sm text-teal-100 mt-0.5">
                    {job.customer} {job.cust_pn ? `\u00B7 ${job.cust_pn}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={refreshAll} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg border border-white/30 transition-colors">
                <ArrowPathIcon className="h-4 w-4" />
                Refresh
              </button>
            </div>

            {/* Info cards — 2 rows x 3 columns */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Order QTY', value: String(job.order_qty) },
                { label: 'Build QTY', value: String(job.build_qty) },
                { label: 'Job Rev', value: job.job_rev || '-' },
                { label: 'Cust Rev', value: job.cust_rev || '-' },
                { label: 'WO #', value: job.wo_number || '-' },
                { label: 'Created By', value: job.created_by || '-' },
              ].map((card) => (
                <div key={card.label} className="bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                  <p className="text-[10px] uppercase tracking-wide text-teal-200 font-semibold">{card.label}</p>
                  <p className="text-lg font-extrabold text-white mt-0.5 truncate">{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Manufacturing Progress */}
        {progress && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-gray-900 dark:text-white">Manufacturing Progress</h3>
              </div>
              <span className="text-sm font-extrabold text-teal-700 dark:text-teal-300">
                {progress.qty_manufactured} of {progress.order_qty} manufactured ({progress.percent_complete}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-teal-500 to-emerald-500"
                style={{ width: `${Math.min(progress.percent_complete, 100)}%` }}
              />
            </div>
            <div className="flex gap-6 mt-3 text-xs text-gray-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="font-semibold">{progress.completed_travelers}</span> completed
              </span>
              <span className="flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4 text-amber-500" />
                <span className="font-semibold">{progress.in_progress_travelers}</span> in progress
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-700 dark:text-slate-300">{progress.qty_in_progress}</span> qty in progress
              </span>
            </div>
          </div>
        )}

        {/* Manufacturing Complete Banner */}
        {progress && progress.percent_complete >= 100 && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 mb-5 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">Manufacturing Complete</h3>
                <p className="text-sm text-green-100">{progress.qty_manufactured} of {progress.order_qty} units manufactured &mdash; Ready to Ship</p>
              </div>
            </div>
            <CheckCircleIcon className="h-10 w-10 text-white/40" />
          </div>
        )}

        {/* Kitting Status Card */}
        {kitting && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CubeIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-gray-900 dark:text-white">Kitting Status</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  kitting.percent >= 100 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                  kitting.percent > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                  'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {kitting.percent >= 100 ? 'Kit Ready' : `${kitting.percent}% Kitted`}
                </span>
              </div>
              <button onClick={fetchKitting} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                {kittingLoading ? 'Checking...' : 'Verify Kit'}
              </button>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${kitting.percent}%`,
                backgroundColor: kitting.percent >= 100 ? '#16a34a' : kitting.percent >= 50 ? '#f59e0b' : '#ef4444'
              }} />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                <p className="text-lg font-extrabold text-green-700 dark:text-green-300">{kitting.kitted}</p>
                <p className="text-[10px] text-green-600/70 dark:text-green-400/70 uppercase font-semibold">On MFG Floor</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
                <p className="text-lg font-extrabold text-amber-700 dark:text-amber-300">{kitting.in_stockroom}</p>
                <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 uppercase font-semibold">In Stockroom</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                <p className="text-lg font-extrabold text-red-700 dark:text-red-300">{kitting.short}</p>
                <p className="text-[10px] text-red-600/70 dark:text-red-400/70 uppercase font-semibold">Short</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-slate-800 rounded-xl p-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.badge && (
                  <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    tab.badge.includes('short')
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      : 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {activeTab === 'bom' && <BomTab bom={bom} loading={bomLoading} />}
          {activeTab === 'travelers' && (
            <div>
              <TravelersTab travelers={travelers} loading={travelersLoading} jobNumber={jobNumber} onRefresh={() => fetchTravelers(true)} />
              {travelers.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 flex items-center gap-3">
                  <button
                    onClick={handleCreateRerun}
                    disabled={creatingRerun}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    <PlusCircleIcon className="h-4 w-4" />
                    {creatingRerun ? 'Creating...' : 'Create Another Run'}
                  </button>
                  <span className="text-xs text-gray-500 dark:text-slate-400">Clones with bumped revision</span>
                </div>
              )}
            </div>
          )}
          {activeTab === 'stock' && <StockTab stockData={stockData} loading={stockLoading} />}
          {activeTab === 'labor' && <LaborSummaryTab enriched={enriched} />}
          {activeTab === 'timeline' && <TimelineTab events={timeline} loading={timelineLoading} />}
        </div>

        {/* Notes */}
        {job.notes && (
          <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">Job Notes</h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

// ─── Sub Components ─────────────────────────────────────────────────────────

// InfoCard removed — info cards are now inside the gradient header

function BomTab({ bom, loading }: { bom: JobBomResponse | null; loading: boolean }) {
  if (loading) return <LoadingSpinner />;
  if (!bom || bom.lines.length === 0) return <EmptyState text="No BOM loaded for this job in KOSH" />;

  return (
    <div className="overflow-x-auto">
      <div className="px-4 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-slate-700/50 dark:to-slate-700/30 border-b border-teal-200 dark:border-slate-600 flex items-center justify-between">
        <p className="text-sm font-bold text-teal-800 dark:text-teal-300">
          {bom.total_lines} components &middot; Order QTY: <span className="text-teal-600 dark:text-teal-400">{bom.order_qty}</span>
        </p>
        {bom.shortage_count > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2.5 py-1 rounded-full">
            <ExclamationTriangleIcon className="h-4 w-4" />
            {bom.shortage_count} shortage{bom.shortage_count > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800">
            <th className="px-3 py-2.5 text-left text-xs font-extrabold text-white uppercase tracking-wider">Line</th>
            <th className="px-3 py-2.5 text-left text-xs font-extrabold text-white uppercase tracking-wider">ACI PN</th>
            <th className="px-3 py-2.5 text-left text-xs font-extrabold text-white uppercase tracking-wider hidden lg:table-cell">Description</th>
            <th className="px-3 py-2.5 text-left text-xs font-extrabold text-white uppercase tracking-wider hidden md:table-cell">MPN</th>
            <th className="px-3 py-2.5 text-center text-xs font-extrabold text-white uppercase tracking-wider">QTY/Brd</th>
            <th className="px-3 py-2.5 text-center text-xs font-extrabold text-white uppercase tracking-wider">REQ</th>
            <th className="px-3 py-2.5 text-center text-xs font-extrabold text-white uppercase tracking-wider">On Hand</th>
            <th className="px-3 py-2.5 text-center text-xs font-extrabold text-white uppercase tracking-wider">Shortage</th>
            <th className="px-3 py-2.5 text-left text-xs font-extrabold text-white uppercase tracking-wider hidden lg:table-cell">Location</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
          {bom.lines.map((line, idx) => (
            <tr key={idx} className={`${line.shortage < 0 ? 'bg-red-50/50 dark:bg-red-900/10' : ''} hover:bg-gray-50 dark:hover:bg-slate-700/30`}>
              <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{line.line_no}</td>
              <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{line.aci_pn}</td>
              <td className="px-3 py-2 text-gray-600 dark:text-slate-400 hidden lg:table-cell max-w-[200px] truncate">{line.description}</td>
              <td className="px-3 py-2 text-gray-600 dark:text-slate-400 hidden md:table-cell">{line.mpn}</td>
              <td className="px-3 py-2 text-center text-gray-700 dark:text-slate-300">{line.qty_per_board}</td>
              <td className="px-3 py-2 text-center font-medium text-gray-900 dark:text-white">{line.required}</td>
              <td className="px-3 py-2 text-center text-gray-700 dark:text-slate-300">{line.on_hand}</td>
              <td className="px-3 py-2 text-center">
                <span className={`font-bold ${line.shortage < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {line.shortage >= 0 ? '+' : ''}{line.shortage}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-500 dark:text-slate-400 hidden lg:table-cell">{line.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TravelersTab({ travelers, loading, jobNumber, onRefresh }: { travelers: JobTraveler[]; loading: boolean; jobNumber: string; onRefresh?: () => void }) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [linking, setLinking] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkLabels, setLinkLabels] = useState<Record<number, string>>({});
  const [linkGroupName, setLinkGroupName] = useState('');
  const [linkOrder, setLinkOrder] = useState<number[]>([]);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  if (loading) return <LoadingSpinner />;
  if (travelers.length === 0) {
    return (
      <div className="text-center py-16">
        <ClipboardDocumentListIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
        <p className="text-gray-500 dark:text-slate-400">No travelers for this job yet</p>
        <Link
          href={`/travelers/new?job=${encodeURIComponent(jobNumber)}`}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          Create Traveler
        </Link>
      </div>
    );
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openLinkModal = () => {
    const ids = Array.from(selectedIds);
    setLinkOrder(ids);
    const labels: Record<number, string> = {};
    ids.forEach(id => {
      const t = travelers.find(tr => tr.id === id);
      labels[id] = t?.traveler_type?.replace(/_/g, ' ') || '';
    });
    setLinkLabels(labels);
    setLinkGroupName(`${jobNumber} Group`);
    setShowLinkModal(true);
  };

  const handleCreateGroup = async () => {
    setLinking(true);
    try {
      const token = localStorage.getItem('nexus_token') || '';
      const res = await fetch(`${API_BASE_URL}/travelers/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          traveler_ids: linkOrder,
          labels: linkOrder.map(id => linkLabels[id] || ''),
          group_name: linkGroupName || null,
        }),
      });
      if (res.ok) {
        setShowLinkModal(false);
        setSelectedIds(new Set());
        onRefresh?.();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to create group');
      }
    } catch (e) {
      console.error(e);
      alert('Error creating group');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkGroup = async (groupId: number) => {
    if (!confirm('Dissolve this group? Travelers will be unlinked.')) return;
    try {
      const token = localStorage.getItem('nexus_token') || '';
      const res = await fetch(`${API_BASE_URL}/travelers/groups/${groupId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) onRefresh?.();
      else alert('Failed to dissolve group');
    } catch { alert('Error dissolving group'); }
  };

  const moveInOrder = (id: number, direction: -1 | 1) => {
    setLinkOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  // Separate grouped and ungrouped travelers
  const grouped: Record<number, JobTraveler[]> = {};
  const ungrouped: JobTraveler[] = [];
  travelers.forEach(t => {
    if (t.group_id) {
      if (!grouped[t.group_id]) grouped[t.group_id] = [];
      grouped[t.group_id].push(t);
    } else {
      ungrouped.push(t);
    }
  });
  // Sort grouped travelers by sequence
  Object.values(grouped).forEach(arr => arr.sort((a, b) => (a.group_sequence || 0) - (b.group_sequence || 0)));

  return (
    <div>
      <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700/30 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
          {travelers.length} traveler{travelers.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          {isAdmin && selectedIds.size >= 2 && (
            <button
              onClick={openLinkModal}
              className="text-xs font-medium px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Link Selected ({selectedIds.size})
            </button>
          )}
          <Link
            href={`/travelers/new?job=${encodeURIComponent(jobNumber)}`}
            className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline"
          >
            + New Traveler
          </Link>
        </div>
      </div>

      {/* Grouped travelers */}
      {Object.entries(grouped).map(([gid, members]) => (
        <div key={gid} className="border-l-4 border-indigo-400 dark:border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10 mb-2">
          <div className="px-4 py-2 flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Linked Group</span>
              <span className="text-[10px] text-indigo-500 dark:text-indigo-400">
                {members.map(m => m.group_label || m.traveler_type.replace(/_/g, ' ')).join(' → ')}
              </span>
            </div>
            {isAdmin && (
              <button
                onClick={() => handleUnlinkGroup(Number(gid))}
                className="text-[10px] text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
              >
                Dissolve
              </button>
            )}
          </div>
          {members.map((t, i) => (
            <Link key={t.id} href={`/travelers/${t.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 border-b border-gray-100 dark:border-slate-700/50 text-sm">
              <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <span className="font-bold text-teal-700 dark:text-teal-400 min-w-[80px]">{t.group_label || t.traveler_type.replace(/_/g, ' ')}</span>
              <span className="text-gray-600 dark:text-slate-400 flex-1 truncate">{t.job_number}</span>
              <span className="text-gray-500 dark:text-slate-400 text-xs">{t.work_order_number}</span>
              <span className="font-medium text-gray-900 dark:text-white w-12 text-center">{t.quantity}</span>
              <span className="text-xs text-gray-500 dark:text-slate-400 w-12 text-center">{t.completed_steps}/{t.total_steps}</span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${TRAVELER_STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-700'}`}>
                {t.status.replace(/_/g, ' ')}
              </span>
            </Link>
          ))}
        </div>
      ))}

      {/* Ungrouped travelers */}
      {ungrouped.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-600">
              {isAdmin && <th className="px-2 py-2 w-8"></th>}
              <th className="px-4 py-2 text-left font-semibold text-gray-600 dark:text-slate-400">Job #</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600 dark:text-slate-400">WO #</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600 dark:text-slate-400 hidden md:table-cell">Type</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600 dark:text-slate-400 hidden lg:table-cell">Part</th>
              <th className="px-4 py-2 text-center font-semibold text-gray-600 dark:text-slate-400">QTY</th>
              <th className="px-4 py-2 text-center font-semibold text-gray-600 dark:text-slate-400">Steps</th>
              <th className="px-4 py-2 text-center font-semibold text-gray-600 dark:text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {ungrouped.map((t) => (
              <tr key={t.id} className="hover:bg-teal-50/50 dark:hover:bg-teal-900/20">
                {isAdmin && (
                  <td className="px-2 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                <td className="px-4 py-2.5">
                  <Link href={`/travelers/${t.id}`} className="font-bold text-teal-700 dark:text-teal-400 underline">{t.job_number}</Link>
                </td>
                <td className="px-4 py-2.5 text-gray-900 dark:text-slate-200">{t.work_order_number}</td>
                <td className="px-4 py-2.5 text-gray-600 dark:text-slate-400 hidden md:table-cell">{t.traveler_type.replace(/_/g, ' ')}</td>
                <td className="px-4 py-2.5 text-gray-600 dark:text-slate-400 hidden lg:table-cell">{t.part_number}</td>
                <td className="px-4 py-2.5 text-center font-medium text-gray-900 dark:text-white">{t.quantity}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className="text-xs text-gray-600 dark:text-slate-400">{t.completed_steps}/{t.total_steps}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${TRAVELER_STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-700'}`}>
                    {t.status.replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLinkModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Link Travelers</h3>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Group Name (optional)</label>
              <input
                type="text"
                value={linkGroupName}
                onChange={e => setLinkGroupName(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="e.g. 12345 Assembly Group"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Order &amp; Labels (drag to reorder)</label>
              <div className="space-y-2">
                {linkOrder.map((id, i) => {
                  const t = travelers.find(tr => tr.id === id);
                  return (
                    <div key={id} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 border border-gray-200 dark:border-slate-600">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 dark:text-white truncate">{t?.job_number} - {t?.work_order_number}</div>
                        <div className="text-[10px] text-gray-500 dark:text-slate-400">Qty: {t?.quantity}</div>
                      </div>
                      <input
                        type="text"
                        value={linkLabels[id] || ''}
                        onChange={e => setLinkLabels({ ...linkLabels, [id]: e.target.value })}
                        className="w-24 border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-xs bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        placeholder="Label"
                      />
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveInOrder(id, -1)} disabled={i === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs leading-none">&uarr;</button>
                        <button onClick={() => moveInOrder(id, 1)} disabled={i === linkOrder.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs leading-none">&darr;</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowLinkModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
              <button
                onClick={handleCreateGroup}
                disabled={linking || linkOrder.length < 2}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {linking ? 'Linking...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StockItem {
  line_no: string;
  aci_pn: string;
  description: string;
  pcn: string | null;
  mpn: string;
  on_hand: number;
  mfg_qty: number;
  location: string;
  qty_per_board: number;
  required: number;
  shortage: number;
  vendor: string;
  date_code: string;
  po_number: string;
}

function StockTab({ stockData, loading }: { stockData: Record<string, unknown> | null; loading: boolean }) {
  if (loading) return <LoadingSpinner />;
  if (!stockData) return <EmptyState text="No warehouse inventory data available" />;

  const items = (stockData.stock as StockItem[]) || [];
  const orderQty = (stockData.order_qty as number) || 1;

  if (items.length === 0) return <EmptyState text="No warehouse inventory records for this job's BOM" />;

  const stockRoom = items.filter((i) => i.location && i.location !== 'MFG Floor');
  const mfgFloor = items.filter((i) => i.location === 'MFG Floor');
  const withStock = items.filter((i) => i.on_hand > 0 || i.mfg_qty > 0);

  return (
    <div>
      {/* Summary bar */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700/30 border-b border-gray-200 dark:border-slate-600">
        <div className="flex items-center gap-6 text-sm flex-wrap">
          <span className="flex items-center gap-1.5">
            <ArchiveBoxIcon className="h-4 w-4 text-blue-500" />
            <span className="text-gray-700 dark:text-slate-300">{items.length} inventory records</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
            <span className="text-gray-700 dark:text-slate-300">{stockRoom.length} in stock room</span>
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon className="h-4 w-4 text-yellow-500" />
            <span className="text-gray-700 dark:text-slate-300">{mfgFloor.length} on MFG floor</span>
          </span>
          <span className="text-gray-500 dark:text-slate-400 text-xs ml-auto">
            Read-only from KOSH warehouse inventory &middot; Order QTY: {orderQty}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-600">
              <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-slate-400">Line</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-slate-400">ACI PN</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-slate-400 hidden lg:table-cell">Description</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-slate-400 hidden md:table-cell">PCN</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-slate-400 hidden md:table-cell">MPN</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-slate-400">On Hand</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-slate-400">MFG QTY</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-slate-400">Location</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-slate-400">REQ</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-slate-400">Shortage</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-slate-400 hidden xl:table-cell">Vendor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {items.map((item, idx) => {
              const hasStock = item.on_hand > 0 || item.mfg_qty > 0;
              const isMfgFloor = item.location === 'MFG Floor';

              return (
                <tr key={idx} className={`${!hasStock && !item.pcn ? 'bg-gray-50/50 dark:bg-slate-800/50' : isMfgFloor ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''} hover:bg-gray-50 dark:hover:bg-slate-700/30`}>
                  <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{item.line_no}</td>
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{item.aci_pn}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-slate-400 hidden lg:table-cell max-w-[160px] truncate">{item.description}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-slate-400 hidden md:table-cell">{item.pcn || '-'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-slate-400 hidden md:table-cell max-w-[120px] truncate">{item.mpn}</td>
                  <td className="px-3 py-2 text-center font-medium text-gray-900 dark:text-white">{item.on_hand}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={item.mfg_qty > 0 ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-gray-400'}>
                      {item.mfg_qty}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      isMfgFloor
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : item.location
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-400'
                    }`}>
                      {item.location || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-700 dark:text-slate-300">{item.required}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`font-bold ${item.shortage < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {item.shortage >= 0 ? '+' : ''}{item.shortage}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500 dark:text-slate-400 hidden xl:table-cell max-w-[100px] truncate">{item.vendor}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin h-7 w-7 border-3 border-teal-500 border-t-transparent rounded-full" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-16">
      <ArchiveBoxIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
      <p className="text-gray-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

function LaborSummaryTab({ enriched }: { enriched: EnrichedData | null }) {
  if (!enriched) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-300">{enriched.total_labor_hours}</p>
          <p className="text-xs uppercase font-semibold text-indigo-500/70 mt-1">Total Hours</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300">{enriched.traveler_count}</p>
          <p className="text-xs uppercase font-semibold text-emerald-500/70 mt-1">Travelers</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-extrabold text-green-700 dark:text-green-300">{enriched.completed_travelers}</p>
          <p className="text-xs uppercase font-semibold text-green-500/70 mt-1">Completed</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-extrabold text-purple-700 dark:text-purple-300">{enriched.progress_percent}%</p>
          <p className="text-xs uppercase font-semibold text-purple-500/70 mt-1">Progress</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 text-center">
          <p className="text-xl font-extrabold text-gray-800 dark:text-slate-200">{enriched.shortage_count}</p>
          <p className="text-xs uppercase font-semibold text-gray-500 mt-1">Shortages</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 text-center">
          <p className="text-xl font-extrabold text-gray-800 dark:text-slate-200">{enriched.kitting_percent}%</p>
          <p className="text-xs uppercase font-semibold text-gray-500 mt-1">Kitted</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 text-center">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
            enriched.health === 'complete' ? 'bg-green-100 text-green-700' :
            enriched.health === 'on_track' ? 'bg-blue-100 text-blue-700' :
            enriched.health === 'at_risk' ? 'bg-orange-100 text-orange-700' :
            enriched.health === 'blocked' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {enriched.health.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </span>
          <p className="text-xs uppercase font-semibold text-gray-500 mt-2">Health</p>
        </div>
      </div>
    </div>
  );
}

function TimelineTab({ events, loading }: { events: TimelineEvent[]; loading: boolean }) {
  if (loading) return <LoadingSpinner />;
  if (events.length === 0) return <EmptyState text="No events recorded for this job yet" />;

  const getIconComponent = (icon: string) => {
    switch (icon) {
      case 'briefcase': return <BriefcaseIcon className="h-4 w-4" />;
      case 'document': return <ClipboardDocumentListIcon className="h-4 w-4" />;
      case 'check': return <CheckCircleIcon className="h-4 w-4" />;
      case 'wrench': return <WrenchScrewdriverIcon className="h-4 w-4" />;
      case 'play': return <PlayIcon className="h-4 w-4" />;
      case 'stop': return <StopIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'job_created': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400';
      case 'traveler_created': return 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400';
      case 'traveler_completed': return 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400';
      case 'step_completed': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400';
      case 'labor_start': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400';
      case 'labor_end': return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400';
      default: return 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400';
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  };

  return (
    <div className="p-4">
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700" />

        <div className="space-y-4">
          {events.map((event, i) => (
            <div key={i} className="relative flex gap-4 pl-2">
              {/* Icon */}
              <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getIconColor(event.type)}`}>
                {getIconComponent(event.icon)}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{event.title}</p>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500">{formatTimestamp(event.timestamp)}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{event.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
