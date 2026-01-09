'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import {
  BellIcon,
  FunnelIcon,
  CheckIcon,
  TrashIcon,
  EnvelopeOpenIcon,
  EnvelopeIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'TRAVELER_UPDATE' | 'APPROVAL_REQUEST' | 'LABOR_ENTRY';
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

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [notifications, selectedType, selectedStatus, searchQuery]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch('http://acidashboard.aci.local:100/api/notifications/', {
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
      const response = await fetch(`http://acidashboard.aci.local:100/api/notifications/${notificationId}`, {
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
          fetch(`http://acidashboard.aci.local:100/api/notifications/${id}`, {
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
      alert('✅ All notifications marked as read!');
    } catch (error) {
      console.error('Error marking all as read:', error);
      alert('❌ Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId: number) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`http://acidashboard.aci.local:100/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== notificationId));
        alert('✅ Notification deleted!');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('❌ Failed to delete notification');
    }
  };

  const deleteSelected = async () => {
    if (selectedNotifications.length === 0) {
      alert('❌ Please select notifications to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedNotifications.length} notification(s)?`)) return;

    try {
      const token = localStorage.getItem('nexus_token');
      await Promise.all(
        selectedNotifications.map(id =>
          fetch(`http://acidashboard.aci.local:100/api/notifications/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        )
      );

      setNotifications(notifications.filter(n => !selectedNotifications.includes(n.id)));
      setSelectedNotifications([]);
      alert(`✅ Deleted ${selectedNotifications.length} notification(s)!`);
    } catch (error) {
      console.error('Error deleting notifications:', error);
      alert('❌ Failed to delete notifications');
    }
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
    switch (type) {
      case 'SUCCESS':
        return <CheckCircleIcon className="h-6 w-6 text-green-600" />;
      case 'WARNING':
        return <ExclamationCircleIcon className="h-6 w-6 text-yellow-600" />;
      case 'ERROR':
        return <ExclamationCircleIcon className="h-6 w-6 text-red-600" />;
      case 'INFO':
        return <InformationCircleIcon className="h-6 w-6 text-blue-600" />;
      default:
        return <BellIcon className="h-6 w-6 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return 'from-green-50 to-emerald-50 border-green-200';
      case 'WARNING':
        return 'from-yellow-50 to-amber-50 border-yellow-200';
      case 'ERROR':
        return 'from-red-50 to-rose-50 border-red-200';
      case 'INFO':
        return 'from-blue-50 to-indigo-50 border-blue-200';
      default:
        return 'from-gray-50 to-slate-50 border-gray-200';
    }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
        {/* Header */}
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1 flex items-center">
                <BellIcon className="h-8 w-8 mr-3" />
                Notifications Center
              </h1>
              <p className="text-blue-100">Manage and track all your notifications</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/30">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-blue-100">Total</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/30">
                <div className="text-2xl font-bold">{stats.unread}</div>
                <div className="text-xs text-blue-100">Unread</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions Bar */}
        <div className="mb-6 bg-white rounded-xl shadow-lg border-2 border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notifications..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Filters</span>
            </button>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={selectAll}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all shadow-md"
              >
                <CheckIcon className="h-5 w-5" />
                <span>{selectedNotifications.length === filteredNotifications.length ? 'Deselect All' : 'Select All'}</span>
              </button>
              <button
                onClick={markAllAsRead}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all shadow-md"
              >
                <EnvelopeOpenIcon className="h-5 w-5" />
                <span>Mark All Read</span>
              </button>
              <button
                onClick={deleteSelected}
                disabled={selectedNotifications.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-all shadow-md disabled:cursor-not-allowed"
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
                    <option value="INFO">Information</option>
                    <option value="SUCCESS">Success</option>
                    <option value="WARNING">Warning</option>
                    <option value="ERROR">Error</option>
                    <option value="TRAVELER_UPDATE">Traveler Update</option>
                    <option value="APPROVAL_REQUEST">Approval Request</option>
                    <option value="LABOR_ENTRY">Labor Entry</option>
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
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-12 text-center">
              <BellIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-xl text-gray-600 font-semibold">No notifications found</p>
              <p className="text-gray-500 mt-2">Try adjusting your filters or check back later</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
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
                            {notification.notification_type.replace('_', ' ')}
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
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
