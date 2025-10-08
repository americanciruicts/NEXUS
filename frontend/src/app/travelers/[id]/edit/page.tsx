'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import TravelerForm from '@/components/TravelerForm';

export default function EditTravelerPage() {
  const params = useParams();
  const router = useRouter();
  const travelerId = params.id as string;

  const [travelerData, setTravelerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTraveler = async () => {
      try {
        const response = await fetch(`http://localhost:3002/travelers/by-job/${travelerId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setTravelerData(data);
        } else {
          console.error('Failed to fetch traveler');
        }
      } catch (error) {
        console.error('Error fetching traveler:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (travelerId) {
      fetchTraveler();
    }
  }, [travelerId]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600">Loading traveler...</div>
        </div>
      </Layout>
    );
  }

  if (!travelerData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-red-600">Traveler not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors"
        >
          Back
        </button>
      </div>
      <TravelerForm mode="edit" initialData={travelerData} travelerId={travelerId} />
    </Layout>
  );
}
