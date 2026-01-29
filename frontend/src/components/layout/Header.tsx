'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { UserCircleIcon, BellIcon, UserIcon, ArrowRightOnRectangleIcon, ChevronDownIcon, CheckIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import GlobalSearch from '@/components/GlobalSearch';

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  created_by_username?: string;
}

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTravelerMenu, setShowTravelerMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path: string) => {
    if (path === '/travelers') {
      return pathname === path || pathname?.startsWith('/travelers/') && !pathname.includes('/tracking');
    }
    return pathname === path || pathname?.startsWith(path + '/');
  };

  const getLinkClasses = (path: string) => {
    const baseClasses = "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200";
    if (isActive(path)) {
      return `${baseClasses} bg-white/20 text-white shadow-sm border border-white/30`;
    }
    return `${baseClasses} text-blue-50 hover:bg-white/10 hover:text-white`;
  };

  // Fetch notifications
  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch('http://acidashboard.aci.local:100/api/notifications/?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('nexus_token');
      await fetch(`http://acidashboard.aci.local:100/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_read: true })
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      await fetch('http://acidashboard.aci.local:100/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <header className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 shadow-2xl no-print sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <Link href="/dashboard" className="flex items-center group">
            <Image
              src="/nexus-logo-navbar.svg"
              alt="NEXUS"
              width={200}
              height={64}
              className="h-12 w-auto group-hover:scale-105 transition-all duration-300"
            />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-2 items-center">
            <Link href="/dashboard" className={getLinkClasses('/dashboard')}>
              Dashboard
            </Link>

            {/* Travelers Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTravelerMenu(!showTravelerMenu)}
                className={`${getLinkClasses('/travelers')} flex items-center space-x-1`}
              >
                <span>Travelers</span>
                <ChevronDownIcon className="h-4 w-4" />
              </button>

              {showTravelerMenu && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50 border border-gray-200">
                  <div className="py-1">
                    <Link
                      href="/travelers"
                      onClick={() => setShowTravelerMenu(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      All Travelers
                    </Link>
                    {user?.role !== 'OPERATOR' && (
                      <Link
                        href="/travelers/new"
                        onClick={() => setShowTravelerMenu(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        New Traveler
                      </Link>
                    )}
                    <Link
                      href="/travelers/tracking"
                      onClick={() => setShowTravelerMenu(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      Traveler Tracking
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <Link href="/labor-tracking" className={getLinkClasses('/labor-tracking')}>
              Labor Tracking
            </Link>
            {user?.role !== 'OPERATOR' && (
              <Link href="/reports" className={getLinkClasses('/reports')}>
                Reports
              </Link>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Global Search */}
            <GlobalSearch />

            {/* Notifications */}
            {user?.role === 'ADMIN' && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-white/80 hover:text-white transition-colors"
                  title="Notifications"
                >
                  <BellIcon className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-blue-600">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50 border border-gray-200 max-h-[500px] overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                        >
                          <CheckIcon className="h-3 w-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    <div className="overflow-y-auto flex-1">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <BellIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                              !notification.is_read ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => !notification.is_read && markAsRead(notification.id)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                <div className="flex items-center space-x-2 mt-2">
                                  <span className="text-xs text-gray-500">{formatTime(notification.created_at)}</span>
                                  {notification.created_by_username && (
                                    <>
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="text-xs text-gray-500">by {notification.created_by_username}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {!notification.is_read && (
                                <div className="ml-2 flex-shrink-0">
                                  <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                        <Link
                          href="/notifications"
                          onClick={() => setShowNotifications(false)}
                          className="block w-full text-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          View All Notifications
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer"
                title="User Menu"
              >
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user?.username || 'Guest'}</p>
                  <p className="text-xs text-blue-200">{user?.role || 'No Role'}</p>
                </div>
                <UserCircleIcon className="h-9 w-9 text-white flex-shrink-0" />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50 border border-gray-200">
                  <div className="py-1">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <p className="text-sm font-semibold text-gray-900">{user?.username}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{user?.role}</p>
                      {user?.isApprover && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1.5">
                          Approver
                        </span>
                      )}
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <UserIcon className="h-4 w-4 mr-3" />
                      Profile
                    </Link>
                    {user?.role === 'ADMIN' && (
                      <>
                        <Link
                          href="/notifications"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <BellIcon className="h-4 w-4 mr-3" />
                          Notifications
                        </Link>
                        <Link
                          href="/users"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <UsersIcon className="h-4 w-4 mr-3" />
                          User Management
                        </Link>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors border-t border-gray-100"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
    </header>
  );
}