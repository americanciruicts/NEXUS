'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { UserCircleIcon, BellIcon, UserIcon, ArrowRightOnRectangleIcon, ChevronDownIcon, CheckIcon, UsersIcon, Bars3Icon, XMarkIcon, HomeIcon, ClipboardDocumentListIcon, ClockIcon, ChartBarSquareIcon, QueueListIcon, PlusCircleIcon, MapPinIcon, WrenchScrewdriverIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { canAccessMaintenance } from '@/lib/access';
import GlobalSearch from '@/components/GlobalSearch';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config/api';

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
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTravelerMenu, setShowTravelerMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);

  const isActive = (path: string) => {
    if (path === '/travelers') {
      return pathname === path || pathname?.startsWith('/travelers/');
    }
    return pathname === path || pathname?.startsWith(path + '/');
  };

  const getLinkClasses = (path: string) => {
    const baseClasses = "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200";
    if (isActive(path)) {
      return `${baseClasses} bg-white/20 dark:bg-white/15 text-white shadow-sm border border-white/30 dark:border-white/20`;
    }
    return `${baseClasses} text-teal-50 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-white/10 hover:text-white`;
  };

  // Fetch notifications
  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchNotifications();
      // Poll for new notifications every 2 minutes — reduced from 30s
      const interval = setInterval(fetchNotifications, 120000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`${API_BASE_URL}/notifications/?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);

        const newNotifications = data.filter((n: Notification) => !n.is_read);
        const newCount = newNotifications.length;
        setUnreadCount(newCount);

        // Show toast for NEW notifications (when count increases)
        if (newCount > prevUnreadCount && prevUnreadCount !== 0) {
          const latestNew = newNotifications[0]; // Most recent unread
          if (latestNew) {
            if (latestNew.notification_type === 'USER_LOGIN') {
              toast.info(latestNew.title, {
                description: latestNew.message,
                action: {
                  label: 'View',
                  onClick: () => setShowNotifications(true)
                }
              });
            } else {
              // Show toast for other notification types
              toast.info(latestNew.title, {
                description: latestNew.message,
                action: {
                  label: 'View',
                  onClick: () => setShowNotifications(true)
                }
              });
            }
          }
        }
        setPrevUnreadCount(newCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('nexus_token');
      await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
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
      await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
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
    <header className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 shadow-2xl no-print sticky top-0 z-50 border-b border-white/10">
      <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white rounded-full translate-y-1/2" />
        <div className="absolute top-0 left-2/3 w-24 h-24 bg-white rounded-full -translate-y-1/2" />
      </div>
      <div className="relative z-10 max-w-full mx-auto px-3">
        <div className="flex justify-between items-center h-14">
          {/* Logo and Title */}
          <Link href="/dashboard" className="flex items-center group flex-shrink-0">
            <Image
              src="/nexus-logo-navbar.svg"
              alt="NEXUS"
              width={140}
              height={44}
              className="h-8 w-auto group-hover:scale-105 transition-all duration-300"
            />
          </Link>

          {/* Navigation Links - Hidden on mobile */}
          <nav className="hidden md:flex space-x-2 items-center">
            <Link href="/dashboard" className={`${getLinkClasses('/dashboard')} flex items-center space-x-1`}>
              <HomeIcon className="h-4 w-4 text-yellow-300" />
              <span>Dashboard</span>
            </Link>

            {/* Travelers Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTravelerMenu(!showTravelerMenu)}
                className={`${getLinkClasses('/travelers')} flex items-center space-x-1`}
              >
                <ClipboardDocumentListIcon className="h-4 w-4 text-teal-300" />
                <span>Travelers</span>
                <ChevronDownIcon className="h-3.5 w-3.5 text-teal-300" />
              </button>

              {showTravelerMenu && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl dark:shadow-slate-900/50 ring-1 ring-black ring-opacity-5 dark:ring-slate-600 z-50 border border-gray-200 dark:border-slate-700">
                  <div className="py-1">
                    <Link
                      href="/travelers"
                      onClick={() => setShowTravelerMenu(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                    >
                      <QueueListIcon className="h-4 w-4 text-blue-600" />
                      <span>All Travelers</span>
                    </Link>
                    {user?.role !== 'OPERATOR' && (
                      <Link
                        href="/travelers/new"
                        onClick={() => setShowTravelerMenu(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                      >
                        <PlusCircleIcon className="h-4 w-4 text-green-600" />
                        <span>New Traveler</span>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
            {user?.role === 'ADMIN' && (
              <Link href="/jobs" className={`${getLinkClasses('/jobs')} flex items-center space-x-1`}>
                <BriefcaseIcon className="h-4 w-4 text-orange-300" />
                <span>Jobs</span>
              </Link>
            )}
            <Link href="/labor-tracking" className={`${getLinkClasses('/labor-tracking')} flex items-center space-x-1`}>
              <ClockIcon className="h-4 w-4 text-green-300" />
              <span>Labor</span>
            </Link>
            {user?.role !== 'OPERATOR' && (
              <Link href="/reports" className={`${getLinkClasses('/reports')} flex items-center space-x-1`}>
                <ChartBarSquareIcon className="h-4 w-4 text-purple-300" />
                <span>Reports</span>
              </Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link href="/analytics" className={`${getLinkClasses('/analytics')} flex items-center space-x-1`}>
                <ChartBarSquareIcon className="h-4 w-4 text-indigo-300" />
                <span>Analytics</span>
              </Link>
            )}
            {canAccessMaintenance(user) && (
              <Link href="/maintenance" className={`${getLinkClasses('/maintenance')} flex items-center space-x-1`}>
                <WrenchScrewdriverIcon className="h-4 w-4 text-orange-300" />
                <span>Maintenance</span>
              </Link>
            )}
          </nav>

          {/* Right side: mobile hamburger + desktop items */}
          <div className="flex items-center space-x-2">
            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-md text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle mobile menu"
            >
              {showMobileMenu ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>

            {/* Mobile-only: theme toggle and user icon */}
            <div className="flex md:hidden items-center space-x-1">
              <button
                onClick={toggleTheme}
                className="p-2 text-white/80 hover:text-white transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5 text-yellow-300" />}
              </button>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="p-2 text-white/80 hover:text-white transition-colors"
                aria-label="User menu"
              >
                <UserCircleIcon className="h-6 w-6 text-pink-300" />
              </button>
            </div>

            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center space-x-2">
              {/* Global Search */}
              <GlobalSearch />

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-white/80 hover:text-white transition-colors"
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <MoonIcon className="h-5 w-5" />
                ) : (
                  <SunIcon className="h-5 w-5 text-yellow-300" />
                )}
              </button>

            {/* Notifications */}
            {user?.role === 'ADMIN' && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-white/80 hover:text-white transition-colors"
                  title="Notifications"
                >
                  <BellIcon className="h-5 w-5 text-yellow-300" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-teal-600">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-[400px] bg-white dark:bg-slate-800 rounded-lg shadow-xl dark:shadow-slate-900/50 ring-1 ring-black ring-opacity-5 dark:ring-slate-600 z-50 border border-gray-200 dark:border-slate-700 max-h-[500px] overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-slate-700 dark:to-slate-700 flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Notifications</h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center space-x-1"
                        >
                          <CheckIcon className="h-3 w-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    <div className="overflow-y-auto flex-1">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                          <BellIcon className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-slate-500" />
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                              !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                            }`}
                            onClick={() => !notification.is_read && markAsRead(notification.id)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900 dark:text-slate-100' : 'text-gray-700 dark:text-slate-300'}`}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{notification.message}</p>
                                <div className="flex items-center space-x-2 mt-2">
                                  <span className="text-xs text-gray-500 dark:text-slate-400">{formatTime(notification.created_at)}</span>
                                  {notification.created_by_username && (
                                    <>
                                      <span className="text-xs text-gray-400 dark:text-slate-500">•</span>
                                      <span className="text-xs text-gray-500 dark:text-slate-400">by {notification.created_by_username}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {!notification.is_read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="ml-2 flex-shrink-0 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                                  title="Mark as read"
                                >
                                  Done
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                        <Link
                          href="/notifications"
                          onClick={() => setShowNotifications(false)}
                          className="block w-full text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
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
                className="flex items-center space-x-1.5 hover:bg-white/10 px-2 py-1 rounded-lg transition-all duration-200 cursor-pointer"
                title="User Menu"
              >
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user?.first_name || (user?.username?.includes('@') ? user.username.split('@')[0].charAt(0).toUpperCase() + user.username.split('@')[0].slice(1) : user?.username) || 'Guest'}</p>
                  <p className="text-xs text-teal-200">{user?.role || 'No Role'}</p>
                </div>
                <UserCircleIcon className="h-7 w-7 text-pink-300 flex-shrink-0" />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl dark:shadow-slate-900/50 ring-1 ring-black ring-opacity-5 dark:ring-slate-600 z-50 border border-gray-200 dark:border-slate-700">
                  <div className="py-1">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-slate-700 dark:to-slate-700">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{user?.first_name || (user?.username?.includes('@') ? user.username.split('@')[0].charAt(0).toUpperCase() + user.username.split('@')[0].slice(1) : user?.username)}</p>
                      <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5">{user?.role}</p>
                      {user?.isApprover && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 mt-1.5">
                          Approver
                        </span>
                      )}
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                    >
                      <UserIcon className="h-4 w-4 mr-3 text-blue-600" />
                      Profile
                    </Link>
                    {user?.role === 'ADMIN' && (
                      <>
                        <Link
                          href="/notifications"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                        >
                          <BellIcon className="h-4 w-4 mr-3 text-yellow-600" />
                          Notifications
                        </Link>
                        <Link
                          href="/users"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                        >
                          <UsersIcon className="h-4 w-4 mr-3 text-purple-600" />
                          User Management
                        </Link>
                        <Link
                          href="/admin/work-centers"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                        >
                          <WrenchScrewdriverIcon className="h-4 w-4 mr-3 text-yellow-600" />
                          Work Center Management
                        </Link>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-400 transition-colors border-t border-gray-100 dark:border-slate-700"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3 text-red-600" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-lg dark:shadow-slate-900/50">
          <div className="px-4 pt-2 pb-4 space-y-1">
            <Link
              href="/dashboard"
              onClick={() => setShowMobileMenu(false)}
              className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${isActive('/dashboard') ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
            >
              <HomeIcon className="h-5 w-5 mr-3 text-yellow-600" />
              <span>Dashboard</span>
            </Link>

            <div>
              <button
                onClick={() => setShowTravelerMenu(!showTravelerMenu)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <div className="flex items-center">
                  <ClipboardDocumentListIcon className="h-5 w-5 mr-3 text-blue-600" />
                  <span>Travelers</span>
                </div>
                <ChevronDownIcon className={`h-5 w-5 transition-transform text-blue-600 ${showTravelerMenu ? 'rotate-180' : ''}`} />
              </button>
              {showTravelerMenu && (
                <div className="pl-4 mt-1 space-y-1">
                  <Link
                    href="/travelers"
                    onClick={() => { setShowMobileMenu(false); setShowTravelerMenu(false); }}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <QueueListIcon className="h-4 w-4 text-blue-600" />
                    <span>All Travelers</span>
                  </Link>
                  {user?.role !== 'OPERATOR' && (
                    <Link
                      href="/travelers/new"
                      onClick={() => { setShowMobileMenu(false); setShowTravelerMenu(false); }}
                      className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      <PlusCircleIcon className="h-4 w-4 text-green-600" />
                      <span>New Traveler</span>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {user?.role === 'ADMIN' && (
              <Link
                href="/jobs"
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${isActive('/jobs') ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
              >
                <BriefcaseIcon className="h-5 w-5 mr-3 text-orange-600" />
                <span>Jobs</span>
              </Link>
            )}

            <Link
              href="/labor-tracking"
              onClick={() => setShowMobileMenu(false)}
              className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${isActive('/labor-tracking') ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
            >
              <ClockIcon className="h-5 w-5 mr-3 text-green-600" />
              <span>Labor Tracking</span>
            </Link>

            {user?.role !== 'OPERATOR' && (
              <Link
                href="/reports"
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${isActive('/reports') ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
              >
                <ChartBarSquareIcon className="h-5 w-5 mr-3 text-purple-600" />
                <span>Reports</span>
              </Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link
                href="/analytics"
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${isActive('/analytics') ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
              >
                <ChartBarSquareIcon className="h-5 w-5 mr-3 text-indigo-600" />
                <span>Analytics</span>
              </Link>
            )}
            {canAccessMaintenance(user) && (
              <Link
                href="/maintenance"
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${isActive('/maintenance') ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
              >
                <WrenchScrewdriverIcon className="h-5 w-5 mr-3 text-orange-600" />
                <span>Maintenance</span>
              </Link>
            )}

            <div className="border-t border-gray-200 dark:border-slate-700 mt-4 pt-4">
              <Link
                href="/profile"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <UserIcon className="h-5 w-5 mr-3 text-blue-600" />
                Profile
              </Link>

              {user?.role === 'ADMIN' && (
                <>
                  <Link
                    href="/notifications"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <BellIcon className="h-5 w-5 mr-3 text-yellow-600" />
                    Notifications
                  </Link>
                  <Link
                    href="/users"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <UsersIcon className="h-5 w-5 mr-3 text-purple-600" />
                    User Management
                  </Link>
                  <Link
                    href="/admin/work-centers"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <WrenchScrewdriverIcon className="h-5 w-5 mr-3 text-yellow-600" />
                    Work Center Management
                  </Link>
                </>
              )}

              <button
                onClick={toggleTheme}
                className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 mt-2"
              >
                {theme === 'light' ? (
                  <MoonIcon className="h-5 w-5 mr-3 text-gray-600" />
                ) : (
                  <SunIcon className="h-5 w-5 mr-3 text-yellow-400" />
                )}
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </button>

              <button
                onClick={() => { setShowMobileMenu(false); logout(); }}
                className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 mt-2"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3 text-red-600" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
    </header>
  );
}