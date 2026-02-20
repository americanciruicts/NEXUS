'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';
import { API_BASE_URL } from '@/config/api';
import {
  BellIcon,
  FunnelIcon,
  CheckIcon,
  TrashIcon,
  EnvelopeOpenIcon,
  ClockIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: 'TRAVELER_CREATED' | 'TRAVELER_UPDATED' | 'TRAVELER_DELETED' | 'LABOR_ENTRY_CREATED' | 'LABOR_ENTRY_UPDATED' | 'LABOR_ENTRY_DELETED' | 'TRACKING_ENTRY_CREATED' | 'TRACKING_ENTRY_UPDATED' | 'TRACKING_ENTRY_DELETED' | 'USER_LOGIN';
  is_read: boolean;
  created_at: string;
  related_entity_type?: string;
  related_entity_id?: number;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [notifications, selectedType, selectedStatus, searchQuery]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`${API_BASE_URL}/notifications/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(n => n.notification_type === selectedType);
    }

    // Filter by read status
    if (selectedStatus === 'read') {
      filtered = filtered.filter(n => n.is_read);
    } else if (selectedStatus === 'unread') {
      filtered = filtered.filter(n => !n.is_read);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_read: true })
      });

      if (response.ok) {
        setNotifications(notifications.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        ));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);

      await Promise.all(
        unreadIds.map(id =>
          fetch(`${API_BASE_URL}/notifications/${id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_read: true })
          })
        )
      );

      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read!');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = (notificationId: number) => {
    setConfirmModal({
      title: 'Delete Notification',
      message: 'Are you sure you want to delete this notification?',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const token = localStorage.getItem('nexus_token');
          const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            setNotifications(notifications.filter(n => n.id !== notificationId));
            toast.success('Notification deleted!');
          }
        } catch (error) {
          console.error('Error deleting notification:', error);
          toast.error('Failed to delete notification');
        }
      }
    });
  };

  const deleteSelected = () => {
    if (selectedNotifications.length === 0) {
      toast.error('Please select notifications to delete');
      return;
    }

    const count = selectedNotifications.length;
    setConfirmModal({
      title: 'Delete Notifications',
      message: `Are you sure you want to delete ${count} notification(s)?`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const token = localStorage.getItem('nexus_token');
          await Promise.all(
            selectedNotifications.map(id =>
              fetch(`${API_BASE_URL}/notifications/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
            )
          );

          setNotifications(notifications.filter(n => !selectedNotifications.includes(n.id)));
          setSelectedNotifications([]);
          toast.success(`Deleted ${count} notification(s)!`);
        } catch (error) {
          console.error('Error deleting notifications:', error);
          toast.error('Failed to delete notifications');
        }
      }
    });
  };

  const toggleSelectNotification = (id: number) => {
    if (selectedNotifications.includes(id)) {
      setSelectedNotifications(selectedNotifications.filter(nId => nId !== id));
    } else {
      setSelectedNotifications([...selectedNotifications, id]);
    }
  };

  const selectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type === 'USER_LOGIN') return <InformationCircleIcon className="h-6 w-6 text-blue-600" />;
    if (type.includes('CREATED')) return <CheckCircleIcon className="h-6 w-6 text-green-600" />;
    if (type.includes('UPDATED')) return <InformationCircleIcon className="h-6 w-6 text-yellow-600" />;
    if (type.includes('DELETED')) return <ExclamationCircleIcon className="h-6 w-6 text-red-600" />;
    return <BellIcon className="h-6 w-6 text-gray-600" />;
  };

  const getNotificationColor = (type: string) => {
    if (type === 'USER_LOGIN') return 'from-blue-50 to-indigo-50 border-blue-200';
    if (type.includes('CREATED')) return 'from-green-50 to-emerald-50 border-green-200';
    if (type.includes('UPDATED')) return 'from-yellow-50 to-amber-50 border-yellow-200';
    if (type.includes('DELETED')) return 'from-red-50 to-rose-50 border-red-200';
    return 'from-gray-50 to-slate-50 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    read: notifications.filter(n => n.is_read).length
  };

  if (loading) {
    return (
      <Layout fullWidth>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl text-gray-600">Loading notifications...</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-3 sm:p-4 md:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white rounded-2xl p-5 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                <BellIcon className="w-7 h-7 text-yellow-300" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Notifications</h1>
                <p className="text-sm text-blue-200/80 mt-0.5">Manage and track all your notifications</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 sm:py-3 border border-white/20 text-center">
                <div className="text-xl sm:text-2xl font-extrabold">{stats.total}</div>
                <div className="text-[11px] text-blue-200/70 uppercase tracking-wider font-semibold">Total</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 sm:py-3 border border-white/20 text-center">
                <div className="text-xl sm:text-2xl font-extrabold">{stats.unread}</div>
                <div className="text-[11px] text-blue-200/70 uppercase tracking-wider font-semibold">Unread</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions Bar */}
        <div className="mb-4 sm:mb-6 bg-white rounded-xl shadow-lg border-2 border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 min-w-0 sm:min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notifications..."
                className="w-full px-3 sm:px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm sm:text-base"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md text-sm sm:text-base"
            >
              <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Filters</span>
            </button>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={selectAll}
                className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all shadow-md text-xs sm:text-sm"
              >
                <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">{selectedNotifications.length === filteredNotifications.length ? 'Deselect All' : 'Select All'}</span>
                <span className="sm:hidden">All</span>
              </button>
              <button
                onClick={markAllAsRead}
                className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all shadow-md text-xs sm:text-sm"
              >
                <EnvelopeOpenIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Mark All Read</span>
                <span className="sm:hidden">Read</span>
              </button>
              <button
                onClick={deleteSelected}
                disabled={selectedNotifications.length === 0}
                className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-all shadow-md disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                <TrashIcon className="h-5 w-5" />
                <span>Delete Selected ({selectedNotifications.length})</span>
              </button>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t-2 border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Notification Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="all">All Types</option>
                    <option value="USER_LOGIN">User Login</option>
                    <option value="TRAVELER_CREATED">Traveler Created</option>
                    <option value="TRAVELER_UPDATED">Traveler Updated</option>
                    <option value="TRAVELER_DELETED">Traveler Deleted</option>
                    <option value="LABOR_ENTRY_CREATED">Labor Entry Created</option>
                    <option value="LABOR_ENTRY_UPDATED">Labor Entry Updated</option>
                    <option value="LABOR_ENTRY_DELETED">Labor Entry Deleted</option>
                    <option value="TRACKING_ENTRY_CREATED">Tracking Entry Created</option>
                    <option value="TRACKING_ENTRY_UPDATED">Tracking Entry Updated</option>
                    <option value="TRACKING_ENTRY_DELETED">Tracking Entry Deleted</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Read Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="all">All Notifications</option>
                    <option value="unread">Unread Only</option>
                    <option value="read">Read Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Table Header + Pagination */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 px-3 py-2 rounded-t-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-14 h-14 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold text-white">Notifications</h2>
                <span className="text-xs font-semibold text-white bg-white/20 px-2 py-0.5 rounded-full">
                  {filteredNotifications.length}
                </span>
              </div>
            </div>
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <BellIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-xl text-gray-600 font-semibold">No notifications found</p>
              <p className="text-gray-500 mt-2">Try adjusting your filters or check back later</p>
            </div>
          ) : (
          <div className="divide-y divide-gray-100">
            {paginatedNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-gradient-to-r ${getNotificationColor(notification.notification_type)} rounded-xl shadow-md border-2 p-4 transition-all hover:shadow-xl ${
                  notification.is_read ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedNotifications.includes(notification.id)}
                    onChange={() => toggleSelectNotification(notification.id)}
                    className="mt-1 h-5 w-5 text-blue-600 rounded cursor-pointer"
                  />

                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.notification_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                          {notification.title}
                          {!notification.is_read && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white">
                              NEW
                            </span>
                          )}
                        </h3>
                        <p className="text-gray-700 mt-1">{notification.message}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {formatDate(notification.created_at)}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                            {notification.notification_type.replaceAll('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <EnvelopeOpenIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}

          {/* Bottom Pagination */}
          {filteredNotifications.length > 0 && (
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
                  <span className="text-xs text-white/80">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredNotifications.length)} of {filteredNotifications.length}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 rounded text-xs font-semibold bg-white/20 border border-white/30 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 rounded text-xs font-semibold bg-white/20 border border-white/30 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) page = i + 1;
                    else if (currentPage <= 3) page = i + 1;
                    else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                    else page = currentPage - 2 + i;
                    return (
                      <button key={page} onClick={() => setCurrentPage(page)} className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${currentPage === page ? 'bg-white text-indigo-700 shadow-sm' : 'bg-white/20 border border-white/30 text-white hover:bg-white/30'}`}>{page}</button>
                    );
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-2 py-1 rounded text-xs font-semibold bg-white/20 border border-white/30 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed">›</button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="px-2 py-1 rounded text-xs font-semibold bg-white/20 border border-white/30 text-white hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
            <p className="text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
