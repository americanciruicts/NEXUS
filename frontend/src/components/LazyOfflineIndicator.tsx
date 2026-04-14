'use client';

import dynamic from 'next/dynamic';

const OfflineIndicator = dynamic(() => import('@/components/OfflineIndicator'), {
  ssr: false,
});

export default function LazyOfflineIndicator() {
  return <OfflineIndicator />;
}
