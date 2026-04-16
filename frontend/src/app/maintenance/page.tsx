'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { canAccessMaintenance } from '@/lib/access';
import { WrenchScrewdriverIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

// Served same-origin via the /formsm rewrite in next.config.ts. Loading the
// external URL directly would be cross-origin and the form's session cookies
// would be blocked, causing silent submission failures.
const MAINTENANCE_FORM_SRC = '/formsm/public/form/new/975dee18-714b-498a-9d1d-6fcdac49e21c';
const MAINTENANCE_FORM_EXTERNAL = 'http://aci.lmhosted.com/formsm/public/form/new/975dee18-714b-498a-9d1d-6fcdac49e21c';

export default function MaintenancePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!canAccessMaintenance(user)) {
      router.replace('/dashboard');
      return;
    }
    setChecked(true);
  }, [user, isLoading, router]);

  if (!checked) {
    return (
      <Layout fullWidth>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600 dark:text-slate-400">Loading…</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth>
      <div className="w-full p-4 lg:p-6">
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
              <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Maintenance Request</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Submit a maintenance request for the shop floor.</p>
            </div>
          </div>
          <a
            href={MAINTENANCE_FORM_EXTERNAL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            Open in new tab
          </a>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-slate-700">
          <iframe
            src={MAINTENANCE_FORM_SRC}
            title="Maintenance Request Form"
            width="100%"
            height="700"
            style={{ border: 'none', minHeight: '700px', display: 'block' }}
          />
        </div>
      </div>
    </Layout>
  );
}
