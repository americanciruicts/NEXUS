'use client';

import Layout from '@/components/layout/Layout';
import TravelerForm from '@/components/TravelerForm';

export default function NewTraveler() {
  return (
    <Layout fullWidth>
      <TravelerForm mode="create" />
    </Layout>
  );
}
