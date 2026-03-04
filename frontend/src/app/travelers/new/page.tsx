'use client';

import { Suspense } from 'react';
import { TravelerDetailPage } from '../[id]/TravelerDetail';

export default function NewTraveler() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg text-gray-500">Loading...</div></div>}>
      <TravelerDetailPage createMode={true} />
    </Suspense>
  );
}
