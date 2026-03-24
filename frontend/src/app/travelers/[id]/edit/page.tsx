'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function EditTravelerPage() {
  const params = useParams();
  const router = useRouter();
  const travelerId = params.id as string;

  // Redirect to the view page with edit mode enabled
  useEffect(() => {
    router.replace(`/travelers/${travelerId}?edit=true`);
  }, [travelerId, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg text-gray-500 dark:text-slate-400">Loading editor...</div>
    </div>
  );
}
