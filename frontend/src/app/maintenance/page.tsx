'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { canAccessMaintenance } from '@/lib/access';

// Served same-origin via the /formsm rewrite in next.config.ts. Loading the
// external URL directly would be cross-origin and the form's session cookies
// would be blocked, causing silent submission failures.
const MAINTENANCE_FORM_SRC = '/formsm/public/form/new/864c8594-4dfc-4658-b403-c0b2bceecd77';

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
      <iframe
        src={MAINTENANCE_FORM_SRC}
        title="Maintenance Request Form"
        className="w-full"
        style={{ border: 'none', display: 'block', height: 'calc(100vh - 5.5rem)' }}
      />
    </Layout>
  );
}
