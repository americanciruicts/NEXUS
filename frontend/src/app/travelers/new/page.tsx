'use client';

import Layout from '@/components/layout/Layout';
import TravelerForm from '@/components/TravelerForm';

export default function NewTraveler() {
  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
        <div className="w-full p-4 lg:p-6">
          <TravelerForm mode="create" />
        </div>
      </div>
    </Layout>
  );
}