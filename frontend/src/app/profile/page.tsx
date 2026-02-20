'use client';

import { useAuth } from '@/context/AuthContext';
import { UserCircleIcon, EnvelopeIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import Layout from '@/components/layout/Layout';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="w-full space-y-4 p-4 lg:p-6">
          {/* Header - Icon and Username Together */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 shadow-lg rounded-lg p-6 text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                <div className="h-24 w-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30">
                  <UserCircleIcon className="h-20 w-20 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold">{user.username}</h1>
                <p className="text-blue-100 mt-1">{user.email || 'No email provided'}</p>
                <div className="flex items-center space-x-3 mt-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm">
                    {user.role}
                  </span>
                  {user.isApprover && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/90 backdrop-blur-sm">
                      <ShieldCheckIcon className="h-4 w-4 mr-1" />
                      Approver
                    </span>
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="bg-white shadow-lg rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>

            <div className="space-y-6">
              {/* Username */}
              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                <UserCircleIcon className="h-6 w-6 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Username</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{user.username}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                <EnvelopeIcon className="h-6 w-6 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{user.email || 'Not provided'}</p>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                <ShieldCheckIcon className="h-6 w-6 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Role</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{user.role}</p>
                  {user.isApprover && (
                    <p className="text-sm text-green-600 mt-1">✓ Has approval permissions</p>
                  )}
                </div>
              </div>
            </div>

            {/* Permissions Section */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                  <span className="text-sm text-gray-700">View Travelers</span>
                </div>
                {user.role !== 'OPERATOR' && (
                  <>
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                      <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                      <span className="text-sm text-gray-700">Create Travelers</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                      <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                      <span className="text-sm text-gray-700">Edit Travelers</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                      <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                      <span className="text-sm text-gray-700">View Reports</span>
                    </div>
                  </>
                )}
                {user.isApprover && (
                  <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-green-600"></div>
                    <span className="text-sm text-gray-700">Approve Travelers</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                  <span className="text-sm text-gray-700">Track Time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
