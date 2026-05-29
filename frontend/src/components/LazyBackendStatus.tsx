'use client';

import dynamic from 'next/dynamic';

const BackendStatus = dynamic(() => import('@/components/BackendStatus'), {
  ssr: false,
});

export default function LazyBackendStatus() {
  return <BackendStatus />;
}
