'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/layout/Layout';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, UserCircleIcon, EyeIcon, EyeSlashIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/config/api';

// Toast notification component
interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

// Custom Confirm Modal component
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all shadow-md"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Start fade out after 4 seconds
    const fadeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 4000);

    // Remove after fade completes
    const removeTimer = setTimeout(() => {
      onClose();
    }, 4500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [onClose]);

  return (
    <div
      className="fixed top-4 right-4 z-50 transition-all duration-500"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(100px)',
      }}
    >
      <div className={`flex items-center space-x-3 px-6 py-4 rounded-lg shadow-2xl backdrop-blur-md border ${
        type === 'success'
          ? 'bg-green-500/95 text-white border-green-400'
          : 'bg-red-500/95 text-white border-red-400'
      }`}>
        {type === 'success' ? (
          <CheckCircleIcon className="h-6 w-6" />
        ) : (
          <ExclamationCircleIcon className="h-6 w-6" />
        )}
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  role: 'ADMIN' | 'OPERATOR';
  is_approver: boolean;
  is_itar: boolean;
  is_active: boolean;
}

interface UserFormData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  role: 'ADMIN' | 'OPERATOR';
  is_approver: boolean;
  is_itar: boolean;
}

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    role: 'OPERATOR',
    is_approver: false,
    is_itar: false
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Search, filter, and pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'OPERATOR'>('ALL');
  const [itarFilter, setItarFilter] = useState<'ALL' | 'ITAR' | 'NON_ITAR'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    userId: number | null;
    userName: string;
  }>({ isOpen: false, userId: null, userName: '' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // Filter users based on search term and role
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesItar = itarFilter === 'ALL' || (itarFilter === 'ITAR' ? u.is_itar : !u.is_itar);
    return matchesSearch && matchesRole && matchesItar;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, itarFilter]);

  const generateRandomPassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // special

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    const shuffled = password.split('').sort(() => Math.random() - 0.5).join('');
    setFormData({ ...formData, password: shuffled });
  };

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchUsers();
  }, [user, router]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      console.log('🔍 Fetching users...');
      console.log('🔑 Token:', token ? 'Found' : 'Missing');

      const response = await fetch(`${API_BASE_URL}/users/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Users fetched:', data);
        console.log('📊 Total users:', data.length);
        setUsers(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch users:', response.status, response.statusText);
        console.error('❌ Error details:', errorText);
      }
    } catch (error) {
      console.error('❌ Exception while fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('nexus_token');
      const url = editingUser
        ? `${API_BASE_URL}/users/${editingUser.id}`
        : `${API_BASE_URL}/users/`;

      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser
        ? { ...formData, password: undefined } // Don't send password on update unless changed
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchUsers();
        handleCloseModal();
        showToast(editingUser ? 'User updated successfully!' : 'User created successfully!', 'success');
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to save user');
        showToast(data.detail || 'Failed to save user', 'error');
      }
    } catch (error) {
      setError('Failed to save user');
      showToast('Failed to save user', 'error');
    }
  };

  const openDeleteConfirm = (userId: number, userName: string) => {
    setConfirmModal({ isOpen: true, userId, userName });
  };

  const handleDelete = async () => {
    if (!confirmModal.userId) return;

    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`${API_BASE_URL}/users/${confirmModal.userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchUsers();
        showToast('User deleted successfully!', 'success');
      } else {
        showToast('Failed to delete user', 'error');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      showToast('Failed to delete user', 'error');
    } finally {
      setConfirmModal({ isOpen: false, userId: null, userName: '' });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      first_name: user.first_name,
      role: user.role,
      is_approver: user.is_approver,
      is_itar: user.is_itar
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      role: 'OPERATOR',
      is_approver: false,
      is_itar: false
    });
    setError('');
    setShowPassword(false);
  };

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="w-full space-y-4 p-4 lg:p-6">
          {/* Toast Notification */}
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}

          {/* Confirm Delete Modal */}
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            title="Delete User"
            message={`Are you sure you want to delete "${confirmModal.userName}"? This action cannot be undone.`}
            onConfirm={handleDelete}
            onCancel={() => setConfirmModal({ isOpen: false, userId: null, userName: '' })}
          />

          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 shadow-2xl rounded-2xl p-5 md:p-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                  <svg className="w-7 h-7 text-pink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">User Management</h1>
                  <p className="text-sm text-blue-200/80 mt-0.5">Manage users, roles, and permissions ({filteredUsers.length} users)</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 rounded-xl border-0 w-full sm:w-64 focus:ring-2 focus:ring-white/50 shadow-md text-sm"
                  />
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-white text-indigo-700 px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2 shadow-lg font-bold text-sm"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Add User</span>
                </button>
              </div>
            </div>
          </div>

        {/* Role & ITAR Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'ADMIN', 'OPERATOR'] as const).map((role) => {
            const count = role === 'ALL' ? users.length : users.filter(u => u.role === role).length;
            return (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  roleFilter === role
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {role === 'ALL' ? 'All' : role === 'ADMIN' ? 'Admin' : 'Operator'}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  roleFilter === role ? 'bg-white/20' : 'bg-gray-100'
                }`}>{count}</span>
              </button>
            );
          })}
          <div className="w-px h-8 bg-gray-300 mx-1" />
          {(['ALL', 'ITAR', 'NON_ITAR'] as const).map((itar) => {
            const count = itar === 'ALL' ? users.length : itar === 'ITAR' ? users.filter(u => u.is_itar).length : users.filter(u => !u.is_itar).length;
            return (
              <button
                key={itar}
                onClick={() => setItarFilter(itar)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  itarFilter === itar
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {itar === 'ALL' ? 'All ITAR' : itar === 'ITAR' ? 'ITAR' : 'Non-ITAR'}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  itarFilter === itar ? 'bg-white/20' : 'bg-gray-100'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* User Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <>
            {/* Table Header + Pagination */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 px-3 py-2 rounded-t-xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-14 h-14 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
              </div>
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xs sm:text-sm font-bold text-white">User Management</h2>
                  <span className="text-xs font-semibold text-white bg-white/20 px-2 py-0.5 rounded-full">
                    {filteredUsers.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden">
              <div className="divide-y divide-gray-200">
                {paginatedUsers.map((u) => (
                  <div key={u.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserCircleIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{u.first_name}</div>
                          <div className="text-xs text-gray-500">@{u.username}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button onClick={() => handleEdit(u)} className="text-blue-600 p-2 rounded-lg hover:bg-blue-50" title="Edit">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => openDeleteConfirm(u.id, u.first_name || u.username)} className="text-red-600 p-2 rounded-lg hover:bg-red-50" title="Delete">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2 ml-13">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>{u.role}</span>
                      {u.is_approver && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">APPROVER</span>}
                      {u.is_itar && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">ITAR</span>}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto relative">
              <div className="absolute top-0 left-0 right-0 h-14 overflow-hidden pointer-events-none z-20">
                <div className="absolute top-0 right-8 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2" />
                <div className="absolute top-2 left-12 w-12 h-12 bg-white/10 rounded-full" />
                <div className="absolute top-0 right-1/3 w-8 h-8 bg-white/5 rounded-full translate-y-1" />
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800">
                    <th className="px-6 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wider">User Information</th>
                    <th className="px-6 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <UserCircleIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{u.first_name}</div>
                              <div className="text-sm text-gray-500">@{u.username}</div>
                              <div className="text-sm text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {u.role}
                            </span>
                            {u.is_approver && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                APPROVER
                              </span>
                            )}
                            {u.is_itar && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                ITAR
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(u)}
                              className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-all"
                              title="Edit User"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(u.id, u.first_name || u.username)}
                              className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-all"
                              title="Delete User"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>

            {paginatedUsers.length === 0 && (
              <div className="text-center py-12">
                <UserCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No users found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try a different search term.' : 'Get started by adding a new user.'}
                </p>
              </div>
            )}

            {/* Bottom Pagination */}
            {filteredUsers.length > 0 && (
              <div className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 px-3 py-2 relative overflow-hidden rounded-b-xl">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="pagination-select">
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-xs text-white/80">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 rounded text-xs font-semibold bg-white/20 border border-white/30 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-2 py-1 rounded text-xs font-semibold bg-white/20 border border-white/30 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={`btm-${pageNum}`}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                            currentPage === pageNum
                              ? 'bg-white text-indigo-700 shadow-sm'
                              : 'bg-white/20 border border-white/30 text-white hover:bg-white/30'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-2 py-1 rounded text-xs font-semibold bg-white/20 border border-white/30 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed">›</button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1 rounded text-xs font-semibold bg-white/20 border border-white/30 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
                  </div>
                </div>
              </div>
            )}
            </>
            )}
          </div>

          {/* Add/Edit User Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gradient-to-br from-blue-900/30 via-indigo-900/30 to-purple-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-4 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-all"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          onBlur={(e) => {
                            const email = e.target.value;
                            if (email && !email.includes('@')) {
                              setFormData({ ...formData, email: `${email}@americancircuits.com` });
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                          placeholder="username@americancircuits.com"
                        />
                      </div>
                    </div>

                    {!editingUser && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                        <div className="flex space-x-2">
                          <div className="relative flex-1">
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                              placeholder="Enter password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                              title={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? (
                                <EyeSlashIcon className="h-5 w-5" />
                              ) : (
                                <EyeIcon className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={generateRandomPassword}
                            className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold whitespace-nowrap"
                            title="Generate random password"
                          >
                            Generate
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'OPERATOR' })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                      >
                        <option value="OPERATOR">Operator</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Permissions</p>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="is_approver"
                        checked={formData.is_approver}
                        onChange={(e) => setFormData({ ...formData, is_approver: e.target.checked })}
                        className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Approver - Can approve travelers and changes</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="is_itar"
                        checked={formData.is_itar}
                        onChange={(e) => setFormData({ ...formData, is_itar: e.target.checked })}
                        className="mr-3 h-4 w-4 text-amber-600 rounded focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-gray-700">ITAR Access - Can view travelers with &apos;M&apos; in job number</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl"
                    >
                      {editingUser ? 'Update User' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </Layout>
  );
}
