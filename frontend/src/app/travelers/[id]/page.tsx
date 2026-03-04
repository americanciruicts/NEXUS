'use client';

import { Suspense } from 'react';
import { TravelerDetailPage } from './TravelerDetail';

export default function TravelerDetailPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg text-gray-500">Loading...</div></div>}>
      <TravelerDetailPage />
    </Suspense>
  );
}
