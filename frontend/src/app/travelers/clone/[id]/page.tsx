'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import TravelerForm from '@/components/TravelerForm';
import { API_BASE_URL } from '@/config/api';

export default function CloneTravelerPage() {
  const params = useParams();
  const router = useRouter();
  const travelerId = params.id as string;

  const [travelerData, setTravelerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTraveler = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/travelers/by-job/${travelerId}`, {
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
          <div className="mb-6 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white rounded-2xl p-5 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-purple-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Clone Traveler</h1>
                  <p className="text-sm text-blue-200/80 mt-0.5">Creating a new traveler based on {travelerId} with incremented revision</p>
                </div>
              </div>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl font-semibold transition-colors border border-white/20"
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
