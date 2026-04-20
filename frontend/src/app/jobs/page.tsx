'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BriefcaseIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  BuildingStorefrontIcon,
  PlusCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config/api';
import Layout from '@/components/layout/Layout';
import { toast } from 'sonner';

interface EnrichedJob {
  id: number;
  job_number: string;
  description: string;
  customer: string;
  cust_pn: string;
  build_qty: number;
  order_qty: number;
  job_rev: string;
  cust_rev: string;
  wo_number: string;
  status: string;
  created_by: string;
  created_at: string | null;
  // Enriched fields
  traveler_count: number;
  completed_travelers: number;
  in_progress_travelers: number;
  progress_percent: number;
  total_labor_hours: number;
  health: string;
  has_overdue: boolean;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  'New': { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-800 dark:text-blue-300', dot: 'bg-blue-500' },
  'In Prep': { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-300', dot: 'bg-amber-500 animate-pulse' },
  'In Mfg': { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-800 dark:text-green-300', dot: 'bg-green-500 animate-pulse' },
};

const HEALTH_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  'needs_traveler': { label: 'No Traveler', bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-600 dark:text-slate-400', icon: XCircleIcon },
  'blocked': { label: 'Blocked', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: ExclamationTriangleIcon },
  'at_risk': { label: 'At Risk', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', icon: ClockIcon },
  'on_track': { label: 'On Track', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: ClipboardDocumentListIcon },
  'complete': { label: 'Complete', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: CheckCircleIcon },
};

export default function JobsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<EnrichedJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState<string | null>(null);
  const limit = 25;

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login');
    else if (user?.role !== 'ADMIN') router.push('/dashboard');
  }, [isAuthenticated, user, router]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexus_token');
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));

      const res = await fetch(`${API_BASE_URL}/jobs/list-enriched?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      setJobs(data.jobs);
      setTotal(data.total);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    if (user?.role === 'ADMIN') fetchJobs();
  }, [fetchJobs, user]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    const poll = setInterval(() => fetchJobs(), 120000);
    return () => clearInterval(poll);
  }, [fetchJobs, user]);

  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleAutoCreate = async (jobNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCreating(jobNumber);
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
        const err = await res.json().catch(() => ({ detail: 'Failed to create traveler' }));
        toast.error(err.detail || 'Failed to create traveler');
      }
    } catch {
      toast.error('Failed to create traveler');
    } finally {
      setCreating(null);
    }
  };

  if (!isAuthenticated || user?.role !== 'ADMIN') return null;

  const totalPages = Math.ceil(total / limit);

  // Filter by health on the client side (since enriched endpoint doesn't support it)
  const displayJobs = healthFilter ? jobs.filter(j => j.health === healthFilter) : jobs;

  // Count health statuses from current page for badges
  const healthCounts = jobs.reduce((acc, j) => { acc[j.health] = (acc[j.health] || 0) + 1; return acc; }, {} as Record<string, number>);

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return '#16a34a';
    if (pct >= 75) return '#2563eb';
    if (pct >= 50) return '#f59e0b';
    if (pct >= 25) return '#f97316';
    return '#ef4444';
  };

  return (
    <Layout fullWidth>
      <div className="px-2">
        {/* Header */}
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 rounded-2xl p-5 mb-5 relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/4 w-28 h-28 bg-white rounded-full translate-y-1/2" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                  <BriefcaseIcon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">Jobs</h1>
                  <p className="text-sm text-teal-100">KOSH Inventory Jobs &middot; {total} total</p>
                </div>
              </div>
              <button
                onClick={fetchJobs}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg border border-white/30 transition-colors"
              >
                <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Health summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.entries(HEALTH_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const count = healthCounts[key] || 0;
                return (
                  <button
                    key={key}
                    onClick={() => setHealthFilter(healthFilter === key ? '' : key)}
                    className={`bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5 border transition-all ${
                      healthFilter === key ? 'border-white/60 scale-105 shadow-lg' : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-teal-200" />
                      <span className="text-[10px] font-semibold text-teal-100 uppercase">{cfg.label}</span>
                    </div>
                    <p className="text-xl font-extrabold text-white mt-0.5">{count}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by job number, customer, or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-sm"
          />
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
            {['', 'New', 'In Prep', 'In Mfg'].map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(0); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    statusFilter === s
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30 scale-105'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {s ? <span className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${cfg?.dot?.replace(' animate-pulse','') || 'bg-gray-400'}`} />{s}</span> : 'All'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
            </div>
          ) : displayJobs.length === 0 ? (
            <div className="text-center py-20">
              <BriefcaseIcon className="h-14 w-14 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
              <p className="text-lg font-bold text-gray-700 dark:text-slate-300">No jobs found</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '4%' }} />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800">
                    <th className="px-2 py-3 text-left text-xs font-extrabold text-white uppercase">Job #</th>
                    <th className="px-2 py-3 text-left text-xs font-extrabold text-white uppercase">Customer</th>
                    <th className="px-2 py-3 text-left text-xs font-extrabold text-white uppercase hidden lg:table-cell">Description</th>
                    <th className="px-2 py-3 text-center text-xs font-extrabold text-white uppercase">QTY</th>
                    <th className="px-2 py-3 text-center text-xs font-extrabold text-white uppercase">Status</th>
                    <th className="px-2 py-3 text-center text-xs font-extrabold text-white uppercase">Health</th>
                    <th className="px-2 py-3 text-center text-xs font-extrabold text-white uppercase">Travelers</th>
                    <th className="px-2 py-3 text-center text-xs font-extrabold text-white uppercase">Progress</th>
                    <th className="px-2 py-3 text-center text-xs font-extrabold text-white uppercase hidden md:table-cell">Labor</th>
                    <th className="px-2 py-3 text-center text-xs font-extrabold text-white uppercase">BOM Rev</th>
                    <th className="px-2 py-3 text-center text-xs font-extrabold text-white uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {displayJobs.map((job) => {
                    const statusCfg = STATUS_CONFIG[job.status];
                    const healthCfg = HEALTH_CONFIG[job.health] || HEALTH_CONFIG['on_track'];
                    const HealthIcon = healthCfg.icon;

                    return (
                      <tr
                        key={job.id}
                        onClick={() => router.push(`/jobs/${encodeURIComponent(job.job_number)}`)}
                        className="cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-all"
                      >
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusCfg?.dot || 'bg-gray-400'}`} />
                            <span className="font-bold text-teal-700 dark:text-teal-400 text-sm truncate">{job.job_number}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className="font-semibold text-gray-900 dark:text-slate-200 text-xs truncate block">{job.customer || '-'}</span>
                        </td>
                        <td className="px-2 py-2.5 hidden lg:table-cell">
                          <span className="text-xs text-gray-500 dark:text-slate-400 truncate block">{job.description || '-'}</span>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{job.order_qty}</span>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusCfg?.bg || 'bg-gray-100'} ${statusCfg?.text || 'text-gray-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg?.dot || 'bg-gray-400'}`} />
                            {job.status}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${healthCfg.bg} ${healthCfg.text}`}>
                            <HealthIcon className="h-3 w-3" />
                            {healthCfg.label}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          {job.traveler_count > 0 ? (
                            <div className="text-xs">
                              <span className="font-bold text-gray-800 dark:text-slate-200">{job.traveler_count}</span>
                              <span className="text-gray-400 dark:text-slate-500 ml-0.5">
                                ({job.completed_travelers}
                                <CheckCircleIcon className="h-3 w-3 inline text-green-500 mx-0.5" />
                                {job.in_progress_travelers > 0 && <>{job.in_progress_travelers}<ClockIcon className="h-3 w-3 inline text-amber-500 mx-0.5" /></>})
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300 dark:text-slate-600">None</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          {job.traveler_count > 0 ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-1.5 rounded-full transition-all"
                                  style={{ width: `${Math.min(job.progress_percent, 100)}%`, backgroundColor: getProgressColor(job.progress_percent) }}
                                />
                              </div>
                              <span className="text-[10px] font-bold" style={{ color: getProgressColor(job.progress_percent) }}>{job.progress_percent}%</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-center hidden md:table-cell">
                          {job.total_labor_hours > 0 ? (
                            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{job.total_labor_hours}h</span>
                          ) : (
                            <span className="text-[10px] text-gray-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">{job.job_rev || '-'}</span>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          {job.traveler_count === 0 && (
                            <button
                              onClick={(e) => handleAutoCreate(job.job_number, e)}
                              disabled={creating === job.job_number}
                              className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 transition-colors disabled:opacity-50"
                              title="Auto-create traveler"
                            >
                              {creating === job.job_number ? (
                                <div className="animate-spin h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent rounded-full" />
                              ) : (
                                <PlusCircleIcon className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Showing <span className="font-bold text-gray-900 dark:text-white">{page * limit + 1}-{Math.min((page + 1) * limit, total)}</span> of <span className="font-bold">{total}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg disabled:opacity-30 hover:bg-teal-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronLeftIcon className="h-4 w-4 text-gray-600 dark:text-slate-300" />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) pageNum = i;
                    else if (page < 3) pageNum = i;
                    else if (page > totalPages - 4) pageNum = totalPages - 7 + i;
                    else pageNum = page - 3 + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          page === pageNum
                            ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30'
                            : 'text-gray-600 dark:text-slate-400 hover:bg-teal-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg disabled:opacity-30 hover:bg-teal-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronRightIcon className="h-4 w-4 text-gray-600 dark:text-slate-300" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
