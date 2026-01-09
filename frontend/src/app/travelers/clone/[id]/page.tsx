'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import TravelerForm from '@/components/TravelerForm';

export default function CloneTravelerPage() {
  const params = useParams();
  const router = useRouter();
  const travelerId = params.id as string;

  const [travelerData, setTravelerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTraveler = async () => {
      try {
        const response = await fetch(`http://acidashboard.aci.local:100/api/travelers/by-job/${travelerId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('nexus_token') || 'mock-token'}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Remove the id so it creates a new traveler
          delete data.id;
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
      <Layout fullWidth>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
          <div className="w-full p-4 lg:p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-xl text-gray-600">Loading traveler...</div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!travelerData) {
    return (
      <Layout fullWidth>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
          <div className="w-full p-4 lg:p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-xl text-red-600">Traveler not found</div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
        <div className="w-full p-4 lg:p-6">
          {/* Header */}
          <div className="mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">Clone Traveler</h1>
                <p className="text-purple-100">Creating a new traveler based on {travelerId} with incremented revision</p>
              </div>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors border border-white/30"
              >
                Back
              </button>
            </div>
          </div>

          {/* TravelerForm in create mode with initialData (will auto-increment revision) */}
          <TravelerForm mode="create" initialData={travelerData} />
        </div>
      </div>
    </Layout>
  );
}
